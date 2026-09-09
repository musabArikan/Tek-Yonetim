const express = require("express");
const {
  createInstallment,
  getInstallments,
  getOverdueInstallments,
  getInstallmentById,
  markInstallmentPaid,
  deleteInstallment,
  getCustomerInstallmentSummary,
} = require("../controllers/installmentController");
const { requireAuth } = require("../middlewares/authMiddleware");

const router = express.Router();

// Vadesi geçmiş taksitler (özel endpoint — /:id'den önce tanımlanmalı)
router.get("/overdue", requireAuth, getOverdueInstallments);

// Müşteri + taksit özeti
router.get("/customer/:customerId/summary", requireAuth, getCustomerInstallmentSummary);

router.route("/").get(requireAuth, getInstallments).post(requireAuth, createInstallment);

router
  .route("/:id")
  .get(requireAuth, getInstallmentById)
  .delete(requireAuth, deleteInstallment);

// Taksiti ödendi olarak işaretle
router.patch("/:id/paid", requireAuth, markInstallmentPaid);

module.exports = router;
