const mongoose = require("mongoose");

const stockHistorySchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: [true, "tenantId zorunludur"],
      index: true,
    },
    // Audit Logging: işlemi yapan personel
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "performedBy zorunludur"],
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "productId zorunludur"],
    },
    // Hareket tipi: Giriş | Çıkış | Transfer
    hareketTipi: {
      type: String,
      enum: ["Giriş", "Çıkış", "Transfer"],
      required: [true, "hareketTipi zorunludur"],
    },
    miktar: {
      type: Number,
      required: [true, "miktar zorunludur"],
      min: [1, "miktar en az 1 olmalıdır"],
    },
    // Stok öncesi ve sonrası (anlık snapshot)
    oncekiStok: {
      type: Number,
      default: 0,
    },
    sonrakiStok: {
      type: Number,
      default: 0,
    },
    aciklama: {
      type: String,
      trim: true,
      default: "",
    },
    // Soft-delete (Geri Al / İptal Et)
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Kim iptal etti
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

stockHistorySchema.index({ tenantId: 1, productId: 1 });
stockHistorySchema.index({ tenantId: 1, createdAt: -1 });

module.exports = mongoose.model("StockHistory", stockHistorySchema);
