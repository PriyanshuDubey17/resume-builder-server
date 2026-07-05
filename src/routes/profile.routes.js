const express = require("express");

const {
  getMe,
  getUploadSignature,
  updateAvatar,
  changeEmail,
  changeMobile,
  changePin,
} = require("../controllers/profile.controller");
const { protectAdmin, authorizeRole } = require("../middlewares/auth.middleware");
const { profileSensitiveLimiter } = require("../middlewares/rateLimiter");
const {
  validate,
  avatarSchema,
  emailChangeSchema,
  mobileChangeSchema,
  pinChangeSchema,
} = require("../validators/profile.validator");

const router = express.Router();

router.use(protectAdmin, authorizeRole("admin"));

router.get("/me", getMe);
router.get("/signature", getUploadSignature);
router.patch("/avatar", profileSensitiveLimiter, validate(avatarSchema), updateAvatar);
router.patch("/email", profileSensitiveLimiter, validate(emailChangeSchema), changeEmail);
router.patch("/mobile", profileSensitiveLimiter, validate(mobileChangeSchema), changeMobile);
router.patch("/pin", profileSensitiveLimiter, validate(pinChangeSchema), changePin);

module.exports = router;
