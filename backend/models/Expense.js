const mongoose = require("mongoose");
const jsonPlugin = require("../utils/jsonPlugin");
const { EXPENSE_CATEGORIES } = require("../utils/constants");

const expenseSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: [true, "tenantId zorunludur"],
    },
    amount: {
      type: Number,
      required: [true, "Gider tutarı zorunludur"],
      min: [0.01, "Gider tutarı 0'dan büyük olmalıdır"],
    },
    date: { type: Date, required: true, default: Date.now },
    category: { type: String, enum: EXPENSE_CATEGORIES, default: "Diğer" },
    description: { type: String, trim: true, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdByName: { type: String, trim: true, default: "" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

expenseSchema.index({ tenantId: 1, isDeleted: 1, date: -1 });
expenseSchema.plugin(jsonPlugin);

module.exports = mongoose.model("Expense", expenseSchema);

