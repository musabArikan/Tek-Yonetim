const bcrypt = require("bcrypt");
const Tenant = require("../models/Tenant");
const User = require("../models/User");
const { PAGE_PASSWORD_KEYS } = require("../utils/constants");
const { str, lc } = require("../utils/helpers");
const {
  ALL_PAGES_ALLOWED,
  allowedPagesToPageLocks,
  allPermissions,
} = require("../utils/rbac");
const { buildSession } = require("../utils/serializers");
const { isEmailTaken, generateEmailSuggestions } = require("../utils/emailSuggestions");
const { logAction } = require("../utils/auditLogger");

const INVALID_LOGIN_MESSAGE = "Böyle bir hesap bulunamadı veya şifreniz hatalı.";

const splitOwnerName = (ownerName = "") => {
  const parts = str(ownerName).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { ad: "Mağaza", soyad: "Yetkilisi" };
  if (parts.length === 1) return { ad: parts[0], soyad: "Yetkili" };
  return { ad: parts[0], soyad: parts.slice(1).join(" ") };
};

// POST /api/auth/register & POST /api/auth/register-store
const registerStore = async (req, res) => {
  try {
    const storeName = str(req.body?.storeName || req.body?.name || req.body?.magazaAdi);
    const ownerName = str(
      req.body?.ownerName ||
        req.body?.adSoyad ||
        req.body?.fullName ||
        `${str(req.body?.ad)} ${str(req.body?.soyad)}`,
    );
    const email = lc(req.body?.email);
    const phone = str(req.body?.phone || req.body?.telefon);
    const address = str(req.body?.address || req.body?.adres);
    const password = String(req.body?.password || "");

    if (!storeName || !ownerName || !email || !password) {
      return res.status(400).json({
        message: "Mağaza adı, yetkili adı soyadı, e-posta ve şifre zorunludur.",
      });
    }

    if (!email.includes("@") || email.startsWith("@") || email.endsWith("@")) {
      return res.status(400).json({ message: "Geçerli bir e-posta adresi giriniz." });
    }

    if (password.trim().length < 4) {
      return res.status(400).json({ message: "Şifre en az 4 karakter olmalıdır." });
    }

    if (await isEmailTaken(email)) {
      const suggestions = await generateEmailSuggestions({ email, storeName, ownerName });
      return res.status(409).json({
        code: "EMAIL_TAKEN",
        message: `"${email}" adresi zaten başka bir mağaza veya personel tarafından kullanılıyor.`,
        suggestions,
      });
    }

    const emailDomain = email.split("@")[1] || "tekyonetim.com";
    const { ad, soyad } = splitOwnerName(ownerName);
    const hashedPassword = await bcrypt.hash(password, 10);

    const tenant = await Tenant.create({
      name: storeName,
      ownerName,
      email,
      emailDomain,
      phone,
      address,
      customBrands: [],
      customCategories: [],
      customPaymentMethods: [],
      isActive: true,
    });

    let user;
    try {
      user = await User.create({
        tenantId: tenant._id,
        ad,
        soyad,
        email,
        password: hashedPassword,
        role: "admin",
        isStoreOwner: true,
        permissions: allPermissions(true),
        allowedPages: { ...ALL_PAGES_ALLOWED },
        pageLocks: allowedPagesToPageLocks(ALL_PAGES_ALLOWED),
        pagePasswords: { userManagement: "", reports: "", myStore: "" },
        isDeleted: false,
      });
    } catch (userError) {
      await Tenant.deleteOne({ _id: tenant._id });
      throw userError;
    }

    const session = buildSession(user, tenant);
    logAction(
      { userId: user._id, tenantId: tenant._id },
      "MAGAZA_KAYIT",
      "Tenant",
      tenant._id,
      { storeName: tenant.name, ownerName: tenant.ownerName, email },
    );

    return res.status(201).json({
      message: "Yeni mağaza hesabınız başarıyla oluşturuldu",
      ...session,
    });
  } catch (error) {
    if (error?.code === 11000) {
      const email = lc(req.body?.email);
      const suggestions = await generateEmailSuggestions({
        email,
        storeName: req.body?.storeName,
        ownerName: req.body?.ownerName,
      });
      return res.status(409).json({
        code: "EMAIL_TAKEN",
        message: `"${email}" adresi zaten başka bir mağaza veya personel tarafından kullanılıyor.`,
        suggestions,
      });
    }
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/check-email
const checkEmail = async (req, res) => {
  try {
    const email = lc(req.body?.email || req.query?.email);
    const storeName = str(req.body?.storeName || req.query?.storeName);
    const ownerName = str(req.body?.ownerName || req.query?.ownerName);

    if (!email || !email.includes("@")) {
      return res.json({
        available: false,
        message: "Geçerli bir e-posta adresi giriniz.",
        suggestions: [],
      });
    }

    const taken = await isEmailTaken(email);
    if (!taken) {
      return res.json({ available: true, message: "E-posta adresi kullanılabilir.", suggestions: [] });
    }

    const suggestions = await generateEmailSuggestions({ email, storeName, ownerName });
    return res.json({
      available: false,
      message: `"${email}" adresi zaten kullanılıyor.`,
      suggestions,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const normalizedEmail = lc(req.body?.email);
    const password = String(req.body?.password || "");

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: "E-posta ve şifre zorunludur." });
    }

    const user = await User.findOne({ email: normalizedEmail, isDeleted: false });
    if (!user) {
      return res.status(401).json({ message: INVALID_LOGIN_MESSAGE });
    }

    const isMatch = await bcrypt.compare(password, String(user.password || ""));
    if (!isMatch) {
      return res.status(401).json({ message: INVALID_LOGIN_MESSAGE });
    }

    const tenant = await Tenant.findById(user.tenantId);
    if (!tenant || tenant.isActive === false) {
      return res.status(403).json({ message: "Mağaza hesabı aktif değil." });
    }

    const session = buildSession(user, tenant);
    logAction(
      { userId: user._id, tenantId: user.tenantId },
      "OTURUM_AC",
      "User",
      user._id,
      { email: user.email, role: user.role },
    );

    return res.json(session);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/re-auth
const reAuthenticate = async (req, res) => {
  try {
    const scope = str(req.body?.scope || "userManagement");
    const password = String(req.body?.password || "");

    if (!PAGE_PASSWORD_KEYS.includes(scope)) {
      return res.status(400).json({ message: "Invalid re-auth scope" });
    }
    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    const user = await User.findOne({
      _id: req.user.userId,
      tenantId: req.user.tenantId,
      isDeleted: false,
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    const hash = str(user.pagePasswords?.[scope]);
    let matched = false;
    if (hash) {
      matched = await bcrypt.compare(password, hash);
    } else if (user.password) {
      matched = await bcrypt.compare(password, user.password);
    }

    if (!matched) {
      return res.status(401).json({ message: "Giriş şifresi hatalı" });
    }

    logAction(req.user, "SAYFA_SIFRE_DOGRULA", "User", user._id, { scope });
    return res.json({
      verified: true,
      scope,
      verifiedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/auth/me
const me = async (req, res) => {
  try {
    const [user, tenant] = await Promise.all([
      User.findOne({ _id: req.user.userId, tenantId: req.user.tenantId, isDeleted: false }),
      Tenant.findById(req.user.tenantId),
    ]);
    if (!user || !tenant) {
      return res.status(401).json({ message: "Oturum geçersiz." });
    }
    return res.json(buildSession(user, tenant));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  register: registerStore,
  registerStore,
  checkEmail,
  login,
  reAuthenticate,
  me,
};
