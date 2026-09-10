const Product = require("../models/Product");
const StockHistory = require("../models/StockHistory");
const { getTenantId, getUserId, withTenant } = require("../utils/tenantScope");
const { logAction } = require("../utils/auditLogger");

// ─── Yardımcı ─────────────────────────────────────────────────────────────────
const activeProducts = (req, extra = {}) =>
  withTenant(req, { isDeleted: false, ...extra });

// ─── Ürünleri Listele ─────────────────────────────────────────────────────────
const getProducts = async (req, res) => {
  try {
    const products = await Product.find(activeProducts(req))
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Ürünler getirilirken hata oluştu", error: error.message });
  }
};

// ─── Ürün Oluştur ─────────────────────────────────────────────────────────────
const createProduct = async (req, res) => {
  try {
    const {
      ad,
      kategori,
      barkod,
      seriNo,
      alisFiyati,
      satisFiyati,
      mevcutStok,
      kritikStokSeviyesi,
    } = req.body;

    if (!ad || !ad.trim()) {
      return res.status(400).json({ message: "Ürün adı zorunludur" });
    }

    const product = await Product.create({
      tenantId: getTenantId(req),
      createdBy: getUserId(req),
      ad: ad.trim(),
      kategori: (kategori || "").trim(),
      barkod: (barkod || "").trim(),
      seriNo: (seriNo || "").trim(),
      alisFiyati: Number(alisFiyati) || 0,
      satisFiyati: Number(satisFiyati) || 0,
      mevcutStok: Number(mevcutStok) || 0,
      kritikStokSeviyesi: Number(kritikStokSeviyesi) ?? 5,
      garantiSuresi: Number(req.body.garantiSuresi) || 0,
      tedarikci: (req.body.tedarikci || "").trim(),
    });

    logAction(req, "URUN_EKLE", "Product", product._id, { ad: product.ad });
    res.status(201).json(product);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Bu barkod zaten kayıtlı" });
    }
    res.status(500).json({ message: "Ürün oluşturulurken hata oluştu", error: error.message });
  }
};

// ─── Ürün Güncelle ────────────────────────────────────────────────────────────
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findOne(activeProducts(req, { _id: req.params.id }));

    if (!product) {
      return res.status(404).json({ message: "Ürün bulunamadı" });
    }

    const allowed = [
      "ad",
      "kategori",
      "barkod",
      "seriNo",
      "alisFiyati",
      "satisFiyati",
      "kritikStokSeviyesi",
      "garantiSuresi",
      "tedarikci",
    ];

    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        product[field] =
          typeof req.body[field] === "string"
            ? req.body[field].trim()
            : Number(req.body[field]);
      }
    });

    await product.save();
    logAction(req, "URUN_GUNCELLE", "Product", product._id, { ad: product.ad });
    res.status(200).json(product);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Bu barkod zaten kayıtlı" });
    }
    res.status(500).json({ message: "Ürün güncellenirken hata oluştu", error: error.message });
  }
};

// ─── Ürün Soft-Delete ─────────────────────────────────────────────────────────
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOne(activeProducts(req, { _id: req.params.id }));

    if (!product) {
      return res.status(404).json({ message: "Ürün bulunamadı" });
    }

    product.isDeleted = true;
    await product.save();
    res.status(200).json({ message: "Ürün silindi" });
  } catch (error) {
    res.status(500).json({ message: "Ürün silinirken hata oluştu", error: error.message });
  }
};

