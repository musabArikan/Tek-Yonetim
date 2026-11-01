const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const {
  getCustomers,
  getCustomerById,
  createCustomer,
  deleteCustomer,
  getCustomerTransactions,
} = require("../controllers/customerController");

router.use(authMiddleware);

router.get("/", getCustomers);
router.post("/", createCustomer);
router.get("/:id/transactions", getCustomerTransactions);
router.get("/:id", getCustomerById);
router.delete("/:id", deleteCustomer);

module.exports = router;
