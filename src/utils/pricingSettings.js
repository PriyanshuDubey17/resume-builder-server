const PricingSetting = require("../models/PricingSetting");

const DEFAULT_PRICING = {
  resumePricePaise: Number(process.env.RESUME_PRICE_PAISE || 9900),
  freeAiLimit: 2,
  currency: "INR",
};

const migrateLegacyDocIfNeeded = async (rawDoc) => {
  const legacyPricing = rawDoc?.pricing;
  if (!legacyPricing || typeof legacyPricing !== "object") {
    return null;
  }

  if (rawDoc.resumePricePaise != null) {
    return null;
  }

  await PricingSetting.collection.updateOne(
    { _id: rawDoc._id },
    {
      $set: {
        resumePricePaise:
          legacyPricing.resumePricePaise ?? DEFAULT_PRICING.resumePricePaise,
        freeAiLimit: legacyPricing.freeAiLimit ?? DEFAULT_PRICING.freeAiLimit,
        currency: legacyPricing.currency ?? DEFAULT_PRICING.currency,
      },
      $unset: {
        pricing: "",
        contact: "",
        socialLinks: "",
        maintenance: "",
      },
    },
  );

  return PricingSetting.findById(rawDoc._id);
};

const getOrCreatePricingSetting = async () => {
  const rawDoc = await PricingSetting.collection.findOne({});
  if (!rawDoc) {
    return PricingSetting.create({});
  }

  const migrated = await migrateLegacyDocIfNeeded(rawDoc);
  if (migrated) {
    return migrated;
  }

  const pricingSetting = await PricingSetting.findById(rawDoc._id);
  if (pricingSetting) {
    return pricingSetting;
  }

  return PricingSetting.create({});
};

const getPricingSnapshot = (pricingSetting) => ({
  resumePricePaise:
    pricingSetting?.resumePricePaise ?? DEFAULT_PRICING.resumePricePaise,
  freeAiLimit: pricingSetting?.freeAiLimit ?? DEFAULT_PRICING.freeAiLimit,
  currency: pricingSetting?.currency ?? DEFAULT_PRICING.currency,
});

const getResumePricePaise = async () => {
  const pricingSetting = await getOrCreatePricingSetting();
  return getPricingSnapshot(pricingSetting).resumePricePaise;
};

const getFreeAiLimit = async () => {
  const pricingSetting = await getOrCreatePricingSetting();
  return getPricingSnapshot(pricingSetting).freeAiLimit;
};

module.exports = {
  DEFAULT_PRICING,
  getOrCreatePricingSetting,
  getPricingSnapshot,
  getResumePricePaise,
  getFreeAiLimit,
};
