const bcrypt = require("bcrypt");
const User = require("../models/User");
const Tenant = require("../models/Tenant");
const { ROLES, PAGE_PASSWORD_KEYS } = require("../utils/constants");
const { str, lc, isObjectId } = require("../utils/helpers");
const {
  normalizeAllowedPages,
  allowedPagesToPageLocks,
  normalizePageLocks,
  normalizeFlags,
  allPermissions,
} = require("../utils/rbac");
const { sanitizeUser } = require("../utils/serializers");
const { isEmailTaken, generateEmailSuggestions } = require("../utils/emailSuggestions");
const { logAction } = require("../utils/auditLogger");

const resolveLockedDomain = async (tenantId) => {
  const tenant = await Tenant.findById(tenantId).select("email emailDomain name");
  if (!tenant) return "magaza.com";
  if (tenant.emailDomain) return lc(tenant.emailDomain).replace(/^@+/, "");
  if (tenant.email && tenant.email.includes("@")) {
    return lc(tenant.email.split("@")[1]);
  }
  return "magaza.com";
};

const enforceTenantEmailDomain = (rawEmail, emailPrefix, lockedDomain) => {
  const candidate = str(emailPrefix || rawEmail);
  const localPart = lc(candidate.split("@")[0]).replace(/[^a-z0-9._-]/g, "");
  if (!localPart) return "";
  return `${localPart}@${lockedDomain}`;
};

// GET /api/users
const getUsers = async (req, res) => {
  try {
    const users = await User.find({
      tenantId: req.user.tenantId,
      isDeleted: false,
    }).sort({ isStoreOwner: -1, createdAt: 1 });
    return res.json(users.map(sanitizeUser));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/users
const createUser = async (req, res) => {
  try {
    const ad = str(req.body?.ad);
    const soyad = str(req.body?.soyad);
    const password = String(req.body?.password || "");
    const role = ROLES.includes(req.body?.role) ? req.body.role : "staff";

    if (!ad || !soyad || !password) {
      return res.status(400).json({ message: "Ad, soyad ve şifre zorunludur." });
    }
    if (password.trim().length < 4) {
      return res.status(400).json({ message: "Şifre en az 4 karakter olmalıdır." });
    }

    const lockedDomain = await resolveLockedDomain(req.user.tenantId);
    const email = enforceTenantEmailDomain(req.body?.email, req.body?.emailPrefix, lockedDomain);
    if (!email) {
      return res.status(400).json({ message: "Geçerli bir personel e-posta kullanıcı adı giriniz." });
    }

    if (await isEmailTaken(email)) {
      const suggestions = await generateEmailSuggestions({
        email,
        ownerName: `${ad} ${soyad}`,
      });
      return res.status(409).json({
        code: "EMAIL_TAKEN",
        message: `"${email}" e-posta adresi zaten kullanılıyor.`,
        suggestions,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const isAdmin = role === "admin";
    const allowedPages = normalizeAllowedPages(
      req.body?.allowedPages,
      req.body?.pageLocks,
      role,
      false,
    );
    const pageLocks = req.body?.allowedPages
      ? allowedPagesToPageLocks(allowedPages)
      : normalizePageLocks(req.body?.pageLocks, allowedPages);
    const permissions = isAdmin
      ? allPermissions(true)
      : normalizeFlags(req.body?.permissions, allPermissions(false));

    const pagePasswords = { userManagement: "", reports: "", myStore: "" };
    if (req.body?.pagePassword && String(req.body.pagePassword).trim().length >= 4) {
      const scope = PAGE_PASSWORD_KEYS.includes(req.body.pagePasswordScope)
        ? req.body.pagePasswordScope
        : "userManagement";
      pagePasswords[scope] = await bcrypt.hash(String(req.body.pagePassword).trim(), 10);
    }

    const created = await User.create({
      tenantId: req.user.tenantId,
      ad,
      soyad,
      email,
      password: hashedPassword,
      role,
      isStoreOwner: false,
      permissions,
      allowedPages,
      pageLocks,
      pagePasswords,
      isDeleted: false,
    });

    logAction(req.user, "KULLANICI_OLUSTUR", "User", created._id, {
      ad: created.ad,
      soyad: created.soyad,
      email: created.email,
      role: created.role,
    });

    return res.status(201).json(sanitizeUser(created));
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        code: "EMAIL_TAKEN",
        message: "Bu e-posta adresi zaten başka bir kullanıcı tarafından kullanılıyor.",
      });
    }
    return res.status(500).json({ message: error.message });
  }
};

// PUT /api/users/:id
const updateUser = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ message: "Geçersiz kullanıcı kimliği." });
    }

    const target = await User.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
      isDeleted: false,
    });
    if (!target) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    if (req.body?.ad !== undefined) {
      const nextAd = str(req.body.ad);
      if (!nextAd) return res.status(400).json({ message: "Ad boş olamaz." });
      target.ad = nextAd;
    }

    if (req.body?.soyad !== undefined) {
      const nextSoyad = str(req.body.soyad);
      if (!nextSoyad) return res.status(400).json({ message: "Soyad boş olamaz." });
      target.soyad = nextSoyad;
    }

    // Kurucu hesabın e-postası kilitlidir; personellerde mağaza domaini kilitlidir
    if (!target.isStoreOwner && (req.body?.email !== undefined || req.body?.emailPrefix !== undefined)) {
      const lockedDomain = await resolveLockedDomain(req.user.tenantId);
      const nextEmail = enforceTenantEmailDomain(
        req.body?.email,
        req.body?.emailPrefix,
        lockedDomain,
      );
      if (!nextEmail) {
        return res.status(400).json({ message: "Geçerli bir e-posta kullanıcı adı giriniz." });
      }
      if (nextEmail !== target.email) {
        if (await isEmailTaken(nextEmail, target._id)) {
          const suggestions = await generateEmailSuggestions({
            email: nextEmail,
            ownerName: `${target.ad} ${target.soyad}`,
            excludeUserId: target._id,
          });
          return res.status(409).json({
            code: "EMAIL_TAKEN",
            message: `"${nextEmail}" e-posta adresi zaten kullanılıyor.`,
            suggestions,
          });
        }
        target.email = nextEmail;
      }
    }

    if (req.body?.role !== undefined && !target.isStoreOwner) {
      if (!ROLES.includes(req.body.role)) {
        return res.status(400).json({ message: "Geçersiz rol." });
      }
      if (String(target._id) === String(req.user.userId) && req.body.role !== "admin") {
        return res.status(400).json({ message: "Kendi yönetici rolünüzü düşüremezsiniz." });
      }
      target.role = req.body.role;
    }

    const isOwnerOrAdmin = Boolean(target.isStoreOwner || target.role === "admin");
    if (req.body?.allowedPages !== undefined || req.body?.pageLocks !== undefined) {
      const nextAllowed = normalizeAllowedPages(
        req.body?.allowedPages ?? target.allowedPages,
        req.body?.pageLocks ?? target.pageLocks,
        target.role,
        target.isStoreOwner,
      );
      target.allowedPages = nextAllowed;
      target.markModified("allowedPages");
      target.pageLocks = req.body?.allowedPages
        ? allowedPagesToPageLocks(nextAllowed)
        : normalizePageLocks(req.body?.pageLocks, nextAllowed);
      target.markModified("pageLocks");
    }

    if (req.body?.permissions !== undefined) {
      target.permissions = isOwnerOrAdmin
        ? allPermissions(true)
        : normalizeFlags(req.body.permissions, target.permissions);
      target.markModified("permissions");
    }

    if (req.body?.password !== undefined && String(req.body.password).trim() !== "") {
      if (String(req.body.password).trim().length < 4) {
        return res.status(400).json({ message: "Şifre en az 4 karakter olmalıdır." });
      }
      target.password = await bcrypt.hash(String(req.body.password), 10);
    }

    if (req.body?.pagePassword !== undefined) {
      const scope = PAGE_PASSWORD_KEYS.includes(req.body.pagePasswordScope)
        ? req.body.pagePasswordScope
        : "userManagement";
      const raw = String(req.body.pagePassword || "").trim();
      if (!target.pagePasswords || typeof target.pagePasswords !== "object") {
        target.pagePasswords = { userManagement: "", reports: "", myStore: "" };
      }
      target.pagePasswords[scope] = raw ? await bcrypt.hash(raw, 10) : "";
      target.markModified("pagePasswords");
    }

    await target.save();

    logAction(req.user, "KULLANICI_GUNCELLE", "User", target._id, {
      ad: target.ad,
      soyad: target.soyad,
      email: target.email,
      role: target.role,
    });

    return res.json(sanitizeUser(target));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PATCH /api/users/:id/password
