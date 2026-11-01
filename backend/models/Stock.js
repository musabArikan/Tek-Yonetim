const mongoose = require("mongoose");
const jsonPlugin = require("../utils/jsonPlugin");

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
    urunKodu: { type: String, required: [true, "Ürün kodu zorunludur"], trim: true },
    urunAdi: { type: String, trim: true, default: "" },
    marka: { type: String, trim: true, default: "" },
    kategori: { type: String, trim: true, default: "" },
    alisFiyati: { type: Number, default: 0, min: 0 },
    satisFiyati: { type: Number, default: 0, min: 0 },
    adet: { type: Number, default: 0, min: 0 },
    envanterdekiAdet: { type: Number, default: 0, min: 0 },
    serialNumbers: { type: [String], default: [] },
  },
  { timestamps: true },
);

stockSchema.index({ tenantId: 1, urunKodu: 1 }, { unique: true });
stockSchema.plugin(jsonPlugin);

module.exports = mongoose.model("Stock", stockSchema);
