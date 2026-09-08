const express = require("express");
const {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
} = require("../controllers/userController");
const { requireAuth } = require("../middlewares/authMiddleware");
const { requireRole } = require("../middlewares/authorize");

const router = express.Router();

const adminOrManager = requireRole(["admin", "yonetici"]);

router
  .route("/")
  .get(requireAuth, adminOrManager, listUsers)
  .post(requireAuth, adminOrManager, createUser);

router
  .route("/:id")
  .put(requireAuth, adminOrManager, updateUser)
  .delete(requireAuth, adminOrManager, deleteUser);

router
  .route("/:id/password")
  .patch(requireAuth, adminOrManager, changePassword);

module.exports = router;
