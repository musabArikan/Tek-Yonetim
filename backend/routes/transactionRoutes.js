const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const {
  getTransactions,
  createTransaction,
  getTransactionsByCustomer,
} = require("../controllers/transactionController");

router.use(authMiddleware);

router.get("/", getTransactions);
router.post("/", createTransaction);
router.get("/customer/:customerId", getTransactionsByCustomer);

module.exports = router;
