const mongoose = require("mongoose");

const stockSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: [true, "tenantId zorunludur"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "createdBy zorunludur"],
    },
    urunKodu: {
      type: String,
      required: [true, "Ürün kodu zorunludur"],
      trim: true,
    },
    marka: {
      type: String,
      enum: ["Profilo", "Bosch", "Gipa"],
    },
    adet: {
      type: Number,
      default: 0,
      min: 0,
    },
    envanterdekiAdet: {
      type: Number,
      default: 0,
      min: 0,
    },
    serialNumbers: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

stockSchema.index({ tenantId: 1, urunKodu: 1 }, { unique: true });
stockSchema.index({ tenantId: 1 });

module.exports = mongoose.model("Stock", stockSchema);
