const express = require("express");
const {
  createTransfer,
  getTransfers,
  getTransferById,
  updateTransferStatus,
  deleteTransfer,
} = require("../controllers/transferController");
const { requireAuth } = require("../middlewares/authMiddleware");

const router = express.Router();

router.route("/").get(requireAuth, getTransfers).post(requireAuth, createTransfer);
router
  .route("/:id")
  .get(requireAuth, getTransferById)
  .delete(requireAuth, deleteTransfer);

// Transfer durumunu güncelle (Onaylandı/Reddedildi)
router.patch("/:id/status", requireAuth, updateTransferStatus);

module.exports = router;
