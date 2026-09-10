const XLSX = require("xlsx");
const multer = require("multer");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const ActionLog = require("../models/ActionLog");
const { withTenant, getTenantId, getUserId } = require("../utils/tenantScope");
const { logAction } = require("../utils/auditLogger");

// Multer: xlsx dosyasını memory'de tut
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ─── Yardımcı ─────────────────────────────────────────────────────────────────

const buildXlsxResponse = (res, data, sheetName, filename) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buffer);
};

// ─── EXPORT ───────────────────────────────────────────────────────────────────

// GET /api/export/products
const exportProducts = async (req, res) => {
  try {
    const products = await Product.find(withTenant(req, { isDeleted: false })).lean();

    const data = products.map((p) => ({
      "Ürün Adı": p.ad,
      Kategori: p.kategori || "",
      Barkod: p.barkod || "",
      "Seri No": p.seriNo || "",
      "Alış Fiyatı (₺)": p.alisFiyati || 0,
      "Satış Fiyatı (₺)": p.satisFiyati || 0,
      "Mevcut Stok": p.mevcutStok || 0,
      "Kritik Stok Seviyesi": p.kritikStokSeviyesi || 5,
      "Garanti Süresi (Ay)": p.garantiSuresi || 0,
      Tedarikçi: p.tedarikci || "",
      "Oluşturma Tarihi": p.createdAt ? new Date(p.createdAt).toLocaleDateString("tr-TR") : "",
    }));

    buildXlsxResponse(res, data, "Ürünler", "urunler.xlsx");
  } catch (error) {
    res.status(500).json({ message: "Export hatası", error: error.message });
  }
};

// GET /api/export/customers
const exportCustomers = async (req, res) => {
  try {
    const customers = await Customer.find(withTenant(req, { isDeleted: false })).lean();

    const data = customers.map((c) => ({
      "Müşteri No": c.musteriNo || "",
      Ad: c.ad,
      Soyad: c.soyad,
      "TC Kimlik": c.tcKimlik || "",
      Telefon: c.telefon || "",
      Adres: c.adres || "",
      "Kalan Bakiye (₺)": c.toplamKalanBakiye || 0,
      "Kayıt Tarihi": c.createdAt ? new Date(c.createdAt).toLocaleDateString("tr-TR") : "",
    }));

    buildXlsxResponse(res, data, "Müşteriler", "musteriler.xlsx");
  } catch (error) {
    res.status(500).json({ message: "Export hatası", error: error.message });
  }
};

// GET /api/export/debtors — Geciken alacaklar (kalan bakiye > 0)
const exportDebtors = async (req, res) => {
  try {
    const customers = await Customer.find(
      withTenant(req, { isDeleted: false, toplamKalanBakiye: { $gt: 0 } }),
    ).sort({ toplamKalanBakiye: -1 }).lean();

    const data = customers.map((c) => ({
      "Müşteri No": c.musteriNo || "",
      Ad: c.ad,
      Soyad: c.soyad,
      "TC Kimlik": c.tcKimlik || "",
      Telefon: c.telefon || "",
      "Borç (₺)": c.toplamKalanBakiye || 0,
      "Kayıt Tarihi": c.createdAt ? new Date(c.createdAt).toLocaleDateString("tr-TR") : "",
    }));

    buildXlsxResponse(res, data, "Borçlular", "borclular.xlsx");
  } catch (error) {
    res.status(500).json({ message: "Export hatası", error: error.message });
  }
};

// GET /api/export/actionlogs — Audit log export
const exportActionLogs = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = withTenant(req, {});
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const logs = await ActionLog.find(filter).sort({ createdAt: -1 }).limit(5000).lean();

    const data = logs.map((l) => ({
      Tarih: new Date(l.createdAt).toLocaleString("tr-TR"),
      "Kullanıcı": l.userName || "Bilinmiyor",
      İşlem: l.action,
      "Kayıt Türü": l.entityType || "",
      "Kayıt ID": l.entityId?.toString() || "",
      Detay: JSON.stringify(l.details || {}),
    }));

    buildXlsxResponse(res, data, "İşlem Geçmişi", "islem-gecmisi.xlsx");
  } catch (error) {
    res.status(500).json({ message: "Export hatası", error: error.message });
  }
};

// ─── IMPORT ───────────────────────────────────────────────────────────────────

// POST /api/import/products — xlsx dosyasından toplu ürün ekleme
const importProducts = [
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Dosya yüklenmedi" });
      }

      const wb = XLSX.read(req.file.buffer, { type: "buffer" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);

      if (!rows.length) {
        return res.status(400).json({ message: "Dosyada veri bulunamadı" });
      }

      const toCreate = rows.map((row) => ({
        tenantId: getTenantId(req),
        createdBy: getUserId(req),
        ad: String(row["Ürün Adı"] || row["urun_adi"] || "").trim(),
        kategori: String(row["Kategori"] || row["kategori"] || "").trim(),
        barkod: String(row["Barkod"] || row["barkod"] || "").trim(),
        seriNo: String(row["Seri No"] || row["seri_no"] || "").trim(),
        alisFiyati: Number(row["Alış Fiyatı (₺)"] || row["alis_fiyati"] || 0),
        satisFiyati: Number(row["Satış Fiyatı (₺)"] || row["satis_fiyati"] || 0),
        mevcutStok: Number(row["Mevcut Stok"] || row["mevcut_stok"] || 0),
        kritikStokSeviyesi: Number(row["Kritik Stok Seviyesi"] || row["kritik_stok"] || 5),
        garantiSuresi: Number(row["Garanti Süresi (Ay)"] || row["garanti_suresi"] || 0),
        tedarikci: String(row["Tedarikçi"] || row["tedarikci"] || "").trim(),
      })).filter((p) => p.ad); // ad boş olanları atla

      if (!toCreate.length) {
        return res.status(400).json({ message: "Geçerli ürün satırı bulunamadı. 'Ürün Adı' sütunu zorunludur." });
      }

      // insertMany ile toplu ekle (duplicate barkod'ları atla)
      const result = await Product.insertMany(toCreate, { ordered: false }).catch((err) => {
        if (err.code === 11000) {
          return err.result; // Kısmi başarı — duplicate'leri atla
        }
        throw err;
      });

      logAction(req, "URUN_EKLE", "Product", null, {
        importedCount: Array.isArray(result) ? result.length : result?.nInserted || 0,
        source: "xlsx-import",
      });

      res.status(201).json({
        message: `${Array.isArray(result) ? result.length : "?"} ürün başarıyla içe aktarıldı`,
        inserted: Array.isArray(result) ? result.length : result?.nInserted,
      });
    } catch (error) {
      res.status(500).json({ message: "Import hatası", error: error.message });
    }
  },
];

module.exports = {
  exportProducts,
  exportCustomers,
  exportDebtors,
  exportActionLogs,
  importProducts,
};
