const mongoose = require("mongoose");

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
    ad: {
      type: String,
      required: [true, "Müşteri adı zorunludur"],
      trim: true,
    },
    soyad: {
      type: String,
      required: [true, "Müşteri soyadı zorunludur"],
      trim: true,
    },
    tcKimlik: {
      type: String,
      trim: true,
    },
    telefon: {
      type: String,
      required: [true, "Telefon numarası zorunludur"],
      trim: true,
    },
    musteriNo: {
      type: Number,
    },
    adres: {
      type: String,
      trim: true,
    },
    toplamKalanBakiye: {
      type: Number,
      default: 0,
      min: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

customerSchema.index({ tenantId: 1, musteriNo: 1 }, { unique: true });
customerSchema.index({ tenantId: 1 });

module.exports = mongoose.model("Customer", customerSchema);
