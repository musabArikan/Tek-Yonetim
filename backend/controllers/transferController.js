const Transfer = require("../models/Transfer");
const { getTenantId, getUserId, withTenant } = require("../utils/tenantScope");

// POST /api/transfers
const createTransfer = async (req, res) => {
  try {
    const { fromBranch, toBranch, products, notes } = req.body;

    if (!fromBranch || !toBranch) {
      return res
        .status(400)
        .json({ message: "Kaynak ve hedef şube zorunludur" });
    }

    if (String(fromBranch) === String(toBranch)) {
      return res
        .status(400)
        .json({ message: "Kaynak ve hedef şube aynı olamaz" });
    }

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "En az bir ürün zorunludur" });
    }

    const transfer = await Transfer.create({
      tenantId: getTenantId(req),
      createdBy: getUserId(req),
      fromBranch,
      toBranch,
      products,
      notes: notes?.trim(),
      status: "Beklemede",
    });

    const populated = await Transfer.findById(transfer._id)
      .populate("fromBranch", "ad")
      .populate("toBranch", "ad")
      .populate("createdBy", "ad soyad");

    res.status(201).json(populated);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: Object.values(error.errors)
          .map((e) => e.message)
          .join(", "),
      });
    }
    res.status(500).json({ message: "Transfer oluşturulurken hata oluştu", error: error.message });
  }
};

// GET /api/transfers
const getTransfers = async (req, res) => {
  try {
    const { status, fromBranch, toBranch } = req.query;
    const filter = withTenant(req);

    if (status) filter.status = status;
    if (fromBranch) filter.fromBranch = fromBranch;
    if (toBranch) filter.toBranch = toBranch;

    const transfers = await Transfer.find(filter)
      .populate("fromBranch", "ad")
      .populate("toBranch", "ad")
      .populate("createdBy", "ad soyad")
      .populate("approvedBy", "ad soyad")
      .sort({ createdAt: -1 });

    res.status(200).json(transfers);
  } catch (error) {
    res.status(500).json({ message: "Transferler alınırken hata oluştu", error: error.message });
  }
};

// GET /api/transfers/:id
const getTransferById = async (req, res) => {
  try {
    const transfer = await Transfer.findOne(
      withTenant(req, { _id: req.params.id }),
    )
      .populate("fromBranch", "ad adres")
      .populate("toBranch", "ad adres")
      .populate("createdBy", "ad soyad")
      .populate("approvedBy", "ad soyad");

    if (!transfer) {
      return res.status(404).json({ message: "Transfer bulunamadı" });
    }

    res.status(200).json(transfer);
  } catch (error) {
    res.status(500).json({ message: "Transfer alınırken hata oluştu", error: error.message });
  }
};

// PATCH /api/transfers/:id/status
const updateTransferStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;

    if (!["Onaylandı", "Reddedildi"].includes(status)) {
      return res.status(400).json({ message: "Geçersiz durum. 'Onaylandı' veya 'Reddedildi' olmalı" });
    }

    const transfer = await Transfer.findOne(
      withTenant(req, { _id: req.params.id }),
    );

    if (!transfer) {
      return res.status(404).json({ message: "Transfer bulunamadı" });
    }

    if (transfer.status !== "Beklemede") {
      return res.status(400).json({ message: "Sadece beklemedeki transferler güncellenebilir" });
    }

    transfer.status = status;
    transfer.approvedBy = getUserId(req);
    transfer.approvedAt = new Date();
    if (notes) transfer.notes = notes.trim();

    await transfer.save();

    const populated = await Transfer.findById(transfer._id)
      .populate("fromBranch", "ad")
      .populate("toBranch", "ad")
      .populate("createdBy", "ad soyad")
      .populate("approvedBy", "ad soyad");

    res.status(200).json(populated);
  } catch (error) {
    res.status(500).json({ message: "Transfer durumu güncellenirken hata oluştu", error: error.message });
  }
};

// DELETE /api/transfers/:id
const deleteTransfer = async (req, res) => {
  try {
    const transfer = await Transfer.findOne(
      withTenant(req, { _id: req.params.id }),
    );

    if (!transfer) {
      return res.status(404).json({ message: "Transfer bulunamadı" });
    }

    if (transfer.status === "Onaylandı") {
      return res.status(400).json({ message: "Onaylanan transfer silinemez" });
    }

    await transfer.deleteOne();
    res.status(200).json({ message: "Transfer başarıyla silindi" });
  } catch (error) {
    res.status(500).json({ message: "Transfer silinirken hata oluştu", error: error.message });
  }
};

module.exports = {
  createTransfer,
  getTransfers,
  getTransferById,
  updateTransferStatus,
  deleteTransfer,
};
