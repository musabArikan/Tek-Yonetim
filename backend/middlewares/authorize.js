const PAGE_ALIASES = {
  myStore: ["magazam", "myStore"],
  magazam: ["magazam", "myStore"],
  reports: ["raporlar", "reports"],
  raporlar: ["raporlar", "reports"],
  userManagement: ["personeller", "userManagement"],
  personeller: ["personeller", "userManagement"],
};

const forbid = (res, message) => res.status(403).json({ message });

const requirePermission = (...keys) => (req, res, next) => {
  if (req.user?.role === "admin" || req.user?.isStoreOwner) return next();
  const permissions = req.user?.permissions || {};
  if (keys.every((key) => permissions[key])) return next();
  return forbid(res, "Bu işlem için yetkiniz yok");
};

const requirePage = (...pages) => (req, res, next) => {
  if (req.user?.role === "admin" || req.user?.isStoreOwner) return next();
  const allowed = req.user?.allowedPages || {};
  const expanded = pages.flatMap((p) => PAGE_ALIASES[p] || [p]);
  if (expanded.some((page) => allowed[page])) return next();
  return forbid(res, "Yetkisiz Erişim: Bu sayfayı görüntüleme yetkiniz yok.");
};

const requireRole = (...requiredRoles) => (req, res, next) => {
  if (req.user?.role === "admin" || req.user?.isStoreOwner) return next();
  const roles = requiredRoles.flat();
  if (roles.includes(req.user?.role)) return next();
  return forbid(res, "Bu işlem için rol yetkiniz yok");
};

module.exports = {
  requirePermission,
  requirePage,
  requireRole,
  authorize: requirePermission,
  authorizePage: requirePage,
  authorizeRole: requireRole,
};