// ─── Stok Hareketi Ekle (Giriş / Çıkış / Transfer) ───────────────────────────
const addStockMovement = async (req, res) => {
  try {
    const { productId, hareketTipi, miktar, aciklama } = req.body;

    if (!productId || !hareketTipi || !miktar) {
      return res
        .status(400)
        .json({ message: "productId, hareketTipi ve miktar zorunludur" });
    }

    const allowedTypes = ["Giriş", "Çıkış", "Transfer"];
    if (!allowedTypes.includes(hareketTipi)) {
      return res.status(400).json({ message: "Geçersiz hareketTipi" });
    }

    const normalizedMiktar = Number(miktar);
    if (!Number.isFinite(normalizedMiktar) || normalizedMiktar < 1) {
      return res.status(400).json({ message: "miktar en az 1 olmalıdır" });
    }

    const product = await Product.findOne(activeProducts(req, { _id: productId }));

    if (!product) {
      return res.status(404).json({ message: "Ürün bulunamadı" });
    }

    const oncekiStok = product.mevcutStok;
    let sonrakiStok = oncekiStok;

    if (hareketTipi === "Giriş") {
      sonrakiStok = oncekiStok + normalizedMiktar;
    } else if (hareketTipi === "Çıkış" || hareketTipi === "Transfer") {
      if (oncekiStok < normalizedMiktar) {
        return res.status(400).json({
          message: `Yetersiz stok. Mevcut: ${oncekiStok}, istenen çıkış: ${normalizedMiktar}`,
        });
      }
      sonrakiStok = oncekiStok - normalizedMiktar;
    }

    // Önce stok geçmişini kaydet
    const history = await StockHistory.create({
      tenantId: getTenantId(req),
      performedBy: getUserId(req),
      productId: product._id,
      hareketTipi,
      miktar: normalizedMiktar,
      oncekiStok,
      sonrakiStok,
      aciklama: (aciklama || "").trim(),
    });

    // Ardından ürün stokunu güncelle
    product.mevcutStok = sonrakiStok;
    await product.save();

    res.status(201).json({ history, product });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Stok hareketi eklenirken hata oluştu", error: error.message });
  }
};

// ─── Stok Hareketlerini Listele ───────────────────────────────────────────────
const getStockHistory = async (req, res) => {
  try {
    const filter = withTenant(req, { isDeleted: false });

    if (req.query.productId) {
      filter.productId = req.query.productId;
    }

    const history = await StockHistory.find(filter)
      .populate("performedBy", "ad soyad")
      .populate("productId", "ad barkod")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.status(200).json(history);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Stok hareketleri getirilirken hata oluştu", error: error.message });
  }
};

// ─── Stok Hareketini Geri Al (Undo / İptal) ──────────────────────────────────
const cancelStockMovement = async (req, res) => {
  try {
    const history = await StockHistory.findOne(
      withTenant(req, { _id: req.params.id, isDeleted: false }),
    );

    if (!history) {
      return res.status(404).json({ message: "Stok hareketi bulunamadı veya zaten iptal edilmiş" });
    }

    const product = await Product.findOne(activeProducts(req, { _id: history.productId }));

    if (!product) {
      return res.status(404).json({ message: "İlgili ürün bulunamadı" });
    }

    // Hareketi tersine çevir
    const { hareketTipi, miktar, oncekiStok } = history;

    // Güvenli tersine çevirme: oncekiStok snapshot'ına geri dön
    // (sadece en son kayıt iptal edilebilir mantığı, burada basit ters işlem)
    if (hareketTipi === "Giriş") {
      if (product.mevcutStok < miktar) {
        return res.status(400).json({
          message:
            "Bu girişi geri almak için yeterli stok yok (stok sonradan tüketilmiş olabilir)",
        });
      }
      product.mevcutStok -= miktar;
    } else if (hareketTipi === "Çıkış" || hareketTipi === "Transfer") {
      product.mevcutStok += miktar;
    }

    // Soft-delete ile pasife çek
    history.isDeleted = true;
    history.cancelledBy = getUserId(req);
    history.cancelledAt = new Date();

    await history.save();
    await product.save();

    res.status(200).json({
      message: "Stok hareketi başarıyla iptal edildi",
      history,
      product,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Stok hareketi iptal edilirken hata oluştu", error: error.message });
  }
};

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  addStockMovement,
  getStockHistory,
  cancelStockMovement,
};
