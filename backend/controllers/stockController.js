const Stock = require("../models/Stock");
const Product = require("../models/Product");
const StockHistory = require("../models/StockHistory");
const { str, num, isObjectId } = require("../utils/helpers");
const { syncProductFromStock } = require("../services/inventorySync");
const { logAction } = require("../utils/auditLogger");

// GET /api/stocks
const getStocks = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const [stocks, products] = await Promise.all([
      Stock.find({ tenantId }).sort({ createdAt: -1 }),
      Product.find({ tenantId, isDeleted: false }),
    ]);

    const stockByCode = new Map(stocks.map((s) => [s.urunKodu, s]));
    const missingProducts = products.filter((p) => p.urunKodu && !stockByCode.has(p.urunKodu));

    if (missingProducts.length > 0) {
      for (const p of missingProducts) {
        const created = await Stock.create({
          tenantId,
          createdBy: p.createdBy || req.user.userId,
          urunKodu: p.urunKodu,
          urunAdi: p.ad,
          marka: p.marka || "Belirtilmedi",
          kategori: p.kategori || "",
          alisFiyati: num(p.alisFiyati, 0),
          satisFiyati: num(p.satisFiyati, 0),
          adet: Math.max(0, num(p.mevcutStok, 0)),
          envanterdekiAdet: 0,
          serialNumbers: [],
        });
        stocks.unshift(created);
      }
    }

    return res.json(stocks);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/stocks
const addOrUpdateStock = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const code = str(req.body?.urunKodu);
    if (!code || req.body?.adet === undefined) {
      return res.status(400).json({ message: "urunKodu ve adet zorunludur." });
    }

    const adet = num(req.body.adet, 0);
    const serials = Array.isArray(req.body.serialNumbers)
      ? req.body.serialNumbers.map(str).filter(Boolean)
      : [];

    const product = await Product.findOne({ tenantId, urunKodu: code, isDeleted: false });
    let stock = await Stock.findOne({ tenantId, urunKodu: code });

    if (stock) {
      const previous = num(stock.adet, 0);
      stock.adet = Math.max(0, previous + adet);
      if (req.body.marka) stock.marka = str(req.body.marka);
      if (product) {
        stock.urunAdi = product.ad;
        stock.kategori = product.kategori || stock.kategori;
        stock.alisFiyati = num(product.alisFiyati, stock.alisFiyati);
        stock.satisFiyati = num(product.satisFiyati, stock.satisFiyati);
      }
      if (serials.length) {
        stock.serialNumbers = [...new Set([...(stock.serialNumbers || []), ...serials])];
      }
      await stock.save();
    } else {
      stock = await Stock.create({
        tenantId,
        createdBy: req.user.userId,
        urunKodu: code,
        urunAdi: product?.ad || str(req.body.urunAdi) || code,
        marka: str(req.body.marka) || product?.marka || "Profilo",
        kategori: product?.kategori || str(req.body.kategori),
        alisFiyati: num(req.body.alisFiyati ?? product?.alisFiyati, 0),
        satisFiyati: num(req.body.satisFiyati ?? product?.satisFiyati, 0),
        adet: Math.max(0, adet),
        envanterdekiAdet: 0,
        serialNumbers: serials,
      });
    }

    if (product) {
      await syncProductFromStock(tenantId, code, stock.adet);
      if (adet > 0) {
        await StockHistory.create({
          tenantId,
          performedBy: req.user.userId,
          productId: product._id,
          urunKodu: code,
          hareketTipi: "Giriş",
          miktar: adet,
          oncekiStok: Math.max(0, stock.adet - adet),
          sonrakiStok: stock.adet,
          aciklama: "Stok sayfasından ekleme",
        });
      }
    }

    logAction(req.user, "STOK_EKLE", "Stock", stock._id, { urunKodu: code, adet });
    return res.status(201).json(stock);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PATCH /api/stocks/:id/quantity & PUT /api/stocks/:id
const updateStockQuantity = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ message: "Geçersiz stok kimliği." });
    }
    if (req.body?.adet === undefined) {
      return res.status(400).json({ message: "adet zorunludur." });
    }

    const adet = Number(req.body.adet);
    if (!Number.isFinite(adet) || adet < 0) {
      return res.status(400).json({ message: "Adet 0 veya daha büyük geçerli bir sayı olmalıdır." });
    }

    const stock = await Stock.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!stock) {
      return res.status(404).json({ message: "Stock not found" });
    }

    const minimum = num(stock.envanterdekiAdet, 0);
    if (adet < minimum) {
      return res.status(400).json({
        message: `Toplam stok, envanterdeki adet (${minimum}) altına düşürülemez`,
      });
    }

    const previous = stock.adet;
    stock.adet = adet;
    await stock.save();
    await syncProductFromStock(req.user.tenantId, stock.urunKodu, stock.adet);

    logAction(req.user, "STOK_GUNCELLE", "Stock", stock._id, {
      urunKodu: stock.urunKodu,
      onceki: previous,
      yeni: adet,
    });

    return res.json(stock);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getStocks,
  addOrUpdateStock,
  updateStockQuantity,
};
