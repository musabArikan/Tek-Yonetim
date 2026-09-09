const express = require("express");
const {
  createShipment,
  getShipments,
  getShipmentById,
  updateShipment,
  deleteShipment,
} = require("../controllers/shipmentController");
const { requireAuth } = require("../middlewares/authMiddleware");

const router = express.Router();

router.route("/").get(requireAuth, getShipments).post(requireAuth, createShipment);
router
  .route("/:id")
  .get(requireAuth, getShipmentById)
  .put(requireAuth, updateShipment)
  .delete(requireAuth, deleteShipment);

module.exports = router;
