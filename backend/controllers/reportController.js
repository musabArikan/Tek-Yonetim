const Transaction = require("../models/Transaction");
const Collection = require("../models/Collection");
const StockHistory = require("../models/StockHistory");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const {
  num,
  round2,
  pad2,
  fullName,
  isObjectId,
  dayBounds,
  inRange,
} = require("../utils/helpers");

const lineSummary = (transaction) =>
  (transaction.urunler || []).map((line) => `${line.urunKodu} x${line.adet}`).join(", ");

const buildPeriodReport = async (tenantId, range, { userId, label } = {}) => {
  const startDate = new Date(range[0]);
  const endDate = new Date(range[1]);

  const txQuery = {
    tenantId,
    isDeleted: false,
    islemTuru: "Satış",
    tarih: { $gte: startDate, $lte: endDate },
  };
  const colQuery = {
    tenantId,
    isDeleted: false,
    collectionDate: { $gte: startDate, $lte: endDate },
  };
  const movQuery = {
    tenantId,
    isDeleted: false,
    createdAt: { $gte: startDate, $lte: endDate },
  };

  if (userId && isObjectId(userId)) {
    txQuery.createdBy = userId;
    colQuery.collectedBy = userId;
    movQuery.performedBy = userId;
  }

  const [sales, collected, movements, customers] = await Promise.all([
    Transaction.find(txQuery).sort({ tarih: -1 }).lean(),
    Collection.find(colQuery).sort({ collectionDate: -1 }).lean(),
    StockHistory.find(movQuery).lean(),
    Customer.find({ tenantId }).select("ad soyad").lean(),
  ]);

  const customerById = new Map(customers.map((c) => [String(c._id), c]));

  const soldQuantity = sales.reduce(
    (sum, t) =>
      sum +
      (t.urunler || []).reduce(
        (inner, line) => inner + Math.max(0, num(line.adet) - num(line.envanterdeBekleyenAdet)),
        0,
      ),
    0,
  );

  return {
    tarih: label,
    satis: {
      toplamSatis: round2(sales.reduce((sum, t) => sum + num(t.toplamTutar), 0)),
      toplamPesinat: round2(sales.reduce((sum, t) => sum + num(t.pesinat), 0)),
      toplamKalanBorc: round2(sales.reduce((sum, t) => sum + num(t.kalanHesap), 0)),
      toplamAdet: sales.length,
    },
    tahsilat: {
      toplamTahsilat: round2(collected.reduce((sum, c) => sum + num(c.amount), 0)),
      tahsilatAdet: collected.length,
    },
    stok: {
      giris: movements
        .filter((m) => m.hareketTipi === "Giriş")
        .reduce((sum, m) => sum + num(m.miktar), 0),
      cikis:
        movements
          .filter((m) => m.hareketTipi !== "Giriş")
          .reduce((sum, m) => sum + num(m.miktar), 0) + soldQuantity,
    },
    detay: {
      islemler: sales.map((t) => ({
        id: String(t._id),
        tarih: t.tarih,
        tutar: t.toplamTutar,
        pesinat: t.pesinat,
        kalanBorc: t.kalanHesap,
        islemTuru: t.islemTuru,
        personel: t.personelAdi,
        musteri: t.musteriAdSoyad,
        musteriId: t.musteriId,
        urunler: lineSummary(t),
      })),
      tahsilatlar: collected.map((c) => {
        const customer = customerById.get(String(c.customerId));
        return {
          id: String(c._id),
          tarih: c.collectionDate,
          tutar: c.amount,
          yontem: c.paymentMethod,
          personel: c.collectedByName,
          musteri: customer ? fullName(customer) : "",
          kaynak: c.kaynak,
        };
      }),
    },
  };
};

