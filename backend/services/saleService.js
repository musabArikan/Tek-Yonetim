const Customer = require("../models/Customer");
const Product = require("../models/Product");
const Stock = require("../models/Stock");
const Tenant = require("../models/Tenant");
const Transaction = require("../models/Transaction");
const Collection = require("../models/Collection");
const { DEFAULT_PAYMENT_METHODS } = require("../utils/constants");
const {
  HttpError,
  num,
  round2,
  str,
  lc,
  fullName,
  normalizeDate,
  uniqueStringsTr,
} = require("../utils/helpers");
const { logAction } = require("../utils/auditLogger");
const { syncProductFromStock } = require("./inventorySync");

const normalizeTransactionType = (raw) => {
  const text = lc(raw)
    .replaceAll("ş", "s")
    .replaceAll("ı", "i")
    .replaceAll("ö", "o")
    .replaceAll("ü", "u")
    .replaceAll("ç", "c")
    .replaceAll("ğ", "g");
  return ["tahsilat", "borc_odeme", "borc odeme", "odeme"].includes(text) ? "Tahsilat" : "Satış";
};

const normalizeProductLine = (item = {}) => {
  const adet = Math.max(0, num(item.adet));
  const fallbackPending = item.envanterdeMi ? adet : 0;
  const rawPending =
    item.envanterdeBekleyenAdet !== undefined ? num(item.envanterdeBekleyenAdet) : fallbackPending;
  const pending = Math.min(adet, Math.max(0, rawPending));

  return {
    urunKodu: str(item.urunKodu),
    adet,
    envanterdeBekleyenAdet: pending,
    envanterdeMi: pending > 0,
    envanterAciklamasi: pending > 0 ? str(item.envanterAciklamasi) : "",
  };
};

/**
 * Stoktan atomik düşüm (eşzamanlı satışlarda eksiye düşmeyi engeller).
 * Başarılıysa güncellenmiş stok kaydını döner.
 */
const reserveStock = async (tenantId, line) => {
  const takeFromShelf = Math.max(0, line.adet - line.envanterdeBekleyenAdet);
  const updated = await Stock.findOneAndUpdate(
    {
      tenantId,
      urunKodu: line.urunKodu,
      $expr: { $gte: [{ $subtract: ["$adet", "$envanterdekiAdet"] }, line.adet] },
    },
    { $inc: { adet: -takeFromShelf, envanterdekiAdet: line.envanterdeBekleyenAdet } },
    { returnDocument: "after" },
  );

  if (!updated) {
    const exists = await Stock.exists({ tenantId, urunKodu: line.urunKodu });
    if (!exists) throw new HttpError(`${line.urunKodu} için stok kaydı bulunamadı`, 404);
    throw new HttpError(`${line.urunKodu} için yeterli kullanılabilir stok yok`, 400);
  }
  return { updated, takeFromShelf };
};

const releaseStock = async (tenantId, line, takeFromShelf) => {
  const restored = await Stock.findOneAndUpdate(
    { tenantId, urunKodu: line.urunKodu },
    { $inc: { adet: takeFromShelf, envanterdekiAdet: -line.envanterdeBekleyenAdet } },
    { returnDocument: "after" },
  );
  if (restored) await syncProductFromStock(tenantId, restored.urunKodu, restored.adet);
};

const rememberPaymentMethod = async (tenantId, method) => {
  if (!method) return;
  const tenant = await Tenant.findById(tenantId).select("customPaymentMethods");
  if (!tenant) return;
  const known = uniqueStringsTr([...DEFAULT_PAYMENT_METHODS, ...(tenant.customPaymentMethods || [])]);
  if (known.some((m) => lc(m) === lc(method))) return;
  await Tenant.updateOne({ _id: tenantId }, { $addToSet: { customPaymentMethods: method } });
};

/**
 * Satış / Tahsilat çekirdeği.
 * @param {object} customer  Customer dökümanı (aynı mağazaya ait olmalı)
 * @param {object} payload   İstek gövdesi
 * @param {object} actor     req.user
 */
