const mongoose = require("mongoose");

const pricingSettingSchema = new mongoose.Schema(
  {
    resumePricePaise: {
      type: Number,
      default: 9900,
    },
    freeAiLimit: {
      type: Number,
      default: 2,
    },
    currency: {
      type: String,
      default: "INR",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("PricingSetting", pricingSettingSchema, "settings");
