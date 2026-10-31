const express = require("express");
const { loginUser, registerStore } = require("../controllers/authController");
const { reAuth } = require("../controllers/reAuthController");
const { requireAuth } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/login", loginUser);
router.post("/register", registerStore);
router.post("/register-store", registerStore);
router.post("/re-auth", requireAuth, reAuth);

module.exports = router;
