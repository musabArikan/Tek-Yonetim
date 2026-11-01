const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const {
  getStocks,
  addOrUpdateStock,
  updateStockQuantity,
} = require("../controllers/stockController");

router.use(authMiddleware);

router.get("/", getStocks);
router.post("/", addOrUpdateStock);
router.put("/:id", updateStockQuantity);
router.patch("/:id/quantity", updateStockQuantity);

module.exports = router;
