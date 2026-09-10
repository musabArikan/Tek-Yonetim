const mongoose = require("mongoose");
const Customer = require("../models/Customer");
const Counter = require("../models/Counter");
const Transaction = require("../models/Transaction");
const { createTransactionForCustomer } = require("./transactionController");
const {
  getTenantId,
  getUserId,
  withTenant,
  activeCustomers,
} = require("../utils/tenantScope");
const { logAction } = require("../utils/auditLogger");

const createDocument = async (Model, payload, session) => {
  if (!session) {
    return Model.create(payload);
  }

  const [document] = await Model.create([payload], { session });
  return document;
};

const createCustomer = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { ad, soyad, tcKimlik, telefon, adres, toplamKalanBakiye, satis } =
      req.body;
    const normalizedAd = (ad || "").trim();
    const normalizedSoyad = (soyad || "").trim();
    const normalizedTelefon = (telefon || "").trim();
    const normalizedAdres = (adres || "").trim();
    const normalizedTcKimlik = (tcKimlik || "").trim();
    const hasSalePayload =
      satis && typeof satis === "object" && !Array.isArray(satis);

    if (!normalizedAd || !normalizedSoyad || !normalizedTelefon) {
      return res
        .status(400)
        .json({ message: "Ad, soyad and telefon are required" });
    }

    let responsePayload = null;

    await session.withTransaction(async () => {
      if (normalizedTcKimlik) {
        const existingCustomer = await Customer.findOne(
          activeCustomers(req, { tcKimlik: normalizedTcKimlik }),
        ).session(session);

        if (existingCustomer) {
          throw Object.assign(new Error("Bu TC ile zaten kayıt var"), {
            statusCode: 400,
          });
        }
      }

      const lastCustomer = await Customer.findOne({ tenantId: getTenantId(req) })
        .sort({ musteriNo: -1 })
        .session(session);

      const nextMusteriNo = lastCustomer && lastCustomer.musteriNo ? lastCustomer.musteriNo + 1 : 1;

      const customer = await createDocument(
        Customer,
        {
          tenantId: getTenantId(req),
          createdBy: getUserId(req),
          ad: normalizedAd,
          soyad: normalizedSoyad,
          tcKimlik: normalizedTcKimlik,
          telefon: normalizedTelefon,
          musteriNo: nextMusteriNo,
          adres: normalizedAdres,
          toplamKalanBakiye: toplamKalanBakiye || 0,
        },
        session,
      );

      let transaction = null;
      if (hasSalePayload) {
        transaction = await createTransactionForCustomer({
          customer,
          payload: satis,
          session,
          tenantId: getTenantId(req),
          createdBy: getUserId(req),
        });
      }

      responsePayload = hasSalePayload ? { customer, transaction } : customer;
    });

    // Audit log
    const customerData = responsePayload?.customer || responsePayload;
    logAction(req, "MUSTERI_EKLE", "Customer", customerData?._id, {
      ad: normalizedAd,
      soyad: normalizedSoyad,
      userId: req.user?._id || req.user?.userId,
      tenantId: req.user?.tenantId
    });
    
    return res.status(201).json(responsePayload);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: Object.values(error.errors)
          .map((item) => item.message)
          .join(", "),
      });
    }

    res.status(500).json({ error: error.message || "Bilinmeyen bir sunucu hatası oluştu" });
  } finally {
    await session.endSession();
  }
};

const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find(activeCustomers(req)).sort({
      createdAt: -1,
    });
    res.status(200).json(customers);
  } catch (error) {
    res.status(500).json({
      message: "Server error while fetching customers",
      error: error.message,
    });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findOne(
      activeCustomers(req, { _id: req.params.id }),
    );

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.status(200).json(customer);
  } catch (error) {
    res.status(500).json({
      message: "Server error while fetching customer",
      error: error.message,
    });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne(
      activeCustomers(req, { _id: req.params.id }),
    );

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const deletedBy = getUserId(req);

    await Transaction.updateMany(withTenant(req, { musteriId: customer._id, isDeleted: false }), {
      isDeleted: true,
      deletedBy,
    });

    customer.isDeleted = true;
    customer.deletedBy = deletedBy;
    await customer.save();

    // Audit log
    logAction(req, "MUSTERI_SIL", "Customer", customer._id, {
      ad: customer.ad,
      soyad: customer.soyad,
    });

    res.status(200).json({ message: "Customer and related records deleted" });
  } catch (error) {
    res.status(500).json({
      message: "Server error while deleting customer",
      error: error.message,
    });
  }
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  deleteCustomer,
};
