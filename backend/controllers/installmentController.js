const mongoose = require("mongoose");
const Installment = require("../models/Installment");
const Customer = require("../models/Customer");
const { getTenantId, getUserId, withTenant } = require("../utils/tenantScope");

// POST /api/installments — Taksit planı oluştur (toplu)
const createInstallment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      customerId,
      totalAmount,
      installmentCount,
      startDate,
      notes,
    } = req.body;

    if (!customerId || !totalAmount || !installmentCount || !startDate) {
      return res.status(400).json({
        message: "customerId, totalAmount, installmentCount ve startDate zorunludur",
      });
    }

    if (installmentCount < 1 || installmentCount > 120) {
      return res.status(400).json({ message: "Taksit sayısı 1-120 arasında olmalıdır" });
    }

    // Müşteri tenant kontrolü
    const customer = await Customer.findOne(
      withTenant(req, { _id: customerId, isDeleted: false }),
    );
    if (!customer) {
      return res.status(404).json({ message: "Müşteri bulunamadı" });
    }

    const tenantId = getTenantId(req);
    const createdBy = getUserId(req);
    const groupId = new mongoose.Types.ObjectId();
    const perInstallmentAmount = Math.round((totalAmount / installmentCount) * 100) / 100;
    const installments = [];

    await session.withTransaction(async () => {
      const start = new Date(startDate);

      for (let i = 1; i <= installmentCount; i++) {
        const dueDate = new Date(start);
        dueDate.setMonth(dueDate.getMonth() + (i - 1));

        installments.push({
          tenantId,
          customerId,
          groupId,
          totalAmount,
          installmentCount,
          installmentNumber: `${i}/${installmentCount}`,
          dueDate,
          amount: perInstallmentAmount,
          isPaid: false,
          createdBy,
          notes: notes?.trim(),
        });
      }

      await Installment.insertMany(installments, { session });

      // Müşteri bakiyesini güncelle
      await Customer.findByIdAndUpdate(
        customerId,
        { $inc: { toplamKalanBakiye: totalAmount } },
        { session },
      );
    });

    const created = await Installment.find({ tenantId, groupId }).sort({ dueDate: 1 });

    res.status(201).json({
      message: `${installmentCount} taksit başarıyla oluşturuldu`,
      groupId,
      installments: created,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: Object.values(error.errors)
          .map((e) => e.message)
          .join(", "),
      });
    }
    res.status(500).json({ message: "Taksit oluşturulurken hata oluştu", error: error.message });
  } finally {
    await session.endSession();
  }
};

// GET /api/installments
const getInstallments = async (req, res) => {
  try {
    const { customerId, isPaid, groupId } = req.query;
    const filter = withTenant(req, { isDeleted: false });

    if (customerId) filter.customerId = customerId;
    if (isPaid !== undefined) filter.isPaid = isPaid === "true";
    if (groupId) filter.groupId = groupId;

    const installments = await Installment.find(filter)
      .populate("customerId", "ad soyad musteriNo")
      .sort({ dueDate: 1 });

    res.status(200).json(installments);
  } catch (error) {
    res.status(500).json({ message: "Taksitler alınırken hata oluştu", error: error.message });
  }
};

// GET /api/installments/overdue — Vadesi geçmiş, ödenmemiş taksitler
const getOverdueInstallments = async (req, res) => {
  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const overdueInstallments = await Installment.find(
      withTenant(req, {
        isDeleted: false,
        isPaid: false,
        dueDate: { $lt: now },
      }),
    )
      .populate("customerId", "ad soyad telefon musteriNo")
      .sort({ dueDate: 1 });

    res.status(200).json(overdueInstallments);
  } catch (error) {
    res.status(500).json({ message: "Vadesi geçmiş taksitler alınırken hata oluştu", error: error.message });
  }
};

// GET /api/installments/:id
const getInstallmentById = async (req, res) => {
  try {
    const installment = await Installment.findOne(
      withTenant(req, { _id: req.params.id, isDeleted: false }),
    ).populate("customerId", "ad soyad telefon");

    if (!installment) {
      return res.status(404).json({ message: "Taksit bulunamadı" });
    }

    res.status(200).json(installment);
  } catch (error) {
    res.status(500).json({ message: "Taksit alınırken hata oluştu", error: error.message });
  }
};

