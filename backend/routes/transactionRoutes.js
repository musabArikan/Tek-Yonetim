const express = require("express");
const {
  createTransaction,
  getTransactions,
  getCustomerTransactions,
} = require("../controllers/transactionController");
const { requireAuth } = require("../middlewares/authMiddleware");

const router = express.Router();

router
  .route("/")
  .post(requireAuth, createTransaction)
  .get(requireAuth, getTransactions);
router.route("/customer/:id").get(requireAuth, getCustomerTransactions);

module.exports = router;
