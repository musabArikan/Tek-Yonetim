const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: [true, "tenantId zorunludur"],
    },
    ad: {
      type: String,
      required: [true, "Şube adı zorunludur"],
      trim: true,
    },
    adres: {
      type: String,
      trim: true,
    },
    telefon: {
      type: String,
      trim: true,
    },
    sorumluPersonel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "createdBy zorunludur"],
    },
  },
  {
    timestamps: true,
  },
);

branchSchema.index({ tenantId: 1 });
branchSchema.index({ tenantId: 1, ad: 1 }, { unique: true });

module.exports = mongoose.model("Branch", branchSchema);
