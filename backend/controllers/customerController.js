const Customer = require("../models/Customer");
const Transaction = require("../models/Transaction");
const Collection = require("../models/Collection");
const Stock = require("../models/Stock");
const { str, num, isObjectId, normalizeDate } = require("../utils/helpers");
const { customerRef } = require("../utils/serializers");
const { createTransactionForCustomer } = require("../services/saleService");
const { logAction } = require("../utils/auditLogger");

// GET /api/customers
const getCustomers = async (req, res) => {
  try {
    const query = { tenantId: req.user.tenantId, isDeleted: false };
    if (String(req.query?.onlyDebtors) === "true") {
      query.toplamKalanBakiye = { $gt: 0 };
    }
    const customers = await Customer.find(query).sort({ createdAt: -1, musteriNo: -1 });
    return res.json(customers);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/customers/:id
const getCustomerById = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ message: "Geçersiz müşteri kimliği." });
    }
    const customer = await Customer.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
      isDeleted: false,
    });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    return res.json(customer);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/customers
const createCustomer = async (req, res) => {
  let createdCustomer = null;
  try {
    const ad = str(req.body?.ad);
    const soyad = str(req.body?.soyad);
    const telefon = str(req.body?.telefon);
    const tcKimlik = str(req.body?.tcKimlik || req.body?.tc);
    const adres = str(req.body?.adres);

    if (!ad || !soyad || !telefon) {
      return res.status(400).json({ message: "Ad, soyad ve telefon zorunludur." });
    }

    if (tcKimlik) {
      const duplicateTc = await Customer.findOne({
        tenantId: req.user.tenantId,
        tcKimlik,
        isDeleted: false,
      });
      if (duplicateTc) {
        return res.status(400).json({ message: "Bu TC Kimlik numarası ile zaten kayıt var." });
      }
    }

    const lastCustomer = await Customer.findOne({ tenantId: req.user.tenantId })
      .sort({ musteriNo: -1 })
      .select("musteriNo");
    const nextMusteriNo = Math.max(1000, num(lastCustomer?.musteriNo, 1000)) + 1;
    const registeredAt = normalizeDate(req.body?.satis?.tarih || req.body?.tarih);
    const initialBalance = Math.max(0, num(req.body?.toplamKalanBakiye, 0));

    createdCustomer = await Customer.create({
      tenantId: req.user.tenantId,
      createdBy: req.user.userId,
      musteriNo: nextMusteriNo,
      ad,
      soyad,
      tcKimlik,
      tc: tcKimlik,
      telefon,
      adres,
      toplamKalanBakiye: initialBalance,
      kalanBorc: initialBalance,
      installments: [],
      kayitTarihi: registeredAt,
      sonIslemTarihi: registeredAt,
    });

    logAction(req.user, "MUSTERI_EKLE", "Customer", createdCustomer._id, {
      ad,
      soyad,
      musteriNo: createdCustomer.musteriNo,
    });

    const hasSale =
      req.body?.satis &&
      typeof req.body.satis === "object" &&
      !Array.isArray(req.body.satis);

    if (hasSale) {
      try {
        const transaction = await createTransactionForCustomer({
          customer: createdCustomer,
          payload: req.body.satis,
          actor: req.user,
        });
        const refreshedCustomer = await Customer.findById(createdCustomer._id);
        return res.status(201).json({
          customer: refreshedCustomer || createdCustomer,
          transaction,
        });
      } catch (saleError) {
        await Customer.deleteOne({ _id: createdCustomer._id });
        throw saleError;
      }
    }

    return res.status(201).json(createdCustomer);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message });
  }
};

// DELETE /api/customers/:id
const deleteCustomer = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ message: "Geçersiz müşteri kimliği." });
    }

    const customer = await Customer.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
      isDeleted: false,
    });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const activeTransactions = await Transaction.find({
      tenantId: req.user.tenantId,
      musteriId: customer._id,
      isDeleted: false,
    });

    for (const tx of activeTransactions) {
      for (const line of tx.urunler || []) {
        const pending = num(line.envanterdeBekleyenAdet, 0);
        if (pending > 0 && line.urunKodu) {
          const stockDoc = await Stock.findOne({
            tenantId: req.user.tenantId,
            urunKodu: line.urunKodu,
          });
          if (stockDoc) {
            stockDoc.envanterdekiAdet = Math.max(0, num(stockDoc.envanterdekiAdet, 0) - pending);
            await stockDoc.save();
          }
        }
      }
      tx.isDeleted = true;
      tx.deletedBy = req.user.userId;
      await tx.save();
    }

    await Collection.updateMany(
      { tenantId: req.user.tenantId, customerId: customer._id, isDeleted: false },
      { $set: { isDeleted: true } },
    );

    customer.isDeleted = true;
    customer.deletedBy = req.user.userId;
    await customer.save();

    logAction(req.user, "MUSTERI_SIL", "Customer", customer._id, {
      ad: customer.ad,
      soyad: customer.soyad,
      musteriNo: customer.musteriNo,
    });

    return res.json({ message: "Customer and related records deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/customers/:id/transactions
const getCustomerTransactions = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ message: "Geçersiz müşteri kimliği." });
    }
    const customer = await Customer.findOne({
      _id: req.params.id,
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
  getCustomers,
  getCustomerById,
  createCustomer,
  deleteCustomer,
  getCustomerTransactions,
};
