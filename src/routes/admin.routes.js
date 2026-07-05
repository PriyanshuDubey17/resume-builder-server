const express = require("express");
const router = express.Router();

const {
  listOrders,
  getPricing,
  updatePricing,
  getDashboardStats,
} = require("../controllers/admin.controller");

const { protectAdmin, authorizeRole } = require("../middlewares/auth.middleware");

router.use(protectAdmin, authorizeRole("admin"));

router.get("/stats", getDashboardStats);
router.get("/orders", listOrders);
router.get("/pricing", getPricing);
router.put("/pricing", updatePricing);

module.exports = router;
