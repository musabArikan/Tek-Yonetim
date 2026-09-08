const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middlewares/authMiddleware");
const { getDashboardSummary } = require("../controllers/dashboardController");

// GET /api/dashboard/summary
// Kimlik doğrulaması zorunlu; tenantId middleware'den otomatik alınır
router.get("/summary", requireAuth, getDashboardSummary);

module.exports = router;
