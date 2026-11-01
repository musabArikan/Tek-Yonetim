const Product = require("../models/Product");
const Stock = require("../models/Stock");
const StockHistory = require("../models/StockHistory");
const Tenant = require("../models/Tenant");
const User = require("../models/User");
const { DEFAULT_BRANDS, DEFAULT_CATEGORIES } = require("../utils/constants");
const { str, num, isObjectId, uniqueStringsTr } = require("../utils/helpers");
const { userRef } = require("../utils/serializers");
const { syncStockFromProduct } = require("../services/inventorySync");
const { logAction } = require("../utils/auditLogger");

const assertUniqueBarcodeAndCode = async (tenantId, { barkod, urunKodu }, exceptId = null) => {
  if (barkod) {
    const query = { tenantId, barkod, isDeleted: false };
    if (exceptId) query._id = { $ne: exceptId };
    const dup = await Product.findOne(query);
    if (dup) {
      const err = new Error("Bu barkod zaten kayıtlı");
      err.status = 409;
      throw err;
    }
  }
  if (urunKodu) {
    const query = { tenantId, urunKodu, isDeleted: false };
    if (exceptId) query._id = { $ne: exceptId };
    const dup = await Product.findOne(query);
    if (dup) {
      const err = new Error("Bu ürün kodu zaten kayıtlı");
      err.status = 409;
      throw err;
    }
  }
};

