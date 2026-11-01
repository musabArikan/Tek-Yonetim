const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { authorizePage } = require("../middlewares/authorize");
const {
  getDailyReport,
  getMonthlyReport,
  sendReminder,
  getExportRows,
} = require("../controllers/reportController");

router.use(authMiddleware);
router.use(authorizePage("reports"));

router.get("/daily", getDailyReport);
router.get("/z-raporu", getDailyReport);
router.get("/monthly", getMonthlyReport);
router.post("/reminder", sendReminder);
router.get("/export-rows", getExportRows);
router.get("/export/:type", getExportRows);

module.exports = router;
