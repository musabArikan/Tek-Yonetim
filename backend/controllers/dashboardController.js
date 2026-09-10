const mongoose = require("mongoose");
const Collection = require("../models/Collection");
const Installment = require("../models/Installment");
const Shipment = require("../models/Shipment");
const Product = require("../models/Product");

/**
 * GET /api/dashboard/summary
 * Tenant'a özgü C-Level özet dashboard verilerini döner.
 */
const getDashboardSummary = async (req, res) => {
  try {
    const tenantObjectId = new mongoose.Types.ObjectId(req.user.tenantId);

    const now = new Date();
    // Start of today (local time mapping to UTC if preferred, but let's just use local start/end as standard)
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 1. Bugünün Kasa Tahsilatı
    const gunlukKasaResult = await Collection.aggregate([
      {
        $match: {
          tenantId: tenantObjectId,
          isDeleted: false,
          collectionDate: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const gunlukKasa = gunlukKasaResult[0]?.total || 0;

    // 2. Vadesi Geçen Toplam Alacak
    const vadesiGecenResult = await Installment.aggregate([
      {
        $match: {
          tenantId: tenantObjectId,
          isDeleted: false,
          isPaid: false,
          dueDate: { $lt: startOfDay }, // Vadesi bugünden önce bitmiş
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const vadesiGecenAlacak = vadesiGecenResult[0]?.total || 0;

    // Vadesi geçen en riskli 5 taksit (en eski tarihli olanlar)
    const riskliTaksitler = await Installment.find({
      tenantId: tenantObjectId,
      isDeleted: false,
      isPaid: false,
      dueDate: { $lt: startOfDay },
    })
      .sort({ dueDate: 1 })
      .limit(5)
      .populate("customerId", "ad soyad telefon")
      .lean();

    // 3. Bugünün Sevkiyatları
    const bugunkuSevkiyatlar = await Shipment.find({
      tenantId: tenantObjectId,
      deliveryDate: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate("customerId", "ad soyad adres telefon")
      .lean();
    const sevkiyatSayisi = bugunkuSevkiyatlar.length;

    // 4. Kritik Stok Seviyesi (Stoğu 5 ve altında olan ürün sayısı)
    const kritikStokCount = await Product.countDocuments({
      tenantId: tenantObjectId,
      isDeleted: false,
      mevcutStok: { $lte: 5 },
    });

    // 5. Son Hareketler (Recent Activity)
    const ActionLog = require("../models/ActionLog");
    const sonHareketler = await ActionLog.find({ tenantId: tenantObjectId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.status(200).json({
      gunlukKasa,
      vadesiGecenAlacak,
      bugunkuSevkiyatlar: {
        sayi: sevkiyatSayisi,
        liste: bugunkuSevkiyatlar,
      },
      kritikStokSayisi: kritikStokCount,
      riskliTaksitler,
      sonHareketler,
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);
    res.status(500).json({
      message: "Dashboard özet verileri alınırken sunucu hatası oluştu.",
      error: error.message,
    });
  }
};

module.exports = { getDashboardSummary };
