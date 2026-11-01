const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jsonPlugin = require("../utils/jsonPlugin");
const { ROLES } = require("../utils/constants");

const userSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: [true, "tenantId zorunludur"],
    },
    ad: { type: String, required: [true, "Ad zorunludur"], trim: true },
    soyad: { type: String, required: [true, "Soyad zorunludur"], trim: true },
    email: {
      type: String,
      required: [true, "E-posta zorunludur"],
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Şifre zorunludur"],
      minlength: [5, "Şifre en az 5 karakter olmalıdır"],
    },
    role: { type: String, enum: ROLES, default: "personel" },
    // Mağazayı kuran kişi (kilitli kurucu hesap)
    isStoreOwner: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    permissions: {
      musteriSilebilir: { type: Boolean, default: false },
      tahsilatAlabilir: { type: Boolean, default: false },
      satisYapabilir: { type: Boolean, default: false },
      stokDuzenleyebilir: { type: Boolean, default: false },
      envanterDuzenleyebilir: { type: Boolean, default: false },
      zRaporuAlabilir: { type: Boolean, default: false },
      excelExportEdebilir: { type: Boolean, default: false },
    },
    // Erişebildiği sayfalar: { dashboard, magazam, musteriler, "urun-stok", envanter, "musteri-finans", raporlar, personeller }
    allowedPages: { type: mongoose.Schema.Types.Mixed, default: undefined },
    // Geriye dönük uyumluluk için allowedPages'ten türetilir
    pageLocks: { type: mongoose.Schema.Types.Mixed, default: undefined },
    // Admin'in sayfalara atadığı özel erişim şifreleri (bcrypt hash)
    pagePasswords: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    isDeleted: { type: Boolean, default: false },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// E-posta tüm sistemde tekildir (silinmiş kullanıcılar hariç)
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
userSchema.index({ tenantId: 1, isDeleted: 1 });

userSchema.virtual("adSoyad").get(function adSoyad() {
  return `${this.ad || ""} ${this.soyad || ""}`.trim();
});

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;
  if (/^\$2[aby]\$\d{2}\$/.test(String(this.password || ""))) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(String(candidate), this.password);
};

userSchema.plugin(jsonPlugin);

module.exports = mongoose.model("User", userSchema);
