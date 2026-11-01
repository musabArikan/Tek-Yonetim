const mongoose = require("mongoose");
const jsonPlugin = require("../utils/jsonPlugin");

const collectionSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: [true, "tenantId zorunludur"],
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "customerId zorunludur"],
    },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction", default: null },
    amount: {
      type: Number,
      required: [true, "Tahsilat tutarı zorunludur"],
      min: [0.01, "Tahsilat tutarı sıfırdan büyük olmalıdır"],
    },
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Tahsilatı yapan personel zorunludur"],
    },
    collectedByName: { type: String, trim: true, default: "" },
    paymentMethod: { type: String, trim: true, default: "Nakit" },
    collectionDate: { type: Date, required: true, default: Date.now },
    notes: { type: String, trim: true, default: "" },
    kaynak: { type: String, default: "TAHSILAT" },
    isDeleted: { type: Boolean, default: false },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

collectionSchema.index({ tenantId: 1, customerId: 1 });
collectionSchema.index({ tenantId: 1, isDeleted: 1, collectionDate: -1 });
collectionSchema.plugin(jsonPlugin);

module.exports = mongoose.model("Collection", collectionSchema);
