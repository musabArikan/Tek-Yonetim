const express = require("express");
const {
  getStocks,
  addOrUpdateStock,
  updateStockQuantity,
} = require("../controllers/stockController");
const { requireAuth } = require("../middlewares/authMiddleware");

const router = express.Router();

router.route("/").get(requireAuth, getStocks).post(requireAuth, addOrUpdateStock);
router.put("/:id", requireAuth, updateStockQuantity);

module.exports = router;
