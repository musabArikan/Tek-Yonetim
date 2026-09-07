const Transaction = require("../models/Transaction");
const Customer = require("../models/Customer");
const Stock = require("../models/Stock");
const { activeCustomers, activeTransactions } = require("../utils/tenantScope");

const buildHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const parseNumber = (value) => {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
};

const normalizeProductLine = (item = {}) => {
  const normalizedAdet = Math.max(0, parseNumber(item.adet));
  const fallbackPending = item.envanterdeMi ? normalizedAdet : 0;
  const rawPending =
    item.envanterdeBekleyenAdet !== undefined
      ? parseNumber(item.envanterdeBekleyenAdet)
      : fallbackPending;
  const normalizedPending = Math.min(normalizedAdet, Math.max(0, rawPending));

  return {
    urunKodu: (item.urunKodu || "").toString().trim(),
    adet: normalizedAdet,
    envanterdeBekleyenAdet: normalizedPending,
    envanterdeMi: normalizedPending > 0,
    envanterAciklamasi:
      normalizedPending > 0 ? (item.envanterAciklamasi || "").trim() : "",
  };
};

const createDocument = async (Model, payload, session) => {
  if (!session) {
    return Model.create(payload);
  }

  const [document] = await Model.create([payload], { session });
  return document;
};

const saveWithSession = (document, session) => {
  if (!session) {
    return document.save();
  }

  return document.save({ session });
};

const createTransactionForCustomer = async ({
  customer,
  payload,
  session,
  tenantId,
  createdBy,
}) => {
  if (!customer) {
    throw buildHttpError("Customer not found", 404);
  }

  if (!tenantId || !createdBy) {
    throw buildHttpError("tenantId and createdBy are required", 400);
  }

  const {
    tarih,
    urunler,
    toplamTutar,
    pesinat,
    odemeYontemi,
    kayitDefteri,
    aciklama,
    islemTuru,
    type,
    tutar,
    odenenTutar,
    tahsilatTutari,
  } = payload;

  const normalizedType = (islemTuru || type || "Satış").toString().trim();
  const isTahsilat = normalizedType === "Tahsilat";
  const normalizedTotal = parseNumber(toplamTutar);
  const normalizedPesinat = Math.min(
    parseNumber(pesinat),
    Math.max(0, normalizedTotal),
  );
  const tahsilatMiktari = Number(
    odenenTutar ?? tutar ?? tahsilatTutari ?? toplamTutar ?? pesinat ?? 0,
  );
  const normalizedCollectionAmount = Number.isFinite(tahsilatMiktari)
    ? tahsilatMiktari
    : 0;
  const kesinKalanHesap = isTahsilat
    ? 0
    : Math.max(0, normalizedTotal - normalizedPesinat);

  if (isTahsilat && normalizedCollectionAmount <= 0) {
    throw buildHttpError("Tahsilat tutarı sıfırdan büyük olmalı", 400);
  }

  if (!isTahsilat && normalizedTotal <= 0) {
    throw buildHttpError("Satış tutarı sıfırdan büyük olmalı", 400);
  }

  const normalizedProducts = isTahsilat
    ? []
    : (Array.isArray(urunler) ? urunler : []).map(normalizeProductLine);

  if (!isTahsilat && normalizedProducts.length === 0) {
    throw buildHttpError("En az bir ürün gerekli", 400);
  }

  const stockDocsByCode = new Map();

  if (!isTahsilat) {
    for (const product of normalizedProducts) {
      if (!product.urunKodu) {
        throw buildHttpError("Ürün kodu gerekli", 400);
      }

      if (product.adet <= 0) {
        throw buildHttpError(
          `${product.urunKodu} için adet 1 veya daha büyük olmalı`,
          400,
        );
      }

      let stock = stockDocsByCode.get(product.urunKodu);
      if (!stock) {
        let stockQuery = Stock.findOne({
          tenantId,
          urunKodu: product.urunKodu,
        });
        if (session) {
          stockQuery = stockQuery.session(session);
        }
        stock = await stockQuery;

        if (!stock) {
          throw buildHttpError(
            `${product.urunKodu} için stok kaydı bulunamadı`,
            404,
          );
        }

        stockDocsByCode.set(product.urunKodu, stock);
      }

      const mevcutAdet = parseNumber(stock.adet);
      const mevcutEnvanterAdedi = parseNumber(stock.envanterdekiAdet);
      const kullanilabilirAdet = Math.max(0, mevcutAdet - mevcutEnvanterAdedi);
      const alinanAdet = Math.max(
        0,
        parseNumber(product.adet) - parseNumber(product.envanterdeBekleyenAdet),
      );

      if (product.adet > kullanilabilirAdet) {
        throw buildHttpError(
          `${product.urunKodu} için yeterli kullanılabilir stok yok`,
          400,
        );
      }

      stock.adet = mevcutAdet - alinanAdet;
      stock.envanterdekiAdet =
        mevcutEnvanterAdedi + parseNumber(product.envanterdeBekleyenAdet);
    }
  }

  const currentBalance = Number(customer.toplamKalanBakiye || 0);
  const nextBalance = isTahsilat
    ? Math.max(0, currentBalance - normalizedCollectionAmount)
    : currentBalance + kesinKalanHesap;

  for (const stock of stockDocsByCode.values()) {
    await saveWithSession(stock, session);
  }

  const transaction = await createDocument(
    Transaction,
    {
      tenantId,
      createdBy,
      musteriId: customer._id,
      tarih,
      islemTuru: isTahsilat ? "Tahsilat" : "Satış",
      urunler: normalizedProducts,
      toplamTutar: isTahsilat
        ? normalizedCollectionAmount
        : Number(normalizedTotal),
      pesinat: isTahsilat
        ? normalizedCollectionAmount
        : Number(normalizedPesinat),
      kalanHesap: isTahsilat
        ? nextBalance
        : Math.max(0, Number(normalizedTotal) - Number(normalizedPesinat)),
      odemeYontemi,
      kayitDefteri,
      aciklama: aciklama || "",
    },
    session,
  );

  customer.toplamKalanBakiye = nextBalance;
  await saveWithSession(customer, session);

  return transaction;
};

const createTransaction = async (req, res) => {
  try {
    const { musteriId } = req.body;

    if (!musteriId) {
      return res.status(400).json({ message: "Müşteri ID gerekli" });
    }

    const customer = await Customer.findOne(
      activeCustomers(req, { _id: musteriId }),
    );
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const transaction = await createTransactionForCustomer({
      customer,
      payload: req.body,
      tenantId: req.user.tenantId,
      createdBy: req.user.userId,
    });
    res.status(201).json(transaction);
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

    res.status(500).json({
      message: "Server error while creating transaction",
      error: error.message,
    });
  }
};

const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find(activeTransactions(req))
      .populate("musteriId", "ad soyad telefon")
      .sort({ createdAt: -1 });
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({
      message: "Server error while fetching transactions",
      error: error.message,
    });
  }
};

const getCustomerTransactions = async (req, res) => {
  try {
    const customer = await Customer.findOne(
      activeCustomers(req, { _id: req.params.id }),
    );

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const transactions = await Transaction.find(
      activeTransactions(req, { musteriId: customer._id }),
    )
      .populate("musteriId", "ad soyad telefon")
      .sort({ createdAt: -1 });

    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({
      message: "Server error while fetching customer transactions",
      error: error.message,
    });
  }
};

module.exports = {
  createTransaction,
  getTransactions,
  getCustomerTransactions,
  createTransactionForCustomer,
};
