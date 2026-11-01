const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Tenant = require("../models/Tenant");
const { resolveAllowedPages } = require("../utils/serializers");

const fail = (res, status, message) => res.status(status).json({ message });

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return fail(res, 401, "Oturum bulunamadı, lütfen giriş yapın.");
    }

    const token = authHeader.split(" ")[1];
    if (!token) return fail(res, 401, "Oturum bulunamadı, lütfen giriş yapın.");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.userId || !decoded.tenantId) {
      return fail(res, 401, "Geçersiz oturum, lütfen tekrar giriş yapın.");
    }

    const user = await User.findOne({ _id: decoded.userId, isDeleted: false }).select("-password");
    if (!user || String(user.tenantId) !== String(decoded.tenantId)) {
      return fail(res, 401, "Kullanıcı bulunamadı, lütfen tekrar giriş yapın.");
    }

    const tenant = await Tenant.findById(user.tenantId);
    if (!tenant || !tenant.isActive) {
      return fail(res, 403, "İşletme hesabı aktif değil");
    }

    const permissions = user.permissions?.toObject ? user.permissions.toObject() : user.permissions;
    req.user = {
      tenantId: String(user.tenantId),
      userId: String(user._id),
      ad: user.ad,
      soyad: user.soyad,
      email: user.email,
      role: user.role,
      isStoreOwner: Boolean(user.isStoreOwner),
      permissions: permissions || {},
      allowedPages: resolveAllowedPages(user),
    };
    req.userDoc = user;
    req.tenantDoc = tenant;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return fail(res, 401, "Oturum süresi doldu, lütfen tekrar giriş yapın.");
    }
    if (error.name === "JsonWebTokenError") {
      return fail(res, 401, "Geçersiz oturum, lütfen tekrar giriş yapın.");
    }
    return fail(res, 500, "Kimlik doğrulama sırasında sunucu hatası oluştu.");
  }
};

requireAuth.requireAuth = requireAuth;
requireAuth.protect = requireAuth;

module.exports = requireAuth;
