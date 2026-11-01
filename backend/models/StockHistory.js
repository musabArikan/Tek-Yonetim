const mongoose = require("mongoose");
const jsonPlugin = require("../utils/jsonPlugin");

const stockHistorySchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: [true, "tenantId zorunludur"],
    },
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
    urunKodu: { type: String, trim: true, default: "" },
    hareketTipi: {
      type: String,
      enum: ["Giriş", "Çıkış", "Transfer"],
      required: [true, "hareketTipi zorunludur"],
    },
    miktar: { type: Number, required: [true, "miktar zorunludur"], min: [1, "miktar en az 1 olmalıdır"] },
    oncekiStok: { type: Number, default: 0 },
    sonrakiStok: { type: Number, default: 0 },
    aciklama: { type: String, trim: true, default: "" },
    isDeleted: { type: Boolean, default: false },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

stockHistorySchema.index({ tenantId: 1, productId: 1 });
stockHistorySchema.index({ tenantId: 1, createdAt: -1 });
stockHistorySchema.plugin(jsonPlugin);

module.exports = mongoose.model("StockHistory", stockHistorySchema);
