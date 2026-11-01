const mongoose = require("mongoose");
const jsonPlugin = require("../utils/jsonPlugin");

const customerSchema = new mongoose.Schema(
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
    musteriNo: { type: Number },
    ad: { type: String, required: [true, "Müşteri adı zorunludur"], trim: true },
    soyad: { type: String, required: [true, "Müşteri soyadı zorunludur"], trim: true },
    tcKimlik: { type: String, trim: true, default: "" },
    tc: { type: String, trim: true, default: "" },
    telefon: { type: String, required: [true, "Telefon numarası zorunludur"], trim: true },
    adres: { type: String, trim: true, default: "" },
    toplamKalanBakiye: { type: Number, default: 0, min: 0 },
    kalanBorc: { type: Number, default: 0, min: 0 },
    kayitTarihi: { type: Date },
    sonIslemTarihi: { type: Date },
    isDeleted: { type: Boolean, default: false },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Mağaza bazlı bileşik indeksler: farklı mağazalar aynı müşteri no / TC'yi kullanabilir
customerSchema.index({ tenantId: 1, musteriNo: 1 }, { unique: true });
customerSchema.index(
  { tenantId: 1, tcKimlik: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false, tcKimlik: { $gt: "" } } },
);
customerSchema.index({ tenantId: 1, isDeleted: 1, createdAt: -1 });
customerSchema.plugin(jsonPlugin);

module.exports = mongoose.model("Customer", customerSchema);
