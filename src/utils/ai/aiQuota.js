const ApiError = require("../ApiError");
const { getFreeAiLimit } = require("../pricingSettings");

const assertAiQuota = async (resume) => {
  const freeAiLimit = await getFreeAiLimit();
  const usageCount = resume.aiMeta?.usageCount || 0;

  if (resume.status !== "paid" && usageCount >= freeAiLimit) {
    throw new ApiError(
      `Free AI limit reached (${freeAiLimit}). Pay to unlock unlimited AI features.`,
      403,
    );
  }

  return { freeAiLimit, usageCount };
};

const incrementAiUsage = async (resume) => {
  const usageCount = (resume.aiMeta?.usageCount || 0) + 1;
  resume.aiMeta = {
    ...resume.aiMeta,
    usageCount,
    lastOptimizedAt: new Date(),
  };
  await resume.save();
  return usageCount;
};

module.exports = { assertAiQuota, incrementAiUsage };
