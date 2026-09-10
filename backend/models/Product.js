const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: [true, "tenantId zorunludur"],
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "createdBy zorunludur"],
    },
    // --- Temel Bilgiler ---
    ad: {
      type: String,
      required: [true, "Ürün adı zorunludur"],
      trim: true,
    },
    kategori: {
      type: String,
      trim: true,
      default: "",
    },
    barkod: {
      type: String,
      trim: true,
      default: "",
    },
    seriNo: {
      type: String,
      trim: true,
      default: "",
    },
    // --- Fiyatlar ---
    alisFiyati: {
      type: Number,
      default: 0,
      min: 0,
    },
    satisFiyati: {
      type: Number,
      default: 0,
      min: 0,
    },
    // --- Stok ---
    mevcutStok: {
      type: Number,
      default: 0,
      min: 0,
    },
    kritikStokSeviyesi: {
      type: Number,
      default: 5,
      min: 0,
    },
    // --- Tedarik & Garanti ---
    garantiSuresi: {
      type: Number,
      default: 0,
      min: 0,
      comment: "Ay cinsinden garanti süresi",
    },
    tedarikci: {
      type: String,
      trim: true,
      default: "",
    },
    // --- Soft-delete ---
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index: tenant bazlı barkod benzersizliği (boş değilse)
productSchema.index(
  { tenantId: 1, barkod: 1 },
  { unique: true, sparse: true, partialFilterExpression: { barkod: { $ne: "" } } },
);
productSchema.index({ tenantId: 1, ad: 1 });

module.exports = mongoose.model("Product", productSchema);
