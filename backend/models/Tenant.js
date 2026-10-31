const mongoose = require("mongoose");

const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Mağaza / şirket adı zorunludur"],
      trim: true,
    },
    ownerName: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    modules: {
      subeTransfer: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  },
);

// Mağaza adı aynı olabilir (tekillik kısıtlaması yoktur)
tenantSchema.index({ name: 1 });

module.exports = mongoose.model("Tenant", tenantSchema);
