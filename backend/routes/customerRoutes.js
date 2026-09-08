const express = require("express");
const {
  createCustomer,
  getCustomers,
  getCustomerById,
  deleteCustomer,
} = require("../controllers/customerController");
const { requireAuth } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/authorize");

const router = express.Router();

router
  .route("/")
  .post(requireAuth, authorize("satisYapabilir"), createCustomer)
  .get(requireAuth, getCustomers);
router
  .route("/:id")
  .get(requireAuth, getCustomerById)
  .delete(requireAuth, authorize("musteriSilebilir"), deleteCustomer);

module.exports = router;
