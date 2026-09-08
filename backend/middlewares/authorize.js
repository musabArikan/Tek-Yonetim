const normalizeRequiredPermissions = (requiredPermissions, req) => {
  if (!requiredPermissions) return [];

  const resolvedPermissions =
    typeof requiredPermissions === "function"
      ? requiredPermissions(req)
      : requiredPermissions;

  if (!resolvedPermissions) return [];
  return Array.isArray(resolvedPermissions)
    ? resolvedPermissions.filter(Boolean)
    : [resolvedPermissions];
};

const authorize = (requiredPermissions) => (req, res, next) => {
  const permissions = req.user?.permissions || {};
  const normalizedPermissions = normalizeRequiredPermissions(
    requiredPermissions,
    req,
  );

  if (normalizedPermissions.length === 0) {
    return next();
  }

  const isAllowed = normalizedPermissions.every(
    (permissionKey) => permissions[permissionKey],
  );

  if (!isAllowed) {
    return res.status(403).json({
      message: "Bu işlem için yetkiniz yok",
    });
  }

  next();
};

const requireRole = (requiredRole) => (req, res, next) => {
  const allowedRoles = Array.isArray(requiredRole)
    ? requiredRole
    : [requiredRole];

  if (!allowedRoles.includes(req.user?.role)) {
    return res.status(403).json({
      message: "Bu işlem için rol yetkiniz yok",
    });
  }

  next();
};

module.exports = { authorize, requireRole };
