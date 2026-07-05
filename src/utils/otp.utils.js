const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const Otp = require("../models/Otp");
const ApiError = require("./ApiError");

const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;

const generateOtpCode = () => {
  return crypto.randomInt(100000, 999999).toString();
};

const hashOtp = async (otp) => {
  return bcrypt.hash(otp, 10);
};

const verifyOtpHash = async (otp, hashedOtp) => {
  return bcrypt.compare(otp, hashedOtp);
};

const createAndStoreOtp = async (email, purpose) => {
  const normalizedEmail = email.toLowerCase().trim();
  const otpCode = generateOtpCode();
  const hashedOtp = await hashOtp(otpCode);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await Otp.deleteMany({ email: normalizedEmail, purpose });

  await Otp.create({
    email: normalizedEmail,
    hashedOtp,
    purpose,
    expiresAt,
    attempts: 0,
  });

  return otpCode;
};

const verifyStoredOtp = async (email, purpose, otp) => {
  const normalizedEmail = email.toLowerCase().trim();
  const otpRecord = await Otp.findOne({ email: normalizedEmail, purpose }).select(
    "+hashedOtp",
  );

  if (!otpRecord) {
    throw new ApiError("OTP expired or not found. Please request a new one.", 400);
  }

  if (!otpRecord.hashedOtp) {
    await Otp.deleteOne({ _id: otpRecord._id });
    throw new ApiError("OTP record is invalid. Please request a new one.", 400);
  }

  if (otpRecord.expiresAt < new Date()) {
    await Otp.deleteOne({ _id: otpRecord._id });
    throw new ApiError("OTP has expired. Please request a new one.", 400);
  }

  if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
    await Otp.deleteOne({ _id: otpRecord._id });
    throw new ApiError("Too many failed attempts. Please request a new OTP.", 429);
  }

  const isValid = await verifyOtpHash(otp, otpRecord.hashedOtp);

  if (!isValid) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    throw new ApiError("Invalid OTP. Please try again.", 401);
  }

  await Otp.deleteOne({ _id: otpRecord._id });
  return true;
};

const buildOtpEmailHtml = (otp, purpose) => {
  const actionLabel = purpose === "reset" ? "reset your password" : "verify your email";
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #A13625;">Resume Builder</h2>
      <p>Use the OTP below to ${actionLabel}:</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #1C1C19;">${otp}</p>
      <p style="color: #5C5A54;">This OTP expires in ${OTP_EXPIRY_MINUTES} minutes. Do not share it with anyone.</p>
    </div>
  `;
};

module.exports = {
  OTP_EXPIRY_MINUTES,
  generateOtpCode,
  createAndStoreOtp,
  verifyStoredOtp,
  buildOtpEmailHtml,
};
