const Transaction = require("../models/Transaction");
const Customer = require("../models/Customer");
const Stock = require("../models/Stock");
const { str, num, isObjectId } = require("../utils/helpers");
const { customerRef } = require("../utils/serializers");
const { syncProductFromStock } = require("../services/inventorySync");
const { logAction } = require("../utils/auditLogger");

const pendingQuantity = (line = {}) =>
  num(
    line.envanterdeBekleyenAdet !== undefined
      ? line.envanterdeBekleyenAdet
      : line.envanterdeMi
        ? line.adet
        : 0,
  );

// GET /api/inventory/pending & GET /api/inventory
const getPendingInventory = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const transactions = await Transaction.find({
      tenantId,
      isDeleted: false,
      $or: [
        { "urunler.envanterdeBekleyenAdet": { $gt: 0 } },
        { "urunler.envanterdeMi": true },
      ],
    }).sort({ tarih: -1, createdAt: -1 });

    const customerIds = [
      ...new Set(
        transactions
          .map((t) => (t.musteriId ? String(t.musteriId) : ""))
          .filter((id) => isObjectId(id)),
      ),
    ];
    const customers = customerIds.length
      ? await Customer.find({ tenantId, _id: { $in: customerIds } }).lean()
      : [];
    const customerMap = new Map(customers.map((c) => [String(c._id), customerRef(c)]));

    const result = transactions
      .filter((t) => (t.urunler || []).some((line) => pendingQuantity(line) > 0))
      .map((t) => {
        const json = t.toJSON();
        const ref = customerMap.get(String(t.musteriId));
        return {
          ...json,
          musteriId: ref || json.musteriId,
          urunler: (json.urunler || []).map((line) => {
            const pending = pendingQuantity(line);
            return {
              ...line,
              adet: line.envanterdeMi ? pending : num(line.adet),
              envanterdeBekleyenAdet: pending,
              envanterdeMi: pending > 0,
            };
          }),
        };
      });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/inventory/deliver
const deliverInventoryItem = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { transactionId, urunKodu, teslimEdilecekAdet } = req.body || {};

    if (!transactionId || !urunKodu || teslimEdilecekAdet === undefined) {
      return res.status(400).json({
        message: "transactionId, urunKodu ve teslimEdilecekAdet zorunludur.",
      });
    }
    if (!isObjectId(transactionId)) {
      return res.status(400).json({ message: "Geçersiz işlem kimliği." });
    }

    const transaction = await Transaction.findOne({
      _id: transactionId,
      tenantId,
      isDeleted: false,
    });
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const code = str(urunKodu);
    const line = (transaction.urunler || []).find((item) => item.urunKodu === code);
    if (!line) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    const pending = pendingQuantity(line);
    const delivered = Number(teslimEdilecekAdet);
    if (!(delivered > 0) || delivered > pending) {
      return res.status(400).json({ message: "Teslim edilecek adet geçersiz." });
    }

    const stock = await Stock.findOne({ tenantId, urunKodu: code });
    if (!stock) {
      return res.status(404).json({ message: "Stock not found" });
    }
    if (delivered > num(stock.adet) || delivered > num(stock.envanterdekiAdet)) {
      return res
        .status(400)
        .json({ message: "Stokta teslim edilecek kadar envanter ürünü yok." });
    }

    stock.adet = Math.max(0, num(stock.adet) - delivered);
    stock.envanterdekiAdet = Math.max(0, num(stock.envanterdekiAdet) - delivered);
    await stock.save();
    await syncProductFromStock(tenantId, stock.urunKodu, stock.adet);

    line.envanterdeBekleyenAdet = Math.max(0, pending - delivered);
    line.envanterdeMi = line.envanterdeBekleyenAdet > 0;
    if (!line.envanterdeMi) line.envanterAciklamasi = "";
    transaction.markModified("urunler");
    await transaction.save();

    logAction(req.user, "STOK_HAREKET", "Transaction", transaction._id, {
      islem: "ENVANTER_TESLIM",
      urunKodu: code,
      teslimEdilenAdet: delivered,
      musteri: transaction.musteriAdSoyad,
    });

    return res.json(transaction);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPendingInventory,
  deliverInventoryItem,
};
