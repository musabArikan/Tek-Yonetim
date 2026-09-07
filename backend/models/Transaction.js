const mongoose = require("mongoose");

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
    musteriId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Müşteri ID zorunludur"],
    },
    islemTuru: {
      type: String,
      enum: ["Satış", "Tahsilat"],
      default: "Satış",
      trim: true,
    },
    tarih: {
      type: Date,
      default: Date.now,
    },
    urunler: [
      {
        urunKodu: {
          type: String,
          required: true,
          trim: true,
        },
        adet: {
          type: Number,
          default: 1,
          min: 1,
        },
        envanterdeBekleyenAdet: {
          type: Number,
          default: 0,
          min: 0,
        },
        envanterdeMi: {
          type: Boolean,
          default: false,
        },
        envanterAciklamasi: {
          type: String,
          default: "",
        },
      },
    ],
    toplamTutar: {
      type: Number,
      required() {
        return this.islemTuru !== "Tahsilat";
      },
      min: 0,
      default: 0,
    },
    pesinat: {
      type: Number,
      default: 0,
      min: 0,
    },
    kalanHesap: {
      type: Number,
      required() {
        return this.islemTuru !== "Tahsilat";
      },
      min: 0,
      default: 0,
    },
    odemeYontemi: {
      type: String,
      trim: true,
    },
    kayitDefteri: {
      type: String,
      trim: true,
    },
    aciklama: {
      type: String,
      trim: true,
      default: "",
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

transactionSchema.index({ tenantId: 1 });
transactionSchema.index({ tenantId: 1, musteriId: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);
