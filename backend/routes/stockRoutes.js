const express = require("express");
const {
  getStocks,
  addOrUpdateStock,
  updateStockQuantity,
} = require("../controllers/stockController");
const { requireAuth } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/authorize");

const router = express.Router();

router
  .route("/")
  .get(requireAuth, getStocks)
  .post(requireAuth, authorize("stokDuzenleyebilir"), addOrUpdateStock);
router.put("/:id", requireAuth, authorize("stokDuzenleyebilir"), updateStockQuantity);

module.exports = router;
