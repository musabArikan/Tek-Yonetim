const Collection = require("../models/Collection");
const Customer = require("../models/Customer");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const { str, num, round2, isObjectId, dayBounds } = require("../utils/helpers");
const { customerRef, userRef } = require("../utils/serializers");
const { createTransactionForCustomer } = require("../services/saleService");
const { logAction } = require("../utils/auditLogger");

const attachCollectionRefs = async (tenantId, list) => {
  const customerIds = [
    ...new Set(
      list
        .map((c) => (c.customerId ? String(c.customerId) : ""))
        .filter((id) => isObjectId(id)),
    ),
  ];
  const userIds = [
    ...new Set(
      list
        .map((c) => (c.collectedBy ? String(c.collectedBy) : ""))
        .filter((id) => isObjectId(id)),
    ),
  ];

  const [customers, users] = await Promise.all([
    customerIds.length ? Customer.find({ tenantId, _id: { $in: customerIds } }).lean() : [],
    userIds.length ? User.find({ tenantId, _id: { $in: userIds } }).lean() : [],
  ]);

  const customerMap = new Map(customers.map((c) => [String(c._id), customerRef(c)]));
  const userMap = new Map(users.map((u) => [String(u._id), userRef(u)]));

  return list.map((item) => {
    const json = typeof item.toJSON === "function" ? item.toJSON() : { ...item, id: String(item._id) };
    return {
      ...json,
      customerId: customerMap.get(String(item.customerId)) || json.customerId,
      collectedBy: userMap.get(String(item.collectedBy)) || json.collectedBy,
    };
  });
};

// GET /api/collections
const getCollections = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const query = { tenantId, isDeleted: false };

    if (req.query?.customerId && isObjectId(req.query.customerId)) {
      query.customerId = req.query.customerId;
    }
    if (req.query?.collectedBy && isObjectId(req.query.collectedBy)) {
      query.collectedBy = req.query.collectedBy;
    }
    if (req.query?.startDate || req.query?.endDate) {
      query.collectionDate = {};
      if (req.query.startDate) {
        query.collectionDate.$gte = new Date(dayBounds(req.query.startDate)[0]);
      }
      if (req.query.endDate) {
        query.collectionDate.$lte = new Date(dayBounds(req.query.endDate)[1]);
      }
    }

    const list = await Collection.find(query).sort({ collectionDate: -1, createdAt: -1 });
    return res.json(await attachCollectionRefs(tenantId, list));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/collections/:id
const getCollectionById = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ message: "Geçersiz tahsilat kimliği." });
    }
    const collection = await Collection.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
      isDeleted: false,
    });
    if (!collection) {
      return res.status(404).json({ message: "Tahsilat bulunamadı." });
    }
    const [enriched] = await attachCollectionRefs(req.user.tenantId, [collection]);
    return res.json(enriched);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/collections
const createCollection = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const customerId = req.body?.customerId || req.body?.musteriId;
    const amount = num(req.body?.amount ?? req.body?.tutar ?? req.body?.odenenTutar, 0);

    if (!customerId || !isObjectId(customerId) || !(amount > 0)) {
      return res.status(400).json({ message: "customerId ve geçerli bir tutar zorunludur." });
    }

    const customer = await Customer.findOne({
      _id: customerId,
      tenantId,
      isDeleted: false,
    });
    if (!customer) {
      return res.status(404).json({ message: "Müşteri bulunamadı." });
    }

    const transaction = await createTransactionForCustomer({
      customer,
      payload: {
        islemTuru: "Tahsilat",
        tarih: req.body?.collectionDate || req.body?.tarih,
        odenenTutar: amount,
        odemeYontemi: str(req.body?.paymentMethod || req.body?.odemeYontemi) || "Nakit",
        aciklama: str(req.body?.notes || req.body?.aciklama),
      },
      actor: req.user,
    });

    const collection = await Collection.findOne({
      tenantId,
      transactionId: transaction._id,
      isDeleted: false,
    });

    if (!collection) {
      return res.status(201).json(transaction);
    }

    const [enriched] = await attachCollectionRefs(tenantId, [collection]);
    return res.status(201).json(enriched);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message });
  }
};

// DELETE /api/collections/:id
const deleteCollection = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ message: "Geçersiz tahsilat kimliği." });
    }
    const tenantId = req.user.tenantId;
    const collection = await Collection.findOne({
      _id: req.params.id,
      tenantId,
      isDeleted: false,
    });
    if (!collection) {
      return res.status(404).json({ message: "Tahsilat bulunamadı." });
    }

    const customer = await Customer.findOne({
      _id: collection.customerId,
      tenantId,
      isDeleted: false,
    });
    if (customer) {
      const nextBalance = round2(num(customer.toplamKalanBakiye, 0) + num(collection.amount, 0));
      customer.toplamKalanBakiye = nextBalance;
      customer.kalanBorc = nextBalance;
      await customer.save();
    }

    if (collection.kaynak === "TAHSILAT" && collection.transactionId) {
      await Transaction.updateOne(
        { _id: collection.transactionId, tenantId },
        { $set: { isDeleted: true, deletedBy: req.user.userId } },
      );
    }

    collection.isDeleted = true;
    await collection.save();

    logAction(req.user, "TAHSILAT_IPTAL", "Collection", collection._id, {
      amount: collection.amount,
    });

    return res.json({ message: "Tahsilat başarıyla iptal edildi" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCollections,
  getCollectionById,
  createCollection,
  deleteCollection,
};
