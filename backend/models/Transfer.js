const mongoose = require("mongoose");

const transferProductSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    urunKodu: {
      type: String,
      required: [true, "Ürün kodu zorunludur"],
      trim: true,
    },
    urunAdi: {
      type: String,
      trim: true,
    },
    adet: {
      type: Number,
      required: [true, "Adet zorunludur"],
      min: [1, "Adet en az 1 olmalıdır"],
    },
  },
  { _id: false },
);

const transferSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: [true, "tenantId zorunludur"],
    },
    fromBranch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: [true, "Kaynak şube zorunludur"],
    },
    toBranch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: [true, "Hedef şube zorunludur"],
    },
    products: {
      type: [transferProductSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "En az bir ürün zorunludur",
      },
    },
    status: {
      type: String,
      enum: ["Beklemede", "Onaylandı", "Reddedildi"],
      default: "Beklemede",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "createdBy zorunludur"],
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

transferSchema.index({ tenantId: 1, status: 1 });
transferSchema.index({ tenantId: 1, createdAt: -1 });

module.exports = mongoose.model("Transfer", transferSchema);