// GET /api/reports/daily & GET /api/reports/z-raporu
const getDailyReport = async (req, res) => {
  try {
    const t = new Date();
    const day =
      req.query?.date || `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`;
    const report = await buildPeriodReport(req.user.tenantId, dayBounds(day), {
      userId: req.query?.userId,
      label: day,
    });
    return res.json(report);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/reports/monthly
const getMonthlyReport = async (req, res) => {
  try {
    const t = new Date();
    const key = req.query?.month || `${t.getFullYear()}-${pad2(t.getMonth() + 1)}`;
    const [y, m] = key.split("-").map(Number);
    const range = [
      new Date(y, m - 1, 1, 0, 0, 0, 0).getTime(),
      new Date(y, m, 0, 23, 59, 59, 999).getTime(),
    ];
    const report = await buildPeriodReport(req.user.tenantId, range, {
      userId: req.query?.userId,
      label: key,
    });
    return res.json(report);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/reports/reminder
const sendReminder = async (req, res) => {
  try {
    const { customerId, message, channel } = req.body || {};
    if (!customerId || !isObjectId(customerId)) {
      return res.status(400).json({ message: "customerId zorunludur." });
    }
    const customer = await Customer.findOne({
      _id: customerId,
      tenantId: req.user.tenantId,
      isDeleted: false,
    });
    if (!customer) {
      return res.status(404).json({ message: "Müşteri bulunamadı." });
    }

    return res.json({
      success: true,
      message: "Hatırlatıcı gönderim talebi alındı",
      customer: { ad: customer.ad, soyad: customer.soyad, telefon: customer.telefon },
      channel: channel || "sms",
      note: message || "",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/reports/export-rows
const getExportRows = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const type = String(req.query?.type || req.params?.type || "products").toLowerCase();
    const year = req.query?.year;
    const month = req.query?.month;

    const dateText = (iso) => (iso ? new Date(iso).toLocaleDateString("tr-TR") : "");
    const dateTimeText = (iso) => (iso ? new Date(iso).toLocaleString("tr-TR") : "");

    const hasMonthFilter = Boolean(year && month);
    const monthRange = hasMonthFilter
      ? [
          new Date(Number(year), Number(month) - 1, 1, 0, 0, 0, 0).getTime(),
          new Date(Number(year), Number(month), 0, 23, 59, 59, 999).getTime(),
        ]
      : null;

    switch (type) {
      case "products": {
        const products = await Product.find({ tenantId, isDeleted: false })
          .sort({ createdAt: -1 })
          .lean();
        return res.json({
          sheetName: "Ürün Listesi",
          fileName: "urun-listesi.xlsx",
          rows: products.map((p) => ({
            "Ürün Kodu": p.urunKodu || "",
            "Ürün Adı": p.ad,
            Marka: p.marka || "-",
            Kategori: p.kategori || "-",
            Barkod: p.barkod || "-",
            "Alış Fiyatı (₺)": p.alisFiyati || 0,
            "Satış Fiyatı (₺)": p.satisFiyati || 0,
            "Mevcut Stok": p.mevcutStok || 0,
            "Kritik Stok": p.kritikStokSeviyesi ?? 5,
            "Kayıt Tarihi": dateText(p.createdAt),
          })),
        });
      }
      case "customers": {
        const customers = await Customer.find({ tenantId, isDeleted: false })
          .sort({ createdAt: -1 })
          .lean();
        return res.json({
          sheetName: "Müşteri Listesi",
          fileName: "musteri-listesi.xlsx",
          rows: customers.map((c) => ({
            "Müşteri No": c.musteriNo || "",
            "Ad Soyad": `${c.ad || ""} ${c.soyad || ""}`.trim(),
            "TC Kimlik": c.tcKimlik || c.tc || "-",
            Telefon: c.telefon || "-",
            "İletişim Adresi": c.adres || "-",
            "Kalan Borç (₺)": c.toplamKalanBakiye || 0,
            "Kayıt Tarihi": dateText(c.createdAt),
          })),
        });
      }
      case "debtors": {
        const debtors = await Customer.find({
          tenantId,
          isDeleted: false,
          toplamKalanBakiye: { $gt: 0 },
        })
          .sort({ toplamKalanBakiye: -1 })
          .lean();
        return res.json({
          sheetName: "Borçlular Listesi",
          fileName: "borclular-listesi.xlsx",
          rows: debtors.map((c) => ({
            "Müşteri No": c.musteriNo || "",
            "Ad Soyad": `${c.ad || ""} ${c.soyad || ""}`.trim(),
            "TC Kimlik": c.tcKimlik || c.tc || "-",
            Telefon: c.telefon || "-",
            "İletişim Adresi": c.adres || "-",
            "Toplam Kalan Borç (₺)": c.toplamKalanBakiye || 0,
            "Son İşlem Tarihi": dateText(c.sonIslemTarihi || c.createdAt),
          })),
        });
      }
      case "transactions":
      case "actionlogs": {
        const suffix = hasMonthFilter ? `-${year}-${pad2(month)}` : "";
        const txQuery = { tenantId, isDeleted: false };
        if (monthRange) {
          txQuery.tarih = {
            $gte: new Date(monthRange[0]),
            $lte: new Date(monthRange[1]),
          };
        }
        const filteredTx = await Transaction.find(txQuery)
          .sort({ tarih: -1, createdAt: -1 })
          .lean();

        return res.json({
          sheetName: "İşlem Geçmişi",
          fileName: `islem-gecmisi${suffix}.xlsx`,
          rows: filteredTx.map((t) => {
            const isSale = t.islemTuru === "Satış";
            const detailText = isSale
              ? lineSummary(t) || t.urunBilgisi || "Ürün Satışı"
              : t.aciklama || "Cari Tahsilat";
            return {
              "Tarih & Saat": dateTimeText(t.tarih || t.createdAt),
              Personel: t.personelAdi || "Mağaza Yetkilisi",
              "Müşteri No": t.musteriNo || "-",
              Müşteri: t.musteriAdSoyad || "-",
              "İşlem Türü": t.islemTuru || "Satış",
              "Detay / Ürün Kodu": detailText,
              "Ödeme Yöntemi": t.odemeYontemi || "-",
              "İşlem Tutarı (₺)": isSale
                ? num(t.toplamTutar, 0)
                : num(t.odenenTutar ?? t.tutar ?? t.toplamTutar ?? 0),
              "Peşinat / Ödenen (₺)": num(t.alinanTutar ?? t.pesinat ?? 0),
              "Kalan Borç (₺)": num(t.kalanBorc ?? t.kalanHesap ?? 0),
            };
          }),
        });
      }
      default:
        return res.status(400).json({ message: "Geçersiz dışa aktarma türü." });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDailyReport,
  getMonthlyReport,
  sendReminder,
  getExportRows,
};
