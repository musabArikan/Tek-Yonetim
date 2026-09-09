const express = require("express");
const {
  createBranch,
  getBranches,
  getBranchById,
  updateBranch,
  deleteBranch,
} = require("../controllers/branchController");
const { requireAuth } = require("../middlewares/authMiddleware");

const router = express.Router();

router.route("/").get(requireAuth, getBranches).post(requireAuth, createBranch);
router
  .route("/:id")
  .get(requireAuth, getBranchById)
  .put(requireAuth, updateBranch)
  .delete(requireAuth, deleteBranch);

module.exports = router;
