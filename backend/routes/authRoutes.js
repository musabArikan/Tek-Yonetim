const express = require("express");
const { loginUser } = require("../controllers/authController");
const { reAuth } = require("../controllers/reAuthController");
const { requireAuth } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/login", loginUser);
router.post("/re-auth", requireAuth, reAuth);

module.exports = router;
