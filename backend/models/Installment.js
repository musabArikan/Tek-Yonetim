const mongoose = require("mongoose");

const installmentSchema = new mongoose.Schema(
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
    // Taksit grubu tanımlayıcısı (tüm taksitler aynı groupId'yi paylaşır)
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
    },
    totalAmount: {
      type: Number,
      required: [true, "Toplam tutar zorunludur"],
      min: [0, "Tutar negatif olamaz"],
    },
    installmentCount: {
      type: Number,
      required: [true, "Toplam taksit sayısı zorunludur"],
      min: [1, "En az 1 taksit olmalıdır"],
    },
    // Örn: "1/12", "2/12" vb.
    installmentNumber: {
      type: String,
      required: [true, "Taksit numarası zorunludur"],
      trim: true,
    },
    dueDate: {
      type: Date,
      required: [true, "Vade tarihi zorunludur"],
    },
    amount: {
      type: Number,
      required: [true, "Taksit tutarı zorunludur"],
      min: [0, "Tutar negatif olamaz"],
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, "Ödenen tutar negatif olamaz"],
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["Bekliyor", "Kısmi Ödendi", "Ödendi", "Gecikmiş"],
      default: "Bekliyor",
    },
    productNames: {
      type: [String],
      default: [],
    },
    paidDate: {
      type: Date,
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
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

installmentSchema.index({ tenantId: 1, customerId: 1, dueDate: 1 });
installmentSchema.index({ tenantId: 1, dueDate: 1, isPaid: 1 });
installmentSchema.index({ tenantId: 1, groupId: 1 });

module.exports = mongoose.model("Installment", installmentSchema);
