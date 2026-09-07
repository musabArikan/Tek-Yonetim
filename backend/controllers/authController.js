const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Tenant = require("../models/Tenant");

const TOKEN_EXPIRES_IN = "30d";

const normalizeEmail = (value = "") => value.trim().toLowerCase();

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

    const user = await User.findOne({ email });
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

    res.status(200).json({
      token,
      userId: user._id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      pageLocks: user.pageLocks,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error during login",
      error: error.message,
    });
  }
};

module.exports = { loginUser };
