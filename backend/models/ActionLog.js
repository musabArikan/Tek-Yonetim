const mongoose = require("mongoose");

const actionLogSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // İşlemi yapan kişinin adı (silindikten sonra da görünsün diye)
    userName: {
      type: String,
      default: "Bilinmiyor",
    },
    // İşlem türü
    action: {
      type: String,
      enum: [
        "MUSTERI_EKLE",
        "MUSTERI_SIL",
        "SATIS_OLUSTUR",
        "TAHSILAT_AL",
        "STOK_EKLE",
        "STOK_GUNCELLE",
        "STOK_SIL",
        "STOK_HAREKET",
        "STOK_HAREKET_IPTAL",
        "URUN_EKLE",
        "URUN_GUNCELLE",
        "URUN_SIL",
        "TRANSFER_OLUSTUR",
        "TRANSFER_ONAYLA",
        "KULLANICI_EKLE",
        "KULLANICI_SIL",
        "DIGER",
      ],
      required: true,
    },
    // Hangi model üzerinde işlem yapıldı
    entityType: {
      type: String,
      enum: ["Customer", "Transaction", "Collection", "Product", "Stock", "StockHistory", "Transfer", "User", "Other"],
      default: "Other",
    },
    // İlgili kaydın ID'si
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    // Ek detaylar (JSON)
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

actionLogSchema.index({ tenantId: 1, createdAt: -1 });
actionLogSchema.index({ tenantId: 1, action: 1 });

module.exports = mongoose.model("ActionLog", actionLogSchema);
