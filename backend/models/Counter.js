const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  {
    versionKey: false,
  },
);

module.exports = mongoose.model("Counter", counterSchema);