// GET /api/products
const getProducts = async (req, res) => {
  try {
    const products = await Product.find({
      tenantId: req.user.tenantId,
      isDeleted: false,
    }).sort({ createdAt: -1 });
    return res.json(products);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/products/brands
const getBrands = async (req, res) => {
  try {
    const [tenant, products] = await Promise.all([
      Tenant.findById(req.user.tenantId).select("customBrands"),
      Product.find({ tenantId: req.user.tenantId, isDeleted: false }).select("marka"),
    ]);
    const custom = Array.isArray(tenant?.customBrands) ? tenant.customBrands : [];
    const fromProducts = products.map((p) => p.marka).filter(Boolean);
    return res.json(uniqueStringsTr([...DEFAULT_BRANDS, ...custom, ...fromProducts]));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/products/brands
const addBrand = async (req, res) => {
  try {
    const clean = str(req.body?.name ?? req.body?.marka ?? req.body?.brand);
    if (!clean) {
      return res.status(400).json({ message: "Marka adı boş olamaz." });
    }
    const tenant = await Tenant.findById(req.user.tenantId);
    if (tenant) {
      tenant.customBrands = uniqueStringsTr([...(tenant.customBrands || []), clean]);
      await tenant.save();
    }
    const products = await Product.find({ tenantId: req.user.tenantId, isDeleted: false }).select(
      "marka",
    );
    const fromProducts = products.map((p) => p.marka).filter(Boolean);
    const list = uniqueStringsTr([
      ...DEFAULT_BRANDS,
      ...(tenant?.customBrands || [clean]),
      ...fromProducts,
    ]);
    return res.status(201).json(list);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/products/categories
const getCategories = async (req, res) => {
  try {
    const [tenant, products] = await Promise.all([
      Tenant.findById(req.user.tenantId).select("customCategories"),
      Product.find({ tenantId: req.user.tenantId, isDeleted: false }).select("kategori"),
    ]);
    const custom = Array.isArray(tenant?.customCategories) ? tenant.customCategories : [];
    const fromProducts = products.map((p) => p.kategori).filter(Boolean);
    return res.json(uniqueStringsTr([...DEFAULT_CATEGORIES, ...custom, ...fromProducts]));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/products/categories
const addCategory = async (req, res) => {
  try {
    const clean = str(req.body?.name ?? req.body?.kategori ?? req.body?.category);
    if (!clean) {
      return res.status(400).json({ message: "Kategori adı boş olamaz." });
    }
    const tenant = await Tenant.findById(req.user.tenantId);
    if (tenant) {
      tenant.customCategories = uniqueStringsTr([...(tenant.customCategories || []), clean]);
      await tenant.save();
    }
    const products = await Product.find({ tenantId: req.user.tenantId, isDeleted: false }).select(
      "kategori",
    );
    const fromProducts = products.map((p) => p.kategori).filter(Boolean);
    const list = uniqueStringsTr([
      ...DEFAULT_CATEGORIES,
      ...(tenant?.customCategories || [clean]),
      ...fromProducts,
    ]);
    return res.status(201).json(list);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/products
const createProduct = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const ad = str(req.body?.ad);
    if (!ad) {
      return res.status(400).json({ message: "Ürün adı zorunludur." });
    }

    const barkod = str(req.body?.barkod);
    const urunKodu =
      str(req.body?.urunKodu) ||
      barkod ||
      `URN-${Date.now().toString(36).slice(-5).toUpperCase()}`;

    await assertUniqueBarcodeAndCode(tenantId, { barkod: barkod || urunKodu, urunKodu });

    const marka = str(req.body?.marka);
    const kategori = str(req.body?.kategori);

    if (marka || kategori) {
      const tenant = await Tenant.findById(tenantId);
      if (tenant) {
        if (marka) {
          tenant.customBrands = uniqueStringsTr([...(tenant.customBrands || []), marka]);
        }
        if (kategori) {
          tenant.customCategories = uniqueStringsTr([
            ...(tenant.customCategories || []),
            kategori,
          ]);
        }
        await tenant.save();
      }
    }

    const product = await Product.create({
      tenantId,
      createdBy: req.user.userId,
      urunKodu,
      marka,
      ad,
      kategori,
      barkod: barkod || urunKodu,
      seriNo: str(req.body?.seriNo),
      alisFiyati: Math.max(0, num(req.body?.alisFiyati, 0)),
      satisFiyati: Math.max(0, num(req.body?.satisFiyati, 0)),
      mevcutStok: Math.max(0, num(req.body?.mevcutStok, 0)),
      kritikStokSeviyesi: Math.max(0, num(req.body?.kritikStokSeviyesi, 5)),
      garantiSuresi: Math.max(0, num(req.body?.garantiSuresi, 0)),
      tedarikci: str(req.body?.tedarikci),
    });

    const existingStock = await Stock.findOne({ tenantId, urunKodu: product.urunKodu });
    if (existingStock) {
      existingStock.urunAdi = product.ad;
      existingStock.marka = product.marka || existingStock.marka || "Belirtilmedi";
      existingStock.kategori = product.kategori;
      existingStock.alisFiyati = product.alisFiyati;
      existingStock.satisFiyati = product.satisFiyati;
      existingStock.adet = product.mevcutStok;
      await existingStock.save();
    } else if (product.urunKodu) {
      await Stock.create({
        tenantId,
        createdBy: req.user.userId,
        urunKodu: product.urunKodu,
        urunAdi: product.ad,
        marka: product.marka || "Belirtilmedi",
        kategori: product.kategori,
        alisFiyati: product.alisFiyati,
        satisFiyati: product.satisFiyati,
        adet: product.mevcutStok,
        envanterdekiAdet: 0,
        serialNumbers: [],
      });
    }

    if (product.mevcutStok > 0) {
      await StockHistory.create({
        tenantId,
        performedBy: req.user.userId,
        productId: product._id,
        urunKodu: product.urunKodu,
        hareketTipi: "Giriş",
        miktar: product.mevcutStok,
        oncekiStok: 0,
        sonrakiStok: product.mevcutStok,
        aciklama: "İlk ürün stok girişi",
      });
    }

    logAction(req.user, "URUN_EKLE", "Product", product._id, {
      ad: product.ad,
      marka: product.marka,
      kategori: product.kategori,
      urunKodu: product.urunKodu,
    });

    return res.status(201).json(product);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message });
  }
};

// PUT /api/products/:id
const updateProduct = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ message: "Geçersiz ürün kimliği." });
    }
    const tenantId = req.user.tenantId;
    const product = await Product.findOne({
      _id: req.params.id,
      tenantId,
      isDeleted: false,
    });
    if (!product) {
      return res.status(404).json({ message: "Ürün bulunamadı." });
    }

    const nextBarkod =
      req.body?.barkod !== undefined ? str(req.body.barkod) : product.barkod;
    const nextCode =
      req.body?.urunKodu !== undefined ? str(req.body.urunKodu) : product.urunKodu;

    await assertUniqueBarcodeAndCode(
      tenantId,
      { barkod: nextBarkod, urunKodu: nextCode },
      product._id,
    );

    const oldCode = product.urunKodu;
    const allowedStrings = [
      "ad",
      "marka",
      "kategori",
      "urunKodu",
      "barkod",
      "seriNo",
      "tedarikci",
    ];
    const allowedNumbers = [
      "alisFiyati",
      "satisFiyati",
      "mevcutStok",
      "kritikStokSeviyesi",
      "garantiSuresi",
    ];

    allowedStrings.forEach((field) => {
      if (req.body?.[field] !== undefined) {
        product[field] = str(req.body[field]);
      }
    });
    allowedNumbers.forEach((field) => {
      if (req.body?.[field] !== undefined) {
        product[field] = Math.max(0, num(req.body[field], 0));
      }
    });

    if (!product.urunKodu && product.barkod) {
      product.urunKodu = product.barkod;
    }

    await product.save();

    if (product.marka || product.kategori) {
      const tenant = await Tenant.findById(tenantId);
      if (tenant) {
        if (product.marka) {
          tenant.customBrands = uniqueStringsTr([
            ...(tenant.customBrands || []),
            product.marka,
          ]);
        }
        if (product.kategori) {
          tenant.customCategories = uniqueStringsTr([
            ...(tenant.customCategories || []),
            product.kategori,
          ]);
        }
        await tenant.save();
      }
    }

    let stock =
      (await Stock.findOne({ tenantId, urunKodu: oldCode })) ||
      (await Stock.findOne({ tenantId, urunKodu: product.urunKodu }));

    if (stock) {
      stock.urunKodu = product.urunKodu || stock.urunKodu;
      stock.urunAdi = product.ad;
      stock.marka = product.marka || stock.marka;
      stock.kategori = product.kategori;
      stock.alisFiyati = product.alisFiyati;
      stock.satisFiyati = product.satisFiyati;
      stock.adet = Math.max(num(product.mevcutStok, 0), num(stock.envanterdekiAdet, 0));
      await stock.save();
    } else if (product.urunKodu) {
      await Stock.create({
        tenantId,
        createdBy: req.user.userId,
        urunKodu: product.urunKodu,
        urunAdi: product.ad,
        marka: product.marka || "Belirtilmedi",
        kategori: product.kategori,
        alisFiyati: product.alisFiyati,
        satisFiyati: product.satisFiyati,
        adet: product.mevcutStok,
        envanterdekiAdet: 0,
        serialNumbers: [],
      });
    }

    logAction(req.user, "URUN_GUNCELLE", "Product", product._id, {
      ad: product.ad,
      marka: product.marka,
      urunKodu: product.urunKodu,
    });

    return res.json(product);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message });
  }
};

