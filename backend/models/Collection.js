const mongoose = require("mongoose");

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
    // Hangi taksit için yapıldığını belirtir (opsiyonel, genel tahsilat da olabilir)
    installmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Installment",
    },
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
    paymentMethod: {
      type: String,
      enum: ["Nakit", "Kart", "Havale", "EFT", "Çek", "Diğer"],
      default: "Nakit",
    },
    collectionDate: {
      type: Date,
      required: [true, "Tahsilat tarihi zorunludur"],
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

collectionSchema.index({ tenantId: 1, customerId: 1 });
collectionSchema.index({ tenantId: 1, collectionDate: -1 });
collectionSchema.index({ tenantId: 1, installmentId: 1 });

module.exports = mongoose.model("Collection", collectionSchema);