const createTransactionForCustomer = async ({ customer, payload, actor }) => {
  if (!customer) throw new HttpError("Customer not found", 404);
  const tenantId = actor.tenantId;
  if (String(customer.tenantId) !== String(tenantId)) {
    throw new HttpError("Customer not found", 404);
  }

  const type = normalizeTransactionType(payload.islemTuru || payload.type || "Satış");
  const isTahsilat = type === "Tahsilat";
  const total = num(payload.toplamTutar);
  const pesinat = Math.min(num(payload.pesinat), Math.max(0, total));
  const collectionAmount = num(
    payload.odenenTutar ??
      payload.tutar ??
      payload.tahsilatTutari ??
      payload.toplamTutar ??
      payload.pesinat ??
      0,
  );

  if (isTahsilat && collectionAmount <= 0) {
    throw new HttpError("Tahsilat tutarı sıfırdan büyük olmalı", 400);
  }
  if (isTahsilat && collectionAmount > num(customer.toplamKalanBakiye) + 0.005) {
    throw new HttpError("Tahsilat tutarı kalan bakiyeden büyük olamaz", 400);
  }
  if (!isTahsilat && total <= 0) {
    throw new HttpError("Satış tutarı sıfırdan büyük olmalı", 400);
  }

  const lines = isTahsilat
    ? []
    : (Array.isArray(payload.urunler) ? payload.urunler : []).map(normalizeProductLine);
  if (!isTahsilat && lines.length === 0) {
    throw new HttpError("En az bir ürün gerekli", 400);
  }

  for (const line of lines) {
    if (!line.urunKodu) throw new HttpError("Ürün kodu gerekli", 400);
    if (line.adet <= 0) {
      throw new HttpError(`${line.urunKodu} için adet 1 veya daha büyük olmalı`, 400);
    }
  }

  // 1) Stok düşümü (atomik) — hata olursa önceki satırlar geri alınır
  const reserved = [];
  try {
    for (const line of lines) {
      const result = await reserveStock(tenantId, line);
      reserved.push({ line, takeFromShelf: result.takeFromShelf });
      await syncProductFromStock(tenantId, result.updated.urunKodu, result.updated.adet);
    }
  } catch (error) {
    for (const item of reserved) await releaseStock(tenantId, item.line, item.takeFromShelf);
    throw error;
  }

  const at = normalizeDate(payload.tarih);
  const odemeYontemi = str(payload.odemeYontemi) || (isTahsilat ? "Nakit" : "Veresiye");
  const remaining = isTahsilat ? 0 : round2(Math.max(0, total - pesinat));

  try {
    // 2) Satırları zenginleştir: satış anındaki alış fiyatını işlem içine kaydet
    const codes = [...new Set(lines.map((l) => l.urunKodu))];
    const [products, stocks] = await Promise.all([
      Product.find({ tenantId, urunKodu: { $in: codes }, isDeleted: false }).lean(),
      Stock.find({ tenantId, urunKodu: { $in: codes } }).lean(),
    ]);
    const productByCode = new Map(products.map((p) => [p.urunKodu, p]));
    const stockByCode = new Map(stocks.map((s) => [s.urunKodu, s]));

    const enrichedLines = lines.map((line) => {
      const product = productByCode.get(line.urunKodu);
      const stock = stockByCode.get(line.urunKodu);
      const alisFiyati = Math.max(0, num(product?.alisFiyati ?? stock?.alisFiyati ?? 0));
      const birimFiyat = Math.max(0, num(product?.satisFiyati ?? stock?.satisFiyati ?? 0));
      return {
        ...line,
        urunAdi: product?.ad || stock?.urunAdi || line.urunKodu,
        marka: product?.marka || stock?.marka || "",
        alisFiyati,
        birimFiyat,
        toplamMaliyet: round2(alisFiyati * num(line.adet)),
      };
    });
    const toplamMaliyet = isTahsilat
      ? 0
      : round2(enrichedLines.reduce((sum, l) => sum + num(l.alisFiyati) * num(l.adet), 0));

    // 3) Müşteri bakiyesi
    const previousBalance = round2(Math.max(0, num(customer.toplamKalanBakiye, 0)));
    const nextBalance = isTahsilat
      ? round2(Math.max(0, previousBalance - collectionAmount))
      : round2(previousBalance + remaining);

    const updatedCustomer = await Customer.findOneAndUpdate(
      { _id: customer._id, tenantId },
      {
        $set: {
          toplamKalanBakiye: nextBalance,
          kalanBorc: nextBalance,
          sonIslemTarihi: at,
        },
      },
      { returnDocument: "after" },
    );
    if (!updatedCustomer) throw new HttpError("Customer not found", 404);
    const balanceAfter = updatedCustomer.toplamKalanBakiye;

    let transaction;
    try {
      transaction = await Transaction.create({
        tenantId,
        createdBy: actor.userId,
        personelAdi: fullName(actor),
        musteriId: customer._id,
        musteriAdSoyad: fullName(customer),
        musteriNo: customer.musteriNo,
        tarih: at,
        islemTuru: type,
        islemTipi: isTahsilat ? "TAHSILAT" : "SATIS",
        urunler: enrichedLines,
        urunBilgisi: enrichedLines.length
          ? enrichedLines.map((l) => `${l.urunKodu} (x${l.adet})`).join(", ")
          : "İşlem",
        toplamTutar: isTahsilat ? collectionAmount : total,
        toplamMaliyet,
        pesinat: isTahsilat ? collectionAmount : pesinat,
        ...(isTahsilat ? { tutar: collectionAmount, odenenTutar: collectionAmount } : {}),
        kalanHesap: isTahsilat ? balanceAfter : remaining,
        alinanTutar: isTahsilat ? collectionAmount : pesinat,
        kalanBorc: isTahsilat ? balanceAfter : remaining,
        musteriBakiyeSonrasi: balanceAfter,
        odemeYontemi,
        aciklama: str(payload.aciklama),
        createdAt: at,
        updatedAt: at,
      });
    } catch (error) {
      // İşlem yazılamadıysa bakiye değişimini geri al
      await Customer.updateOne(
        { _id: customer._id, tenantId },
        {
          $set: {
            toplamKalanBakiye: previousBalance,
            kalanBorc: previousBalance,
          },
        },
      );
      throw error;
    }

    // 4) Kasa kaydı (peşinat veya tahsilat)
    const collected = isTahsilat ? collectionAmount : pesinat;
    if (collected > 0) {
      await Collection.create({
        tenantId,
        customerId: customer._id,
        transactionId: transaction._id,
        amount: collected,
        collectedBy: actor.userId,
        collectedByName: fullName(actor),
        paymentMethod: odemeYontemi,
        collectionDate: at,
        notes: isTahsilat ? str(payload.aciklama) || "Tahsilat" : "Satış peşinatı",
        kaynak: isTahsilat ? "TAHSILAT" : "SATIS_PESINAT",
        createdAt: at,
        updatedAt: at,
      });
    }

    await rememberPaymentMethod(tenantId, odemeYontemi);

    logAction(
      actor,
      isTahsilat ? "TAHSILAT_AL" : "SATIS_OLUSTUR",
      "Transaction",
      transaction._id,
      isTahsilat
        ? {
            musteri: fullName(customer),
            musteriNo: customer.musteriNo,
            tutar: collectionAmount,
            odemeYontemi,
            kalanBorc: balanceAfter,
          }
        : {
            musteri: fullName(customer),
            musteriNo: customer.musteriNo,
            urunler: transaction.urunBilgisi,
            toplamTutar: total,
            pesinat,
            kalanBorc: remaining,
          },
    );

    return transaction;
  } catch (error) {
    for (const item of reserved) await releaseStock(tenantId, item.line, item.takeFromShelf);
    throw error;
  }
};

module.exports = { createTransactionForCustomer, normalizeTransactionType };

