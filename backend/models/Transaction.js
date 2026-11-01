const mongoose = require("mongoose");
const jsonPlugin = require("../utils/jsonPlugin");

// Satış satırı: satış anındaki alış fiyatı (alisFiyati) işlem içine kaydedilir,
// böylece ürünün alış fiyatı sonradan değişse bile geçmiş kâr doğru hesaplanır.
const lineSchema = new mongoose.Schema(
  {
    urunKodu: { type: String, required: true, trim: true },
    urunAdi: { type: String, trim: true, default: "" },
    marka: { type: String, trim: true, default: "" },
    adet: { type: Number, default: 1, min: 1 },
    alisFiyati: { type: Number, default: 0, min: 0 },
    birimFiyat: { type: Number, default: 0, min: 0 },
    toplamMaliyet: { type: Number, default: 0, min: 0 },
    envanterdeBekleyenAdet: { type: Number, default: 0, min: 0 },
    envanterdeMi: { type: Boolean, default: false },
    envanterAciklamasi: { type: String, default: "" },
  },
  { _id: false },
);

const transactionSchema = new mongoose.Schema(
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
    personelAdi: { type: String, trim: true, default: "" },
    musteriId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Müşteri ID zorunludur"],
    },
    musteriAdSoyad: { type: String, trim: true, default: "" },
    musteriNo: { type: Number },
    islemTuru: { type: String, enum: ["Satış", "Tahsilat"], default: "Satış" },
    islemTipi: { type: String, default: "SATIS" },
    tarih: { type: Date, default: Date.now },
    urunler: { type: [lineSchema], default: [] },
    urunBilgisi: { type: String, default: "" },
    toplamTutar: { type: Number, default: 0, min: 0 },
    toplamMaliyet: { type: Number, default: 0, min: 0 },
    pesinat: { type: Number, default: 0, min: 0 },
    tutar: { type: Number },
    odenenTutar: { type: Number },
    kalanHesap: { type: Number, default: 0, min: 0 },
    alinanTutar: { type: Number, default: 0, min: 0 },
    kalanBorc: { type: Number, default: 0, min: 0 },
    musteriBakiyeSonrasi: { type: Number, default: 0, min: 0 },
    odemeYontemi: { type: String, trim: true },
    aciklama: { type: String, trim: true, default: "" },
    isDeleted: { type: Boolean, default: false },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

transactionSchema.index({ tenantId: 1, isDeleted: 1, tarih: -1 });
transactionSchema.index({ tenantId: 1, musteriId: 1 });
transactionSchema.plugin(jsonPlugin);

module.exports = mongoose.model("Transaction", transactionSchema);
