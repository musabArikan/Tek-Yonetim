const Shipment = require("../models/Shipment");
const { getTenantId, getUserId, withTenant } = require("../utils/tenantScope");

// POST /api/shipments
const createShipment = async (req, res) => {
  try {
    const { customerId, products, deliveryDate, vehicleInfo, assignedPersonnel, notes } = req.body;

    if (!customerId) {
      return res.status(400).json({ message: "Müşteri zorunludur" });
    }

    if (!deliveryDate) {
      return res.status(400).json({ message: "Teslimat tarihi zorunludur" });
    }

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "En az bir ürün zorunludur" });
    }

    const shipment = await Shipment.create({
      tenantId: getTenantId(req),
      createdBy: getUserId(req),
      customerId,
      products,
      deliveryDate: new Date(deliveryDate),
      vehicleInfo: vehicleInfo || {},
      assignedPersonnel: assignedPersonnel || [],
      notes: notes?.trim(),
      status: "Planlandı",
    });

    const populated = await Shipment.findById(shipment._id)
      .populate("customerId", "ad soyad telefon")
      .populate("assignedPersonnel", "ad soyad")
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
    res.status(500).json({ message: "Sevkiyat oluşturulurken hata oluştu", error: error.message });
  }
};

// GET /api/shipments
const getShipments = async (req, res) => {
  try {
    const { status, date, customerId } = req.query;
    const filter = withTenant(req);

    if (status) filter.status = status;
    if (customerId) filter.customerId = customerId;

    // Tarih filtresi: gün bazlı arama
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.deliveryDate = { $gte: start, $lte: end };
    }

    const shipments = await Shipment.find(filter)
      .populate("customerId", "ad soyad telefon")
      .populate("assignedPersonnel", "ad soyad")
      .populate("createdBy", "ad soyad")
      .sort({ deliveryDate: 1 });

    res.status(200).json(shipments);
  } catch (error) {
    res.status(500).json({ message: "Sevkiyatlar alınırken hata oluştu", error: error.message });
  }
};

// GET /api/shipments/:id
const getShipmentById = async (req, res) => {
  try {
    const shipment = await Shipment.findOne(
      withTenant(req, { _id: req.params.id }),
    )
      .populate("customerId", "ad soyad telefon adres")
      .populate("assignedPersonnel", "ad soyad")
      .populate("createdBy", "ad soyad");

    if (!shipment) {
      return res.status(404).json({ message: "Sevkiyat bulunamadı" });
    }

    res.status(200).json(shipment);
  } catch (error) {
    res.status(500).json({ message: "Sevkiyat alınırken hata oluştu", error: error.message });
  }
};

// PUT /api/shipments/:id
const updateShipment = async (req, res) => {
  try {
    const { products, deliveryDate, vehicleInfo, assignedPersonnel, status, notes } = req.body;

    const shipment = await Shipment.findOne(
      withTenant(req, { _id: req.params.id }),
    );

    if (!shipment) {
      return res.status(404).json({ message: "Sevkiyat bulunamadı" });
    }

    if (products) shipment.products = products;
    if (deliveryDate) shipment.deliveryDate = new Date(deliveryDate);
    if (vehicleInfo !== undefined) shipment.vehicleInfo = vehicleInfo;
    if (assignedPersonnel !== undefined) shipment.assignedPersonnel = assignedPersonnel;
    if (status) {
      const validStatuses = ["Planlandı", "Yolda", "Teslim Edildi", "İptal"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Geçersiz durum" });
      }
      shipment.status = status;
    }
    if (notes !== undefined) shipment.notes = notes?.trim();

    await shipment.save();

    const populated = await Shipment.findById(shipment._id)
      .populate("customerId", "ad soyad telefon")
      .populate("assignedPersonnel", "ad soyad")
      .populate("createdBy", "ad soyad");

    res.status(200).json(populated);
  } catch (error) {
    res.status(500).json({ message: "Sevkiyat güncellenirken hata oluştu", error: error.message });
  }
};

// DELETE /api/shipments/:id
const deleteShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findOne(
      withTenant(req, { _id: req.params.id }),
    );

    if (!shipment) {
      return res.status(404).json({ message: "Sevkiyat bulunamadı" });
    }

    if (shipment.status === "Teslim Edildi") {
      return res.status(400).json({ message: "Teslim edilen sevkiyat silinemez" });
    }

    await shipment.deleteOne();
    res.status(200).json({ message: "Sevkiyat başarıyla silindi" });
  } catch (error) {
    res.status(500).json({ message: "Sevkiyat silinirken hata oluştu", error: error.message });
  }
};

module.exports = {
  createShipment,
  getShipments,
  getShipmentById,
  updateShipment,
  deleteShipment,
};
