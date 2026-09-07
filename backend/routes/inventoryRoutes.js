const express = require("express");
const {
  getPendingInventory,
  deliverInventoryItem,
} = require("../controllers/inventoryController");
const { requireAuth } = require("../middlewares/authMiddleware");

const router = express.Router();

router.route("/").get(requireAuth, getPendingInventory);
router.route("/deliver").put(requireAuth, deliverInventoryItem);

module.exports = router;
