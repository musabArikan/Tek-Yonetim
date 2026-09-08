const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const Customer = require("../models/Customer");
const Stock = require("../models/Stock");

// Kritik stok eşiği: Bu değerin altındaki stoklar "kritik" sayılır
const CRITICAL_STOCK_THRESHOLD = 3;

/**
 * GET /api/dashboard/summary
 * Tenant'a özgü özet dashboard verilerini döner.
 * Her aggregation'da ilk $match her zaman tenantId ile başlar.
 */
const getDashboardSummary = async (req, res) => {
  try {
    const tenantObjectId = new mongoose.Types.ObjectId(req.user.tenantId);

    // Günün başı ve sonu (UTC)
    const now = new Date();
    const startOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
    );
    const endOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
    );

    // Ayın başı
    const startOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
    );

    // ── 1. Günlük & Aylık Satış Toplamı (Kasa) ─────────────────────────────
    // islemTuru === "Satış" olan, silinmemiş işlemler
    const [kasaResult] = await Transaction.aggregate([
      {
        $match: {
          tenantId: tenantObjectId,
          isDeleted: false,
          islemTuru: "Satış",
        },
      },
      {
        $facet: {
          gunluk: [
            { $match: { tarih: { $gte: startOfDay, $lte: endOfDay } } },
            { $group: { _id: null, toplam: { $sum: "$toplamTutar" } } },
          ],
          aylik: [
            { $match: { tarih: { $gte: startOfMonth } } },
            { $group: { _id: null, toplam: { $sum: "$toplamTutar" } } },
          ],
        },
      },
      {
        $project: {
          gunlukSatis: { $ifNull: [{ $arrayElemAt: ["$gunluk.toplam", 0] }, 0] },
          aylikSatis: { $ifNull: [{ $arrayElemAt: ["$aylik.toplam", 0] }, 0] },
        },
      },
    ]);

    // ── 2. Bekleyen / Açık Alacaklar (Müşterilerin ödenmemiş bakiyeleri) ───
    // Customer.toplamKalanBakiye > 0 olan, silinmemiş müşterilerin toplamı
    const [alacaklarResult] = await Customer.aggregate([
      {
        $match: {
          tenantId: tenantObjectId,
          isDeleted: false,
          toplamKalanBakiye: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          toplamAlacak: { $sum: "$toplamKalanBakiye" },
          alacakliMusteriSayisi: { $sum: 1 },
        },
      },
    ]);

    // ── 3. Kritik Stok Uyarısı ─────────────────────────────────────────────
    // adet <= CRITICAL_STOCK_THRESHOLD olan ürünler
    const kritikStoklar = await Stock.find({
      tenantId: tenantObjectId,
      adet: { $lte: CRITICAL_STOCK_THRESHOLD },
    })
      .select("urunKodu marka adet envanterdekiAdet -_id")
      .lean();

    // ── 4. Bekleyen Envanter (envanterdekiAdet > 0: müşteride teslim bekleyen) ──
    const [envanterResult] = await Transaction.aggregate([
      {
        $match: {
          tenantId: tenantObjectId,
          isDeleted: false,
          islemTuru: "Satış",
        },
      },
      { $unwind: "$urunler" },
      {
        $match: {
          "urunler.envanterdeMi": true,
          "urunler.envanterdeBekleyenAdet": { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          bekleyenTeslimatSayisi: { $sum: 1 },
          bekleyenToplamAdet: { $sum: "$urunler.envanterdeBekleyenAdet" },
        },
      },
    ]);

    res.status(200).json({
      kasa: {
        gunlukSatis: kasaResult?.gunlukSatis ?? 0,
        aylikSatis: kasaResult?.aylikSatis ?? 0,
      },
      alacaklar: {
        toplamAlacak: alacaklarResult?.toplamAlacak ?? 0,
        alacakliMusteriSayisi: alacaklarResult?.alacakliMusteriSayisi ?? 0,
      },
      kritikStok: {
        esik: CRITICAL_STOCK_THRESHOLD,
        urunSayisi: kritikStoklar.length,
        urunler: kritikStoklar,
      },
      bekleyenEnvanter: {
        bekleyenTeslimatSayisi: envanterResult?.bekleyenTeslimatSayisi ?? 0,
        bekleyenToplamAdet: envanterResult?.bekleyenToplamAdet ?? 0,
      },
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
