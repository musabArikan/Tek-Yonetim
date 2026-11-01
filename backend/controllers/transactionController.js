const Customer = require("../models/Customer");
const Transaction = require("../models/Transaction");
const { isObjectId } = require("../utils/helpers");
const { customerRef } = require("../utils/serializers");
const { createTransactionForCustomer } = require("../services/saleService");

const attachCustomerRefs = async (tenantId, transactions) => {
  const customerIds = [
    ...new Set(
      transactions
        .map((tx) => (tx.musteriId ? String(tx.musteriId) : ""))
        .filter((id) => isObjectId(id)),
    ),
  ];
  const customers = customerIds.length
    ? await Customer.find({ tenantId, _id: { $in: customerIds } }).lean()
    : [];
  const byId = new Map(customers.map((c) => [String(c._id), customerRef(c)]));

  return transactions.map((tx) => {
    const json = typeof tx.toJSON === "function" ? tx.toJSON() : { ...tx, id: String(tx._id) };
    const ref = byId.get(String(tx.musteriId));
    return {
      ...json,
      musteriId: ref || json.musteriId,
    };
  });
};

// GET /api/transactions
const getTransactions = async (req, res) => {
  try {
    const query = { tenantId: req.user.tenantId, isDeleted: false };
    if (req.query?.musteriId && isObjectId(req.query.musteriId)) {
      query.musteriId = req.query.musteriId;
    }
    const list = await Transaction.find(query).sort({ tarih: -1, createdAt: -1 });
    const enriched = await attachCustomerRefs(req.user.tenantId, list);
    return res.json(enriched);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/transactions
const createTransaction = async (req, res) => {
  try {
    const musteriId = req.body?.musteriId;
    if (!musteriId || !isObjectId(musteriId)) {
      return res.status(400).json({ message: "Geçerli bir müşteri seçilmelidir." });
    }

    const customer = await Customer.findOne({
      _id: musteriId,
      tenantId: req.user.tenantId,
      isDeleted: false,
    });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const transaction = await createTransactionForCustomer({
      customer,
      payload: req.body,
      actor: req.user,
    });

    const json = transaction.toJSON();
    return res.status(201).json({
      ...json,
      musteriId: customerRef(customer) || json.musteriId,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message });
  }
};

// GET /api/transactions/customer/:customerId
const getTransactionsByCustomer = async (req, res) => {
  try {
    const customerId = req.params.customerId || req.params.id;
    if (!isObjectId(customerId)) {
      return res.status(400).json({ message: "Geçersiz müşteri kimliği." });
    }
    const customer = await Customer.findOne({
      _id: customerId,
      tenantId: req.user.tenantId,
      isDeleted: false,
    });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const list = await Transaction.find({
      tenantId: req.user.tenantId,
      musteriId: customer._id,
      isDeleted: false,
    }).sort({ tarih: -1, createdAt: -1 });

    const ref = customerRef(customer);
    return res.json(
      list.map((tx) => {
        const json = tx.toJSON();
        return { ...json, musteriId: ref };
      }),
    );
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTransactions,
  createTransaction,
  getTransactionsByCustomer,
};
