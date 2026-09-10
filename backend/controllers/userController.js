const User = require("../models/User");
const { getTenantId, getUserId, withTenant } = require("../utils/tenantScope");

const permissionKeys = [
  "musteriSilebilir",
  "tahsilatAlabilir",
  "satisYapabilir",
  "stokDuzenleyebilir",
  "envanterDuzenleyebilir",
  "zRaporuAlabilir",
  "excelExportEdebilir",
];

const pageLockKeys = [
  "stok",
  "envanter",
  "borclular",
  "personeller",
  "raporlar",
];

// Rol hiyerarşisi: bir rol yalnızca kendisiyle eşit veya altındaki rolleri yönetebilir
const ROLE_HIERARCHY = {
  admin: 4,
  yonetici: 3,
  kasiyer: 2,
  depo_sorumlusu: 2,
  personel: 1,
};

const canManageRole = (actorRole, targetRole) => {
  const actorLevel = ROLE_HIERARCHY[actorRole] ?? 0;
  const targetLevel = ROLE_HIERARCHY[targetRole] ?? 0;
  return actorLevel > targetLevel || actorRole === "admin";
};

const normalizeFlags = (value, keys) => {
  const normalized = Object.fromEntries(keys.map((key) => [key, false]));

  if (!value) {
    return normalized;
  }

  if (Array.isArray(value)) {
    value.forEach((key) => {
      if (keys.includes(key)) {
        normalized[key] = true;
      }
    });
    return normalized;
  }

  keys.forEach((key) => {
    normalized[key] = Boolean(value[key]);
  });

  return normalized;
};

const sanitizeUserResponse = (user) => {
  const rawUser = user.toObject ? user.toObject() : user;
  delete rawUser.password;
  return rawUser;
};

const normalizeEmail = (value = "") => value.trim().toLowerCase();

const listUsers = async (req, res) => {
  try {
    const users = await User.find(withTenant(req, { isDeleted: false }))
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({
      message: "Personeller alınırken bir hata oluştu",
      error: error.message,
    });
  }
};

