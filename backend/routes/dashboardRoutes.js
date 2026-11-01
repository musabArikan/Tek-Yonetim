const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { getDashboardSummary } = require("../controllers/dashboardController");

router.use(authMiddleware);

router.get("/", getDashboardSummary);
router.get("/summary", getDashboardSummary);

module.exports = router;
