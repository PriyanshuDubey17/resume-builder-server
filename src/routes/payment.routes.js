const express = require("express");
const router = express.Router();

const {
  createPaymentOrder,
  verifyPayment,
  getPaymentStatus,
} = require("../controllers/payment.controller");

const { protectCustomer, authorizeRole } = require("../middlewares/auth.middleware");
const { requireEmailVerified } = require("../utils/sanitize.utils");

router.use(protectCustomer, authorizeRole("customer"), requireEmailVerified);

router.post("/create-order/:resumeId", createPaymentOrder);
router.post("/verify", verifyPayment);
router.get("/status/:resumeId", getPaymentStatus);

module.exports = router;
