const mongoose = require("mongoose");
const jsonPlugin = require("../utils/jsonPlugin");

const productSchema = new mongoose.Schema(
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
    urunKodu: { type: String, trim: true, default: "" },
    marka: { type: String, trim: true, default: "" },
    ad: { type: String, required: [true, "Ürün adı zorunludur"], trim: true },
    kategori: { type: String, trim: true, default: "" },
    barkod: { type: String, trim: true, default: "" },
    seriNo: { type: String, trim: true, default: "" },
    alisFiyati: { type: Number, default: 0, min: 0 },
    satisFiyati: { type: Number, default: 0, min: 0 },
    mevcutStok: { type: Number, default: 0, min: 0 },
    kritikStokSeviyesi: { type: Number, default: 5, min: 0 },
    garantiSuresi: { type: Number, default: 0, min: 0 },
    tedarikci: { type: String, trim: true, default: "" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Mağaza bazlı benzersizlik (boş değerler ve silinmiş kayıtlar hariç)
productSchema.index(
  { tenantId: 1, urunKodu: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false, urunKodu: { $gt: "" } } },
);
productSchema.index(
  { tenantId: 1, barkod: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false, barkod: { $gt: "" } } },
);
productSchema.index({ tenantId: 1, isDeleted: 1, createdAt: -1 });
productSchema.plugin(jsonPlugin);

module.exports = mongoose.model("Product", productSchema);
