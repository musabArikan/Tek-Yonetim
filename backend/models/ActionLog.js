const mongoose = require("mongoose");
const jsonPlugin = require("../utils/jsonPlugin");

const actionLogSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // İşlemi yapan kişinin adı (silindikten sonra da görünsün diye)
    userName: { type: String, default: "Bilinmiyor" },
    action: { type: String, required: true, trim: true },
    entityType: { type: String, default: "Other", trim: true },
    entityId: { type: mongoose.Schema.Types.Mixed },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

actionLogSchema.index({ tenantId: 1, createdAt: -1 });
actionLogSchema.plugin(jsonPlugin);

module.exports = mongoose.model("ActionLog", actionLogSchema);
