const express = require("express");
const {
  exportProducts,
  exportCustomers,
  exportDebtors,
  exportActionLogs,
  importProducts,
} = require("../controllers/exportController");
const { requireAuth } = require("../middlewares/authMiddleware");

const router = express.Router();

// Export rotaları
router.get("/products", requireAuth, exportProducts);
router.get("/customers", requireAuth, exportCustomers);
router.get("/debtors", requireAuth, exportDebtors);
router.get("/actionlogs", requireAuth, exportActionLogs);

// Import rotaları
router.post("/import/products", requireAuth, ...importProducts);

module.exports = router;