// PATCH /api/installments/:id/paid — Taksiti ödendi olarak işaretle
const markInstallmentPaid = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { paidDate } = req.body;

    let installment;
    await session.withTransaction(async () => {
      installment = await Installment.findOne(
        withTenant(req, { _id: req.params.id, isDeleted: false }),
      ).session(session);

      if (!installment) {
        throw Object.assign(new Error("Taksit bulunamadı"), { statusCode: 404 });
      }

      if (installment.isPaid) {
        throw Object.assign(new Error("Bu taksit zaten ödenmiş"), { statusCode: 400 });
      }

      installment.isPaid = true;
      installment.paidDate = paidDate ? new Date(paidDate) : new Date();
      await installment.save({ session });

      // Müşteri bakiyesini azalt
      await Customer.findByIdAndUpdate(
        installment.customerId,
        { $inc: { toplamKalanBakiye: -installment.amount } },
        { session },
      );
    });

    res.status(200).json(installment);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(500).json({ message: "Taksit işaretlenirken hata oluştu", error: error.message });
  } finally {
    await session.endSession();
  }
};

// DELETE /api/installments/:id
const deleteInstallment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    let installment;
    await session.withTransaction(async () => {
      installment = await Installment.findOne(
        withTenant(req, { _id: req.params.id, isDeleted: false }),
      ).session(session);

      if (!installment) {
        throw Object.assign(new Error("Taksit bulunamadı"), { statusCode: 404 });
      }

      if (installment.isPaid) {
        throw Object.assign(new Error("Ödenmiş taksit silinemez"), { statusCode: 400 });
      }

      installment.isDeleted = true;
      await installment.save({ session });

      // Müşteri bakiyesini güncelle (borç azalt)
      await Customer.findByIdAndUpdate(
        installment.customerId,
        { $inc: { toplamKalanBakiye: -installment.amount } },
        { session },
      );
    });

    res.status(200).json({ message: "Taksit başarıyla silindi" });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(500).json({ message: "Taksit silinirken hata oluştu", error: error.message });
  } finally {
    await session.endSession();
  }
};

// GET /api/installments/customer/:customerId/summary
// Müşteri + taksit özetini tek sorguda getir
const getCustomerInstallmentSummary = async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await Customer.findOne(
      withTenant(req, { _id: customerId, isDeleted: false }),
    );
    if (!customer) {
      return res.status(404).json({ message: "Müşteri bulunamadı" });
    }

    const installments = await Installment.find(
      withTenant(req, { customerId, isDeleted: false }),
    ).sort({ dueDate: 1 });

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const summary = {
      totalInstallments: installments.length,
      paidCount: installments.filter((i) => i.isPaid).length,
      overdueCount: installments.filter(
        (i) => !i.isPaid && new Date(i.dueDate) < now,
      ).length,
      totalAmount: installments.reduce((sum, i) => sum + i.amount, 0),
      paidAmount: installments
        .filter((i) => i.isPaid)
        .reduce((sum, i) => sum + i.amount, 0),
      remainingAmount: installments
        .filter((i) => !i.isPaid)
        .reduce((sum, i) => sum + i.amount, 0),
      riskStatus:
        installments.filter((i) => !i.isPaid && new Date(i.dueDate) < now)
          .length === 0
          ? "Düşük"
          : installments.filter(
              (i) => !i.isPaid && new Date(i.dueDate) < now,
            ).length <= 2
          ? "Orta"
          : "Yüksek",
    };

    res.status(200).json({ customer, installments, summary });
  } catch (error) {
    res.status(500).json({ message: "Müşteri özeti alınırken hata oluştu", error: error.message });
  }
};

module.exports = {
  createInstallment,
  getInstallments,
  getOverdueInstallments,
  getInstallmentById,
  markInstallmentPaid,
  deleteInstallment,
  getCustomerInstallmentSummary,
};
