const express = require("express");
const {
  createCollection,
  getCollections,
  getCollectionById,
  deleteCollection,
} = require("../controllers/collectionController");
const { requireAuth } = require("../middlewares/authMiddleware");

const router = express.Router();

router
  .route("/")
  .get(requireAuth, getCollections)
  .post(requireAuth, createCollection);

router
  .route("/:id")
  .get(requireAuth, getCollectionById)
  .delete(requireAuth, deleteCollection);

module.exports = router;
