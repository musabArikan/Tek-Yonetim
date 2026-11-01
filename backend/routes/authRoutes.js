const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const {
  register,
  registerStore,
  checkEmail,
  login,
  reAuthenticate,
  me,
} = require("../controllers/authController");

router.post("/register", register);
router.post("/register-store", registerStore);
router.post("/check-email", checkEmail);
router.post("/login", login);
router.post("/re-auth", authMiddleware, reAuthenticate);
router.get("/me", authMiddleware, me);

module.exports = router;
