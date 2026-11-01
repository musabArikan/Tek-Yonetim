const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const {
  getPendingInventory,
  deliverInventoryItem,
} = require("../controllers/inventoryController");

router.use(authMiddleware);

router.get("/", getPendingInventory);
router.get("/pending", getPendingInventory);
router.post("/deliver", deliverInventoryItem);

module.exports = router;
