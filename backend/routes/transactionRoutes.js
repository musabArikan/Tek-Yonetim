const express = require("express");
const {
  createTransaction,
  getTransactions,
  getCustomerTransactions,
} = require("../controllers/transactionController");
const { requireAuth } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/authorize");

const router = express.Router();

router
  .route("/")
  .post(
    requireAuth,
    authorize((req) =>
      req.body?.islemTuru === "Tahsilat" ? "tahsilatAlabilir" : "satisYapabilir",
    ),
    createTransaction,
  )
  .get(requireAuth, getTransactions);
router.route("/customer/:id").get(requireAuth, getCustomerTransactions);

module.exports = router;
