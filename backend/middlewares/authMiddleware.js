const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Tenant = require("../models/Tenant");

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Not authorized, no token provided" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ message: "Not authorized, no token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.userId || !decoded.tenantId) {
      return res.status(401).json({ message: "Not authorized, invalid token" });
    }

    const user = await User.findOne({
      _id: decoded.userId,
      isDeleted: false,
    }).select("-password");
    if (!user || String(user.tenantId) !== String(decoded.tenantId)) {
      return res
        .status(401)
        .json({ message: "Not authorized, user not found" });
    }

    const tenant = await Tenant.findById(decoded.tenantId);
    if (!tenant || !tenant.isActive) {
      return res.status(403).json({ message: "İşletme hesabı aktif değil" });
    }

    req.user = {
      tenantId: String(user.tenantId),
      userId: String(user._id),
      ad: user.ad,
      soyad: user.soyad,
      role: user.role,
      permissions: user.permissions || {},
      pageLocks: user.pageLocks || {},
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Not authorized, token expired" });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Not authorized, invalid token" });
    }

    return res
      .status(500)
      .json({ message: "Server error during authentication" });
  }
};

module.exports = { requireAuth, protect: requireAuth };
