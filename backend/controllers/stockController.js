const Stock = require("../models/Stock");
const { getTenantId, getUserId, withTenant } = require("../utils/tenantScope");

const getStocks = async (req, res) => {
  try {
    const stocks = await Stock.find(withTenant(req)).sort({ createdAt: -1 });
    res.status(200).json(stocks);
  } catch (error) {
    res.status(500).json({
      message: "Server error while fetching stocks",
      error: error.message,
    });
  }
};

const addOrUpdateStock = async (req, res) => {
  try {
    const { urunKodu, marka, adet, serialNumbers } = req.body;

    if (!urunKodu || adet === undefined) {
      return res
        .status(400)
        .json({ message: "urunKodu and adet are required" });
    }

    const normalizedAdet = Number(adet) || 0;
    const normalizedCode = String(urunKodu).trim();

    let stock = await Stock.findOne(withTenant(req, { urunKodu: normalizedCode }));

    if (stock) {
      stock.adet = Number(stock.adet || 0) + normalizedAdet;
      if (marka) {
        stock.marka = marka;
      }
      if (Array.isArray(serialNumbers) && serialNumbers.length > 0) {
        stock.serialNumbers = [
          ...new Set([
            ...(stock.serialNumbers || []),
            ...serialNumbers.map((value) => String(value).trim()).filter(Boolean),
          ]),
        ];
      }
      await stock.save();
      return res.status(200).json(stock);
    }

    stock = await Stock.create({
      tenantId: getTenantId(req),
      createdBy: getUserId(req),
      urunKodu: normalizedCode,
      marka: marka || "Profilo",
      adet: normalizedAdet,
      serialNumbers: Array.isArray(serialNumbers)
        ? serialNumbers.map((value) => String(value).trim()).filter(Boolean)
        : [],
    });

    res.status(201).json(stock);
  } catch (error) {
    res.status(500).json({
      message: "Server error while adding or updating stock",
      error: error.message,
    });
  }
};

const updateStockQuantity = async (req, res) => {
  try {
    const { adet } = req.body;

    if (adet === undefined) {
      return res.status(400).json({ message: "adet is required" });
    }

    const normalizedAdet = Number(adet);

    if (!Number.isFinite(normalizedAdet) || normalizedAdet < 0) {
      return res.status(400).json({
        message: "adet must be a valid number greater than or equal to 0",
      });
    }

    const stock = await Stock.findOne(withTenant(req, { _id: req.params.id }));

    if (!stock) {
      return res.status(404).json({ message: "Stock not found" });
    }

    const minimumAllowedAdet = Number(stock.envanterdekiAdet || 0);

    if (normalizedAdet < minimumAllowedAdet) {
      return res.status(400).json({
        message: `Toplam stok, envanterdeki adet (${minimumAllowedAdet}) altına düşürülemez`,
      });
    }

    stock.adet = normalizedAdet;
    await stock.save();

    return res.status(200).json(stock);
  } catch (error) {
    return res.status(500).json({
      message: "Server error while updating stock quantity",
      error: error.message,
    });
  }
};

module.exports = {
  getStocks,
  addOrUpdateStock,
  updateStockQuantity,
};
