const Transaction = require("../models/Transaction");
const Collection = require("../models/Collection");
const Customer = require("../models/Customer");
const StockHistory = require("../models/StockHistory");
const { withTenant } = require("../utils/tenantScope");

// ─── GET /api/reports/z-raporu ────────────────────────────────────────────────
// query: date=YYYY-MM-DD (varsayılan: bugün), userId (opsiyonel — personel filtresi)
const getZRaporu = async (req, res) => {
  try {
    const dateStr = req.query.date || new Date().toISOString().split("T")[0];
    const targetDate = new Date(dateStr);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const dateFilter = { $gte: startOfDay, $lte: endOfDay };

    // Satışlar (o günün işlemleri)
    const txFilter = withTenant(req, {
      isDeleted: false,
      createdAt: dateFilter,
    });
    if (req.query.userId) txFilter.createdBy = req.query.userId;

    const [transactions, collections, stockMovements] = await Promise.all([
      Transaction.find(txFilter).lean(),
      Collection.find(withTenant(req, { isDeleted: false, collectionDate: dateFilter })).lean(),
      StockHistory.find(withTenant(req, { createdAt: dateFilter })).lean(),
    ]);

    // Satış özeti
    const salesSummary = transactions.reduce(
      (acc, tx) => {
        acc.toplamSatis += Number(tx.toplamTutar || 0);
        acc.toplamPesinat += Number(tx.pesinat || 0);
        acc.toplamAdet += 1;
        return acc;
      },
      { toplamSatis: 0, toplamPesinat: 0, toplamAdet: 0 },
    );

    // Tahsilat özeti
    const collectionSummary = collections.reduce(
      (acc, c) => {
        acc.toplamTahsilat += Number(c.amount || 0);
        acc.tahsilatAdet += 1;
        return acc;
      },
      { toplamTahsilat: 0, tahsilatAdet: 0 },
    );

    // Stok hareketleri özeti
    const stockSummary = stockMovements.reduce(
      (acc, s) => {
        if (s.type === "Giriş") acc.giris += Number(s.quantity || 0);
        if (s.type === "Çıkış") acc.cikis += Number(s.quantity || 0);
        return acc;
      },
      { giris: 0, cikis: 0 },
    );

    res.status(200).json({
      tarih: dateStr,
      satis: salesSummary,
      tahsilat: collectionSummary,
      stok: stockSummary,
      detay: {
        islemler: transactions.map((t) => ({
          id: t._id,
          tarih: t.createdAt,
          tutar: t.toplamTutar,
          pesinat: t.pesinat,
          islemTuru: t.islemTuru,
        })),
        tahsilatlar: collections.map((c) => ({
          id: c._id,
          tarih: c.collectionDate,
          tutar: c.amount,
          yontem: c.paymentMethod,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Z-Raporu alınırken hata oluştu", error: error.message });
  }
};

// ─── POST /api/reports/send-reminder ─────────────────────────────────────────
// STUB: İleride SMS / WhatsApp entegrasyonu için yer tutucu.
// Şimdilik sadece loglar ve başarı döner.
const sendReminder = async (req, res) => {
  try {
    const { customerId, message, channel } = req.body;

    if (!customerId) {
      return res.status(400).json({ message: "customerId zorunludur" });
    }

    const customer = await Customer.findOne(
      withTenant(req, { _id: customerId, isDeleted: false }),
    );

    if (!customer) {
      return res.status(404).json({ message: "Müşteri bulunamadı" });
    }

    // TODO: SMS/WhatsApp entegrasyonu buraya eklenecek
    // Örn: await smsService.send(customer.telefon, message);
    console.log(`[REMINDER STUB] Kanal: ${channel || "sms"} | Tel: ${customer.telefon} | Mesaj: ${message}`);

    res.status(200).json({
      success: true,
      message: "Hatırlatıcı gönderim talebi alındı (stub — gerçek gönderim entegre edilmedi)",
      customer: { ad: customer.ad, soyad: customer.soyad, telefon: customer.telefon },
      channel: channel || "sms",
    });
  } catch (error) {
    res.status(500).json({ message: "Hatırlatıcı gönderilemedi", error: error.message });
  }
};

module.exports = { getZRaporu, sendReminder };
