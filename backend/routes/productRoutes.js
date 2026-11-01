const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const {
  getProducts,
  getBrands,
  addBrand,
  getCategories,
  addCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  getMovements,
  addMovement,
  cancelMovement,
} = require("../controllers/productController");

router.use(authMiddleware);

router.get("/brands", getBrands);
router.post("/brands", addBrand);
router.get("/categories", getCategories);
router.post("/categories", addCategory);
router.get("/movements", getMovements);
router.post("/movements", addMovement);
router.post("/movements/:id/cancel", cancelMovement);
router.patch("/movements/:id/cancel", cancelMovement);
router.delete("/movements/:id", cancelMovement);

router.get("/", getProducts);
router.post("/", createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

module.exports = router;