const createUser = async (req, res) => {
  try {
    const {
      ad,
      soyad,
      email,
      password,
      role,
      permissions,
      pageLocks,
    } = req.body;

    const normalizedAd = (ad || "").trim();
    const normalizedSoyad = (soyad || "").trim();
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedAd || !normalizedSoyad || !normalizedEmail || !password) {
      return res.status(400).json({
        message: "Ad, soyad, e-posta ve şifre zorunludur",
      });
    }

    if (password.length < 5) {
      return res.status(400).json({
        message: "Şifre en az 5 karakter olmalıdır",
      });
    }

    const requestedRole = role || "personel";

    // Rol hiyerarşi koruması: yonetici, admin rolü oluşturamaz
    if (!canManageRole(req.user.role, requestedRole)) {
      return res.status(403).json({
        message: "Kendinizden üst bir rol atayamazsınız",
      });
    }

    const existingUser = await User.findOne(
      withTenant(req, { email: normalizedEmail, isDeleted: false }),
    );

    if (existingUser) {
      return res.status(400).json({
        message: "Bu e-posta ile kayıtlı bir personel zaten var",
      });
    }

    const user = await User.create({
      tenantId: getTenantId(req),
      createdBy: getUserId(req),
      ad: normalizedAd,
      soyad: normalizedSoyad,
      email: normalizedEmail,
      password,
      role: requestedRole,
      permissions: normalizeFlags(permissions, permissionKeys),
      pageLocks: normalizeFlags(pageLocks, pageLockKeys),
    });

    res.status(201).json(sanitizeUserResponse(user));
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: Object.values(error.errors)
          .map((item) => item.message)
          .join(", "),
      });
    }

    res.status(500).json({
      message: "Personel oluşturulurken bir hata oluştu",
      error: error.message,
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { ad, soyad, email, role, permissions, pageLocks } = req.body;
    const currentUserId = getUserId(req);

    // Kendi hesabını düzenleme koruması
    if (String(req.params.id) === String(currentUserId)) {
      return res.status(400).json({
        message: "Kendi hesabınızı bu panel üzerinden düzenleyemezsiniz",
      });
    }

    const user = await User.findOne(
      withTenant(req, { _id: req.params.id, isDeleted: false }),
    );

    if (!user) {
      return res.status(404).json({ message: "Personel bulunamadı" });
    }

    const normalizedAd = (ad || "").trim();
    const normalizedSoyad = (soyad || "").trim();
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedAd || !normalizedSoyad || !normalizedEmail) {
      return res.status(400).json({
        message: "Ad, soyad ve e-posta zorunludur",
      });
    }

    const emailOwner = await User.findOne(
      withTenant(req, {
        email: normalizedEmail,
        isDeleted: false,
        _id: { $ne: user._id },
      }),
    );

    if (emailOwner) {
      return res.status(400).json({
        message: "Bu e-posta başka bir personel tarafından kullanılıyor",
      });
    }

    const requestedRole = role || user.role;

    // Rol hiyerarşi koruması
    if (requestedRole !== user.role && !canManageRole(req.user.role, requestedRole)) {
      return res.status(403).json({
        message: "Bu role atama yapma yetkiniz yok",
      });
    }

    user.ad = normalizedAd;
    user.soyad = normalizedSoyad;
    user.email = normalizedEmail;
    user.role = requestedRole;
    user.permissions = normalizeFlags(permissions, permissionKeys);
    user.pageLocks = normalizeFlags(pageLocks, pageLockKeys);

    await user.save();

    res.status(200).json(sanitizeUserResponse(user));
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: Object.values(error.errors)
          .map((item) => item.message)
          .join(", "),
      });
    }

    res.status(500).json({
      message: "Personel güncellenirken bir hata oluştu",
      error: error.message,
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const currentUserId = getUserId(req);

    const user = await User.findOne(
      withTenant(req, { _id: req.params.id, isDeleted: false }),
    );

    if (!user) {
      return res.status(404).json({ message: "Personel bulunamadı" });
    }

    if (String(user._id) === String(currentUserId)) {
      return res.status(400).json({
        message: "Giriş yapan yönetici kendi hesabını silemez",
      });
    }

    // Son admin koruması
    if (user.role === "admin") {
      const adminCount = await User.countDocuments(
        withTenant(req, { role: "admin", isDeleted: false }),
      );

      if (adminCount <= 1) {
        return res.status(400).json({
          message: "Sistemde en az bir admin hesabı bulunmalıdır",
        });
      }
    }

    user.isDeleted = true;
    user.deletedBy = currentUserId;
    await user.save();

    res.status(200).json({ message: "Personel silindi" });
  } catch (error) {
    res.status(500).json({
      message: "Personel silinirken bir hata oluştu",
      error: error.message,
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const currentUserId = getUserId(req);

    if (!newPassword || newPassword.length < 5) {
      return res.status(400).json({
        message: "Yeni şifre en az 5 karakter olmalıdır",
      });
    }

    // Kendi şifresini bu yolla değiştiremez (ayrı profil endpoint'i kullanmalı)
    if (String(req.params.id) === String(currentUserId)) {
      return res.status(400).json({
        message: "Kendi şifrenizi bu panel üzerinden değiştiremezsiniz",
      });
    }

    const user = await User.findOne(
      withTenant(req, { _id: req.params.id, isDeleted: false }),
    );

    if (!user) {
      return res.status(404).json({ message: "Personel bulunamadı" });
    }

    user.password = newPassword; // bcrypt pre-save hook otomatik hash'ler
    await user.save();

    res.status(200).json({ message: "Şifre başarıyla güncellendi" });
  } catch (error) {
    res.status(500).json({
      message: "Şifre güncellenirken bir hata oluştu",
      error: error.message,
    });
  }
};

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
};
