const mongoose = require("mongoose");
const Collection = require("../models/Collection");
const Installment = require("../models/Installment");
const Customer = require("../models/Customer");
const { getTenantId, getUserId, withTenant } = require("../utils/tenantScope");
const { logAction } = require("../utils/auditLogger");

// POST /api/collections
const createCollection = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      customerId,
      installmentId,
      amount,
      paymentMethod,
      collectionDate,
      notes,
    } = req.body;

    if (!customerId || !amount) {
      return res.status(400).json({ message: "customerId ve amount zorunludur" });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Tahsilat tutarı 0'dan büyük olmalıdır" });
    }

    let collection;
    await session.withTransaction(async () => {
      // Müşteri kontrolü
      const customer = await Customer.findOne(
        withTenant(req, { _id: customerId, isDeleted: false }),
      ).session(session);
      if (!customer) {
        throw Object.assign(new Error("Müşteri bulunamadı"), { statusCode: 404 });
      }

      collection = await Collection.create(
        [
          {
            tenantId: getTenantId(req),
            customerId,
            installmentId: installmentId || undefined,
            amount,
            collectedBy: getUserId(req),
            paymentMethod: paymentMethod || "Nakit",
            collectionDate: collectionDate ? new Date(collectionDate) : new Date(),
            notes: notes?.trim(),
          },
        ],
        { session },
      );
      collection = collection[0];

      if (installmentId) {
        const installment = await Installment.findOne(
          withTenant(req, { _id: installmentId, isDeleted: false }),
        ).session(session);

        if (installment && !installment.isPaid) {
          installment.paidAmount = (installment.paidAmount || 0) + amount;
          
          if (installment.paidAmount >= installment.amount) {
            installment.isPaid = true;
            installment.status = "Ödendi";
            installment.paidDate = collection.collectionDate;
            installment.paidAmount = installment.amount; // Cap it
          } else {
            installment.status = "Kısmi Ödendi";
          }
          await installment.save({ session });
        }
      }

      // Müşteri bakiyesini güncelle
      await Customer.findByIdAndUpdate(
        customerId,
        { $inc: { toplamKalanBakiye: -amount } },
        { session },
      );
    });

    const populated = await Collection.findById(collection._id)
      .populate("customerId", "ad soyad musteriNo")
      .populate("collectedBy", "ad soyad")
      .populate("installmentId", "installmentNumber dueDate amount");

    // Audit log
    logAction(req, "TAHSILAT_AL", "Collection", collection._id, {
      customerId,
      amount,
      paymentMethod: paymentMethod || "Nakit",
    });
    res.status(201).json(populated);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: Object.values(error.errors)
          .map((e) => e.message)
          .join(", "),
      });
    }
    res.status(500).json({ message: "Tahsilat oluşturulurken hata oluştu", error: error.message });
  } finally {
    await session.endSession();
  }
};

// GET /api/collections
const getCollections = async (req, res) => {
  try {
    const { customerId, collectedBy, startDate, endDate } = req.query;
    const filter = withTenant(req, { isDeleted: false });

    if (customerId) filter.customerId = customerId;
    if (collectedBy) filter.collectedBy = collectedBy;
    if (startDate || endDate) {
      filter.collectionDate = {};
      if (startDate) filter.collectionDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.collectionDate.$lte = end;
      }
    }

    const collections = await Collection.find(filter)
      .populate("customerId", "ad soyad musteriNo telefon")
      .populate("collectedBy", "ad soyad")
      .populate("installmentId", "installmentNumber dueDate amount")
      .sort({ collectionDate: -1 });

    res.status(200).json(collections);
  } catch (error) {
    res.status(500).json({ message: "Tahsilatlar alınırken hata oluştu", error: error.message });
  }
};

// GET /api/collections/:id
const getCollectionById = async (req, res) => {
  try {
    const collection = await Collection.findOne(
      withTenant(req, { _id: req.params.id, isDeleted: false }),
    )
      .populate("customerId", "ad soyad telefon")
      .populate("collectedBy", "ad soyad")
      .populate("installmentId", "installmentNumber dueDate amount");

    if (!collection) {
      return res.status(404).json({ message: "Tahsilat bulunamadı" });
    }

    res.status(200).json(collection);
  } catch (error) {
    res.status(500).json({ message: "Tahsilat alınırken hata oluştu", error: error.message });
  }
};

// DELETE /api/collections/:id — Tahsilat iptali (bakiye geri yüklenir)
const deleteCollection = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const collection = await Collection.findOne(
        withTenant(req, { _id: req.params.id, isDeleted: false }),
      ).session(session);

      if (!collection) {
        throw Object.assign(new Error("Tahsilat bulunamadı"), { statusCode: 404 });
      }

      // Eğer taksit işaretlendiyse geri al
      if (collection.installmentId) {
        const installment = await Installment.findById(collection.installmentId).session(session);
        if (installment) {
          installment.paidAmount = Math.max(0, (installment.paidAmount || 0) - collection.amount);
          
          if (installment.paidAmount === 0) {
            installment.status = "Bekliyor";
            installment.isPaid = false;
            installment.paidDate = null;
          } else {
            installment.status = "Kısmi Ödendi";
            installment.isPaid = false;
            installment.paidDate = null;
          }
          await installment.save({ session });
        }
      }

      // Müşteri bakiyesini geri yükle
      await Customer.findByIdAndUpdate(
        collection.customerId,
        { $inc: { toplamKalanBakiye: collection.amount } },
        { session },
      );

      collection.isDeleted = true;
      collection.deletedBy = getUserId(req);
      await collection.save({ session });
    });

    res.status(200).json({ message: "Tahsilat başarıyla iptal edildi" });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(500).json({ message: "Tahsilat silinirken hata oluştu", error: error.message });
  } finally {
    await session.endSession();
  }
};

module.exports = {
  createCollection,
  getCollections,
  getCollectionById,
  deleteCollection,
};
