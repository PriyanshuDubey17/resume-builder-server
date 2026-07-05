const express = require("express");
const router = express.Router();

const {
  register,
  sendOtp,
  verifyOtp,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
} = require("../controllers/customerAuth.controller");

const {
  registerSchema,
  loginSchema,
  sendOtpSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  validate,
} = require("../validators/customerAuth.validator");

const { protectCustomer, authorizeRole } = require("../middlewares/auth.middleware");
const {
  otpSendLimiter,
  otpVerifyLimiter,
} = require("../middlewares/rateLimiter");

router.post("/register", validate(registerSchema), register);
router.post("/send-otp", otpSendLimiter, validate(sendOtpSchema), sendOtp);
router.post("/verify-otp", otpVerifyLimiter, validate(verifyOtpSchema), verifyOtp);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", refreshToken);
router.post("/logout", logout);
router.post("/forgot-password", otpSendLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", otpVerifyLimiter, validate(resetPasswordSchema), resetPassword);
router.get("/me", protectCustomer, authorizeRole("customer"), getMe);

module.exports = router;