const updateUserPassword = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ message: "Geçersiz kullanıcı kimliği." });
    }
    const password = String(req.body?.password || "");
    if (password.trim().length < 4) {
      return res.status(400).json({ message: "Şifre en az 4 karakter olmalıdır." });
    }

    const target = await User.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
      isDeleted: false,
    });
    if (!target) return res.status(404).json({ message: "Kullanıcı bulunamadı." });

    target.password = await bcrypt.hash(password, 10);
    await target.save();

    logAction(req.user, "KULLANICI_SIFRE_GUNCELLE", "User", target._id, { email: target.email });
    return res.json({ message: "Şifre güncellendi.", user: sanitizeUser(target) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PATCH /api/users/:id/page-password
const updateUserPagePassword = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ message: "Geçersiz kullanıcı kimliği." });
    }
    const scope = str(req.body?.scope || "userManagement");
    const password = String(req.body?.password || "");
    const clear = Boolean(req.body?.clear);

    if (!PAGE_PASSWORD_KEYS.includes(scope)) {
      return res.status(400).json({ message: "Geçersiz sayfa şifre kapsamı." });
    }
    if (!clear && password.trim().length < 4) {
      return res.status(400).json({ message: "Sayfa şifresi en az 4 karakter olmalıdır." });
    }

    const target = await User.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
      isDeleted: false,
    });
    if (!target) return res.status(404).json({ message: "Kullanıcı bulunamadı." });

    if (!target.pagePasswords || typeof target.pagePasswords !== "object") {
      target.pagePasswords = { userManagement: "", reports: "", myStore: "" };
    }
    target.pagePasswords[scope] = clear ? "" : await bcrypt.hash(password, 10);
    target.markModified("pagePasswords");
    await target.save();

    logAction(req.user, "SAYFA_SIFRESI_GUNCELLE", "User", target._id, { scope, cleared: clear });
    return res.json({ message: "Sayfa şifresi güncellendi.", user: sanitizeUser(target) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// DELETE /api/users/:id
const deleteUser = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ message: "Geçersiz kullanıcı kimliği." });
    }
    if (String(req.params.id) === String(req.user.userId)) {
      return res.status(400).json({ message: "Kendi hesabınızı silemezsiniz." });
    }

    const target = await User.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
      isDeleted: false,
    });
    if (!target) return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    if (target.isStoreOwner) {
      return res.status(400).json({ message: "Mağaza kurucu hesabı silinemez." });
    }

    target.isDeleted = true;
    await target.save();

    logAction(req.user, "KULLANICI_SIL", "User", target._id, {
      ad: target.ad,
      soyad: target.soyad,
      email: target.email,
    });
    return res.json({ message: "Personel silindi.", id: String(target._id) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  updateUserPassword,
  updateUserPagePassword,
  deleteUser,
};
