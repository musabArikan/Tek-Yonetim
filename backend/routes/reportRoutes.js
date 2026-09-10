const express = require("express");
const { getZRaporu, sendReminder } = require("../controllers/reportController");
const { requireAuth } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/z-raporu", requireAuth, getZRaporu);
router.post("/send-reminder", requireAuth, sendReminder);

module.exports = router;
