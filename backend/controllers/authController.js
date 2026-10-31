const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Tenant = require("../models/Tenant");

const TOKEN_EXPIRES_IN = "30d";

const normalizeEmail = (value = "") => String(value).trim().toLowerCase();

const slugifyTr = (value = "") =>
  String(value)
    .toLowerCase()
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ı", "i")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, "")
    .trim();

const generateEmailSuggestions = async (email, hintText = "") => {
  const normalized = normalizeEmail(email);
  const [rawLocal = "kullanici", rawDomain = "tekyonetim.com"] = normalized.split("@");
  const cleanLocal =
    rawLocal
      .replaceAll("ğ", "g")
      .replaceAll("ü", "u")
      .replaceAll("ş", "s")
      .replaceAll("ı", "i")
      .replaceAll("ö", "o")
      .replaceAll("ç", "c")
      .replace(/[^a-z0-9._-]/g, "")
      .replace(/^[._-]+|[._-]+$/g, "") || "magaza";
  const baseLocal = cleanLocal.replace(/\d+$/, "") || cleanLocal;
  const domain = rawDomain.trim() || "tekyonetim.com";
  const hintSlug = slugifyTr(hintText).slice(0, 12);

  const candidates = [
    `${baseLocal}2@${domain}`,
    `${baseLocal}.magaza@${domain}`,
    `${baseLocal}34@${domain}`,
    ...(hintSlug && !baseLocal.includes(hintSlug)
      ? [`${baseLocal}.${hintSlug}@${domain}`]
      : []),
    `${baseLocal}3@${domain}`,
    `${baseLocal}.ticaret@${domain}`,
    `${baseLocal}06@${domain}`,
    `${baseLocal}2026@${domain}`,
  ];

  const uniqueCandidates = [...new Set(candidates)].filter((c) => c !== normalized);

  try {
    const existingUsers = await User.find({
      email: { $in: uniqueCandidates },
      isDeleted: false,
    }).select("email");
    const takenSet = new Set(existingUsers.map((u) => normalizeEmail(u.email)));
    return uniqueCandidates.filter((c) => !takenSet.has(c)).slice(0, 4);
  } catch {
    return uniqueCandidates.slice(0, 4);
  }
};

const generateToken = (user) => {
  return jwt.sign(
    {
      tenantId: user.tenantId,
      userId: user._id,
      role: user.role,
      permissions: user.permissions,
      pageLocks: user.pageLocks,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: TOKEN_EXPIRES_IN,
    },
  );
};

const loginUser = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email || req.body.username);
    const { password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "E-posta ve şifre zorunludur" });
    }

    const user = await User.findOne({ email, isDeleted: false });
    if (!user) {
      return res.status(401).json({ message: "E-posta veya şifre hatalı" });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "E-posta veya şifre hatalı" });
    }

    const tenant = await Tenant.findById(user.tenantId);
    if (!tenant || !tenant.isActive) {
      return res.status(403).json({ message: "İşletme hesabı aktif değil" });
    }

    const token = generateToken(user);

    const hasPagePasswords = {
      finans: !!user.pagePasswords?.finans,
      stok: !!user.pagePasswords?.stok,
      raporlar: !!user.pagePasswords?.raporlar,
      envanter: !!user.pagePasswords?.envanter,
      transferler: !!user.pagePasswords?.transferler,
    };

    res.status(200).json({
      token,
      userId: user._id,
      ad: user.ad,
      soyad: user.soyad,
      tenantId: user.tenantId,
      storeName: tenant.name,
      storeOwner: tenant.ownerName || `${user.ad} ${user.soyad}`.trim(),
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      pageLocks: user.pageLocks,
      hasPagePasswords,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error during login",
      error: error.message,
    });
  }
};

const registerStore = async (req, res) => {
  try {
    const storeName = String(req.body.storeName || req.body.magazaAdi || "").trim();
    const ownerName = String(req.body.ownerName || req.body.yetkiliAdSoyad || "").trim();
    const email = normalizeEmail(req.body.email);
    const phone = String(req.body.phone || req.body.telefon || "").trim();
    const address = String(req.body.address || req.body.adres || "").trim();
    const { password } = req.body;

    if (!storeName || !ownerName || !email || !password) {
      return res.status(400).json({
        message: "Mağaza adı, yetkili ad soyad, e-posta ve şifre zorunludur.",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        message: "Geçerli bir e-posta adresi giriniz.",
      });
    }

    if (String(password).length < 5) {
      return res.status(400).json({
        message: "Şifre en az 5 karakter olmalıdır.",
      });
    }

    // E-posta tekillik kontrolü (Mağaza adında tekillik kısıtlaması YOKTUR)
    const existingUser = await User.findOne({ email, isDeleted: false });
    if (existingUser) {
      const suggestions = await generateEmailSuggestions(email, storeName);
      return res.status(409).json({
        message: "Bu e-posta adresi başka bir mağaza/kullanıcı tarafından kullanılmaktadır.",
        suggestions,
      });
    }

    const nameParts = ownerName.split(/\s+/).filter(Boolean);
    const ad =
      nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : nameParts[0] || "Mağaza";
    const soyad = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "Yetkilisi";

    const tenant = await Tenant.create({
      name: storeName,
      ownerName: `${ad} ${soyad}`.trim(),
      email,
      phone,
      address,
      isActive: true,
    });

    const user = await User.create({
      tenantId: tenant._id,
      ad,
      soyad,
      email,
      password,
      role: "admin",
      permissions: {
        musteriSilebilir: true,
        tahsilatAlabilir: true,
        satisYapabilir: true,
        stokDuzenleyebilir: true,
        envanterDuzenleyebilir: true,
        zRaporuAlabilir: true,
        excelExportEdebilir: true,
      },
      pageLocks: {
        stok: false,
        envanter: false,
        borclular: false,
        personeller: false,
        raporlar: false,
      },
    });

    const token = generateToken(user);

    res.status(201).json({
      token,
      userId: user._id,
      ad: user.ad,
      soyad: user.soyad,
      tenantId: tenant._id,
      storeName: tenant.name,
      storeOwner: tenant.ownerName,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      pageLocks: user.pageLocks,
      hasPagePasswords: {
        finans: false,
        stok: false,
        raporlar: false,
        envanter: false,
        transferler: false,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Mağaza oluşturulurken sunucu hatası oluştu.",
      error: error.message,
    });
  }
};

module.exports = { loginUser, registerStore, generateEmailSuggestions };
