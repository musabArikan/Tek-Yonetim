const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { authorizePage } = require("../middlewares/authorize");
const {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getMonthlySummary,
} = require("../controllers/expenseController");

router.use(authMiddleware);
router.use(authorizePage("myStore"));

router.get("/monthly-summary", getMonthlySummary);
router.get("/", getExpenses);
router.post("/", createExpense);
router.put("/:id", updateExpense);
router.delete("/:id", deleteExpense);

module.exports = router;

