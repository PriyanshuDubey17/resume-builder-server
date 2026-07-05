const Payment = require("../models/Payment");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const {
  getOrCreatePricingSetting,
  getPricingSnapshot,
} = require("../utils/pricingSettings");

const listOrders = async (_req, res, next) => {
  try {
    const orders = await Payment.find()
      .populate("userId", "name email")
      .populate("resumeId", "templateSlug status")
      .sort({ createdAt: -1 });

    res.status(200).json(new ApiResponse(200, "Orders fetched", { orders }));
  } catch (error) {
    next(error);
  }
};

const getPricing = async (_req, res, next) => {
  try {
    const pricingSetting = await getOrCreatePricingSetting();

    res.status(200).json(new ApiResponse(200, "Pricing fetched", {
      pricing: getPricingSnapshot(pricingSetting),
    }));
  } catch (error) {
    next(error);
  }
};

const updatePricing = async (req, res, next) => {
  try {
    const pricingSetting = await getOrCreatePricingSetting();

    const { resumePricePaise, freeAiLimit, currency } = req.body;

    if (typeof resumePricePaise === "number" && resumePricePaise > 0) {
      pricingSetting.resumePricePaise = resumePricePaise;
    }
    if (typeof freeAiLimit === "number" && freeAiLimit >= 0) {
      pricingSetting.freeAiLimit = freeAiLimit;
    }
    if (currency) pricingSetting.currency = currency;

    await pricingSetting.save();
    res.status(200).json(new ApiResponse(200, "Pricing updated", {
      pricing: getPricingSnapshot(pricingSetting),
    }));
  } catch (error) {
    next(error);
  }
};

const getDashboardStats = async (_req, res, next) => {
  try {
    const [totalOrders, paidOrders, totalRevenue] = await Promise.all([
      Payment.countDocuments(),
      Payment.countDocuments({ status: "paid" }),
      Payment.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    res.status(200).json(new ApiResponse(200, "Stats fetched", {
      stats: {
        totalOrders,
        paidOrders,
        totalRevenuePaise: totalRevenue[0]?.total || 0,
      },
    }));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listOrders,
  getPricing,
  updatePricing,
  getDashboardStats,
};