// DELETE /api/products/:id
const deleteProduct = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ message: "Geçersiz ürün kimliği." });
    }
    const tenantId = req.user.tenantId;
    const product = await Product.findOne({
      _id: req.params.id,
      tenantId,
      isDeleted: false,
    });
    if (!product) {
      return res.status(404).json({ message: "Ürün bulunamadı." });
    }

    product.isDeleted = true;
    await product.save();

    if (product.urunKodu) {
      await Stock.deleteMany({
        tenantId,
        urunKodu: product.urunKodu,
        envanterdekiAdet: 0,
      });
    }

    logAction(req.user, "URUN_SIL", "Product", product._id, { ad: product.ad });
    return res.json({ message: "Ürün silindi" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/products/movements
const getMovements = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const query = { tenantId, isDeleted: false };
    const productId = req.query?.productId;
    if (productId && isObjectId(productId)) {
      query.productId = productId;
    }

    const movements = await StockHistory.find(query).sort({ createdAt: -1 }).limit(200);
    const productIds = [
      ...new Set(
        movements
          .map((m) => (m.productId ? String(m.productId) : ""))
          .filter((id) => isObjectId(id)),
      ),
    ];
    const userIds = [
      ...new Set(
        movements
          .map((m) => (m.performedBy ? String(m.performedBy) : ""))
          .filter((id) => isObjectId(id)),
      ),
    ];

    const [products, users] = await Promise.all([
      productIds.length
        ? Product.find({ tenantId, _id: { $in: productIds } }).lean()
        : [],
      userIds.length
        ? User.find({ tenantId, _id: { $in: userIds } }).lean()
        : [],
    ]);

    const productById = new Map(
      products.map((p) => [
        String(p._id),
        { _id: p._id, id: String(p._id), ad: p.ad, barkod: p.barkod, urunKodu: p.urunKodu },
      ]),
    );
    const userById = new Map(users.map((u) => [String(u._id), userRef(u)]));

    return res.json(
      movements.map((m) => {
        const json = m.toJSON();
        return {
          ...json,
          performedBy: userById.get(String(m.performedBy)) || json.performedBy,
          productId: productById.get(String(m.productId)) || json.productId,
        };
      }),
    );
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/products/movements
const addMovement = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { productId, hareketTipi, miktar, aciklama } = req.body || {};

    if (!productId || !hareketTipi || miktar === undefined) {
      return res
        .status(400)
        .json({ message: "productId, hareketTipi ve miktar zorunludur." });
    }
    if (!["Giriş", "Çıkış", "Transfer"].includes(hareketTipi)) {
      return res.status(400).json({ message: "Geçersiz hareketTipi." });
    }

    const quantity = Number(miktar);
    if (!Number.isFinite(quantity) || quantity < 1) {
      return res.status(400).json({ message: "Miktar en az 1 olmalıdır." });
    }

    const product = await Product.findOne({
      _id: productId,
      tenantId,
      isDeleted: false,
    });
    if (!product) {
      return res.status(404).json({ message: "Ürün bulunamadı." });
    }

    const previous = num(product.mevcutStok, 0);
    if (hareketTipi !== "Giriş" && previous < quantity) {
      return res.status(400).json({
        message: `Yetersiz stok. Mevcut: ${previous}, istenen çıkış: ${quantity}`,
      });
    }

    const next = hareketTipi === "Giriş" ? previous + quantity : previous - quantity;
    const history = await StockHistory.create({
      tenantId,
      performedBy: req.user.userId,
      productId: product._id,
      urunKodu: product.urunKodu || "",
      hareketTipi,
      miktar: quantity,
      oncekiStok: previous,
      sonrakiStok: next,
      aciklama: str(aciklama),
    });

    product.mevcutStok = next;
    await product.save();
    await syncStockFromProduct(tenantId, product);

    logAction(req.user, "STOK_HAREKET", "StockHistory", history._id, {
      urun: product.ad,
      hareketTipi,
      miktar: quantity,
    });

    return res.status(201).json({ history, product });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/products/movements/:id/cancel & PATCH /api/products/movements/:id/cancel
const cancelMovement = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ message: "Geçersiz stok hareketi kimliği." });
    }
    const tenantId = req.user.tenantId;
    const history = await StockHistory.findOne({
      _id: req.params.id,
      tenantId,
      isDeleted: false,
    });
    if (!history) {
      return res
        .status(404)
        .json({ message: "Stok hareketi bulunamadı veya zaten iptal edilmiş." });
    }

    const product = await Product.findOne({
      _id: history.productId,
      tenantId,
      isDeleted: false,
    });
    if (!product) {
      return res.status(404).json({ message: "İlgili ürün bulunamadı." });
    }

    if (history.hareketTipi === "Giriş") {
      if (num(product.mevcutStok, 0) < num(history.miktar, 0)) {
        return res.status(400).json({
          message:
            "Bu girişi geri almak için yeterli stok yok (stok sonradan tüketilmiş olabilir).",
        });
      }
      product.mevcutStok = num(product.mevcutStok, 0) - num(history.miktar, 0);
    } else {
      product.mevcutStok = num(product.mevcutStok, 0) + num(history.miktar, 0);
    }

    history.isDeleted = true;
    history.cancelledBy = req.user.userId;
    history.cancelledAt = new Date();
    await history.save();
    await product.save();
    await syncStockFromProduct(tenantId, product);

    logAction(req.user, "STOK_HAREKET_IPTAL", "StockHistory", history._id, {
      urun: product.ad,
      hareketTipi: history.hareketTipi,
      miktar: history.miktar,
    });

    return res.json({
      message: "Stok hareketi başarıyla iptal edildi",
      history,
      product,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProducts,
  getBrands,
  addBrand,
  getCategories,
  addCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  getMovements,
  addMovement,
  cancelMovement,
};
