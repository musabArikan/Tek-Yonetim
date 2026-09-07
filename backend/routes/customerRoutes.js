const express = require("express");
const {
  createCustomer,
  getCustomers,
  getCustomerById,
  deleteCustomer,
} = require("../controllers/customerController");
const { requireAuth } = require("../middlewares/authMiddleware");

const router = express.Router();

router.route("/").post(requireAuth, createCustomer).get(requireAuth, getCustomers);
router.route("/:id").get(requireAuth, getCustomerById).delete(requireAuth, deleteCustomer);

module.exports = router;
