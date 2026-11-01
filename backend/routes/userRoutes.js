const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { authorizeRole } = require("../middlewares/authorize");
const {
  getUsers,
  createUser,
  updateUser,
  updateUserPassword,
  updateUserPagePassword,
  deleteUser,
} = require("../controllers/userController");

router.use(authMiddleware);

router.get("/", getUsers);
router.post("/", authorizeRole("admin"), createUser);
router.put("/:id", authorizeRole("admin"), updateUser);
router.patch("/:id/password", authorizeRole("admin"), updateUserPassword);
router.patch("/:id/page-password", authorizeRole("admin"), updateUserPagePassword);
router.delete("/:id", authorizeRole("admin"), deleteUser);

module.exports = router;
