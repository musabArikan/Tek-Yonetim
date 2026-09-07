const mongoose = require("mongoose");

const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Şirket adı zorunludur"],
      trim: true,
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

tenantSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model("Tenant", tenantSchema);
