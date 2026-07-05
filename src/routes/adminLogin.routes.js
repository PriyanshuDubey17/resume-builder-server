const express = require("express");
const router = express.Router();

const {
  loginWithPin,
  refreshToken,
  logout,
} = require("../controllers/adminLogin.controller");

const {
  loginSchema,
  validate,
} = require("../validators/adminLogin.validator");

const {
  otpVerifyLimiter,
} = require("../middlewares/rateLimiter");

/* ==========================================================
 *  Admin Login Routes
 * ==========================================================
 *
 *  POST /api/admin-login/login        → rate limit + validate → loginWithPin
 *  POST /api/admin-login/refresh      → refreshToken
 *  POST /api/admin-login/logout       → logout
 *
 *  These routes are EXCLUSIVELY for admin role login.
 *  Customer / Rider will have their own route files.
 * ========================================================== */

router.post(
  "/login",
  otpVerifyLimiter,
  validate(loginSchema),
  loginWithPin,
);

router.post("/refresh", refreshToken);

router.post("/logout", logout);

module.exports = router;
