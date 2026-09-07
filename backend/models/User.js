const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: [true, "tenantId zorunludur"],
    },
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
    role: {
      type: String,
      enum: ["admin", "staff"],
      default: "staff",
    },
    permissions: {
      musteriSilebilir: {
        type: Boolean,
        default: false,
      },
      tahsilatAlabilir: {
        type: Boolean,
        default: false,
      },
      satisYapabilir: {
        type: Boolean,
        default: false,
      },
      stokDuzenleyebilir: {
        type: Boolean,
        default: false,
      },
      envanterDuzenleyebilir: {
        type: Boolean,
        default: false,
      },
    },
    pageLocks: {
      stok: {
        type: Boolean,
        default: false,
      },
      envanter: {
        type: Boolean,
        default: false,
      },
      borclular: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ tenantId: 1, email: 1 }, { unique: true });
userSchema.index({ tenantId: 1 });

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
