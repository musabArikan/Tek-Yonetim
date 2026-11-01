const mongoose = require("mongoose");
const jsonPlugin = require("../utils/jsonPlugin");

const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Mağaza / şirket adı zorunludur"],
      trim: true,
    },
    ownerName: { type: String, trim: true, default: "" },
    // Kurucu e-postası: mağaza oluşturulurken sabitlenir, sonradan DEĞİŞTİRİLEMEZ
    email: { type: String, trim: true, lowercase: true, default: "" },
    // Personel e-posta uzantısı (örn. "magaza.com"): kurucu e-postasından türetilir, kilitlidir
    emailDomain: { type: String, trim: true, lowercase: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    vergiDairesi: { type: String, trim: true, default: "" },
    vergiNo: { type: String, trim: true, default: "" },
    // Mağazaya özel kalıcı listeler
    customBrands: { type: [String], default: [] },
    customCategories: { type: [String], default: [] },
    customPaymentMethods: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Mağaza adı aynı olabilir (tekillik kısıtlaması yoktur)
tenantSchema.index({ name: 1 });
tenantSchema.plugin(jsonPlugin);

module.exports = mongoose.model("Tenant", tenantSchema);
