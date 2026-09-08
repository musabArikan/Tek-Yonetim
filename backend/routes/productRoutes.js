const express = require("express");
const {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  addStockMovement,
  getStockHistory,
  cancelStockMovement,
} = require("../controllers/productController");
const { requireAuth } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/authorize");

const router = express.Router();

// Tüm route'lar requireAuth ile korunuyor
router
  .route("/")
  .get(requireAuth, getProducts)
  .post(requireAuth, authorize("stokDuzenleyebilir"), createProduct);

router
  .route("/:id")
  .put(requireAuth, authorize("stokDuzenleyebilir"), updateProduct)
  .delete(requireAuth, authorize("stokDuzenleyebilir"), deleteProduct);

// Stok Hareketleri
router
  .route("/:id/movements")
  .get(requireAuth, getStockHistory);

// Genel hareket listesi (tüm ürünler)
router
  .route("/movements/list")
  .get(requireAuth, getStockHistory);

// Stok hareketi ekle
router
  .route("/movements/add")
  .post(requireAuth, authorize("stokDuzenleyebilir"), addStockMovement);

// Stok hareketi iptal et (undo - soft-delete)
router
  .route("/movements/:id/cancel")
  .patch(requireAuth, authorize("stokDuzenleyebilir"), cancelStockMovement);

module.exports = router;
