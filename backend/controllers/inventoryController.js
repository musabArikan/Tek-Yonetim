const Transaction = require("../models/Transaction");
const Stock = require("../models/Stock");
const { withTenant, activeTransactions } = require("../utils/tenantScope");

const parseNumber = (value) => {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
};

const getPendingInventory = async (req, res) => {
  try {
    const transactions = await Transaction.find(
      activeTransactions(req, {
        urunler: {
          $elemMatch: {
            $or: [
              { envanterdeMi: true },
              { envanterdeBekleyenAdet: { $gt: 0 } },
            ],
          },
        },
      }),
    )
      .populate("musteriId", "ad soyad telefon")
      .sort({ createdAt: -1 });

    const normalizedTransactions = transactions.map((transaction) => {
      const normalizedTransaction = transaction.toObject();
      normalizedTransaction.urunler = (normalizedTransaction.urunler || []).map(
        (item) => {
          const bekleyenAdet = parseNumber(
            item.envanterdeBekleyenAdet !== undefined
              ? item.envanterdeBekleyenAdet
              : item.envanterdeMi
                ? item.adet
                : 0,
          );

          return {
            ...item,
            adet: item.envanterdeMi ? bekleyenAdet : parseNumber(item.adet),
            envanterdeBekleyenAdet: bekleyenAdet,
            envanterdeMi: bekleyenAdet > 0,
          };
        },
      );
      return normalizedTransaction;
    });

    res.status(200).json(normalizedTransactions);
  } catch (error) {
    res.status(500).json({
      message: "Server error while fetching pending inventory",
      error: error.message,
    });
  }
};

const deliverInventoryItem = async (req, res) => {
  try {
    const { transactionId, urunKodu, teslimEdilecekAdet } = req.body;

    if (!transactionId || !urunKodu || teslimEdilecekAdet === undefined) {
      return res.status(400).json({
        message: "transactionId, urunKodu and teslimEdilecekAdet are required",
      });
    }

    const transaction = await Transaction.findOne(
      activeTransactions(req, { _id: transactionId }),
    );
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const inventoryItem = transaction.urunler.find(
      (item) => item.urunKodu === urunKodu,
    );
    if (!inventoryItem) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    const currentBekleyenAdet = parseNumber(
      inventoryItem.envanterdeBekleyenAdet !== undefined
        ? inventoryItem.envanterdeBekleyenAdet
        : inventoryItem.envanterdeMi
          ? inventoryItem.adet
          : 0,
    );
    const deliveredAdet = Number(teslimEdilecekAdet);

    if (deliveredAdet <= 0 || deliveredAdet > currentBekleyenAdet) {
      return res.status(400).json({ message: "Teslim edilecek adet geçersiz" });
    }

    const stock = await Stock.findOne(
      withTenant(req, { urunKodu }),
    );
    if (!stock) {
      return res.status(404).json({ message: "Stock not found" });
    }

    const mevcutAdet = parseNumber(stock.adet);
    const mevcutEnvanterAdedi = parseNumber(stock.envanterdekiAdet);

    if (deliveredAdet > mevcutAdet || deliveredAdet > mevcutEnvanterAdedi) {
      return res.status(400).json({
        message: "Stokta teslim edilecek kadar envanter ürünü yok",
      });
    }

    stock.adet = mevcutAdet - deliveredAdet;
    stock.envanterdekiAdet = mevcutEnvanterAdedi - deliveredAdet;

    inventoryItem.envanterdeBekleyenAdet = currentBekleyenAdet - deliveredAdet;
    inventoryItem.envanterdeMi = inventoryItem.envanterdeBekleyenAdet > 0;

    await stock.save();
    await transaction.save();

    res.status(200).json(transaction);
  } catch (error) {
    res.status(500).json({
      message: "Server error while delivering inventory item",
      error: error.message,
    });
  }
};

module.exports = {
  getPendingInventory,
  deliverInventoryItem,
};
