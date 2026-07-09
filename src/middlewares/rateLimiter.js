const rateLimit = require("express-rate-limit");


/* ==========================================================
 *  Rate Limiters — Anti-abuse protection
 * ==========================================================
 *
 *  otpSendLimiter    → 5 requests  / 15 min (OTP flooding)
 *  otpVerifyLimiter  → 10 requests / 15 min (brute-force OTP guess)
 *  authGeneralLimiter → 30 requests / 15 min (general auth abuse)
 * ========================================================== */

const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    message: "Too many OTP requests. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many verification attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authGeneralLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const profileSensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many profile update attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const enquirySubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "Too many enquiry submissions. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const aiOptimizeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many AI optimization requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const previewPdfLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: "Too many preview PDF requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const importParseLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many PDF import requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  otpSendLimiter,
  otpVerifyLimiter,
  authGeneralLimiter,
  profileSensitiveLimiter,
  enquirySubmitLimiter,
  aiOptimizeLimiter,
  previewPdfLimiter,
  importParseLimiter,
};
