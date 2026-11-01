const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const {
  getCollections,
  getCollectionById,
  createCollection,
  deleteCollection,
} = require("../controllers/collectionController");

router.use(authMiddleware);

router.get("/", getCollections);
router.post("/", createCollection);
router.get("/:id", getCollectionById);
router.delete("/:id", deleteCollection);

module.exports = router;
