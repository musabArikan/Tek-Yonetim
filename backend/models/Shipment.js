const mongoose = require("mongoose");

const shipmentProductSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    urunKodu: {
      type: String,
      required: [true, "Ürün kodu zorunludur"],
      trim: true,
    },
    urunAdi: {
      type: String,
      trim: true,
    },
    adet: {
      type: Number,
      required: [true, "Adet zorunludur"],
      min: [1, "Adet en az 1 olmalıdır"],
    },
  },
  { _id: false },
);

const vehicleInfoSchema = new mongoose.Schema(
  {
    plaka: { type: String, trim: true },
    sofor: { type: String, trim: true },
    aracTuru: { type: String, trim: true },
  },
  { _id: false },
);

const shipmentSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: [true, "tenantId zorunludur"],
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "customerId zorunludur"],
    },
    products: {
      type: [shipmentProductSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "En az bir ürün zorunludur",
      },
    },
    deliveryDate: {
      type: Date,
      required: [true, "Teslimat tarihi zorunludur"],
    },
    vehicleInfo: vehicleInfoSchema,
    assignedPersonnel: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    status: {
      type: String,
      enum: ["Planlandı", "Yolda", "Teslim Edildi", "İptal"],
      default: "Planlandı",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "createdBy zorunludur"],
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

shipmentSchema.index({ tenantId: 1, deliveryDate: 1 });
shipmentSchema.index({ tenantId: 1, status: 1 });
shipmentSchema.index({ tenantId: 1, customerId: 1 });

module.exports = mongoose.model("Shipment", shipmentSchema);
