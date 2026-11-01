const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { authorizePage } = require("../middlewares/authorize");
const {
  getProfile,
  updateProfile,
  getPaymentMethods,
  addPaymentMethod,
} = require("../controllers/storeController");

router.use(authMiddleware);

router.get("/profile", getProfile);
router.put("/profile", authorizePage("myStore"), updateProfile);
router.get("/payment-methods", getPaymentMethods);
router.post("/payment-methods", addPaymentMethod);

module.exports = router;

