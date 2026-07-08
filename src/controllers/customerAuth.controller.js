const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { sendEmail } = require("../utils/email/email.service");
const {
  createAndStoreOtp,
  verifyStoredOtp,
  buildOtpEmailHtml,
} = require("../utils/otp.utils");
const {
  generateAccessToken,
  generateRefreshToken,
  setCustomerTokenCookies,
  setCustomerAccessTokenCookie,
  clearCustomerTokenCookies,
  getSafeUserPayload,
  CUSTOMER_REFRESH_COOKIE,
} = require("../utils/auth.utils");

const sendOtpEmail = async (email, purpose) => {
  const otpCode = await createAndStoreOtp(email, purpose);
  await sendEmail({
    to: email,
    subject: purpose === "reset"
      ? "Reset your Resume Builder password"
      : "Verify your Resume Builder email",
    text: `Your OTP is ${otpCode}. It expires in 10 minutes.`,
    html: buildOtpEmailHtml(otpCode, purpose),
  });
};

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new ApiError("An account with this email already exists.", 400));
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: "customer",
      emailVerified: true,
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    setCustomerTokenCookies(res, accessToken, refreshToken);

    res.status(201).json(
      new ApiResponse(201, "Account created successfully.", {
        user: getSafeUserPayload(user),
      }),
    );
  } catch (error) {
    next(error);
  }
};

const sendOtp = async (req, res, next) => {
  try {
    const { email, purpose } = req.body;

    const user = await User.findOne({ email, role: "customer" });
    if (!user) {
      return next(new ApiError("Account not found.", 404));
    }

    if (purpose === "register" && user.emailVerified) {
      return next(new ApiError("Email is already verified.", 400));
    }

    await sendOtpEmail(email, purpose);

    res.status(200).json(new ApiResponse(200, "OTP sent to your email."));
  } catch (error) {
    next(error);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp, purpose } = req.body;

    const user = await User.findOne({ email, role: "customer" });
    if (!user) {
      return next(new ApiError("Account not found.", 404));
    }

    await verifyStoredOtp(email, purpose, otp);

    if (purpose === "register") {
      user.emailVerified = true;
      await user.save();

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      setCustomerTokenCookies(res, accessToken, refreshToken);

      return res.status(200).json(new ApiResponse(200, "OTP verified successfully.", {
        emailVerified: user.emailVerified,
        user: getSafeUserPayload(user),
      }));
    }

    res.status(200).json(new ApiResponse(200, "OTP verified successfully.", {
      emailVerified: user.emailVerified,
    }));
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, role: "customer" }).select("+passwordHash");
    if (!user) {
      return next(new ApiError("Invalid email or password.", 401));
    }

    if (user.status !== "active") {
      return next(new ApiError("Account is blocked or inactive.", 403));
    }

    if (!user.passwordHash) {
      return next(new ApiError("Invalid email or password.", 401));
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return next(new ApiError("Invalid email or password.", 401));
    }

    if (!user.emailVerified) {
      return next(new ApiError("Please verify your email before logging in.", 403));
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    setCustomerTokenCookies(res, accessToken, refreshToken);

    user.lastLoginAt = new Date();
    await user.save();

    res.status(200).json(new ApiResponse(200, "Login successful", {
      user: getSafeUserPayload(user),
    }));
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.[CUSTOMER_REFRESH_COOKIE];

    if (!token) {
      return next(new ApiError("Refresh token missing. Please login.", 401));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      clearCustomerTokenCookies(res);
      if (err.name === "TokenExpiredError") {
        return next(new ApiError("Session expired. Please login again.", 401));
      }
      return next(new ApiError("Invalid refresh token. Please login.", 401));
    }

    const user = await User.findById(decoded._id);
    if (!user) {
      clearCustomerTokenCookies(res);
      return next(new ApiError("User not found. Please login again.", 401));
    }

    if (user.role !== "customer") {
      clearCustomerTokenCookies(res);
      return next(new ApiError("Not authorized. Customer access only.", 403));
    }

    if (user.status !== "active") {
      clearCustomerTokenCookies(res);
      return next(new ApiError("Account is blocked or inactive.", 403));
    }

    const newAccessToken = generateAccessToken(user);
    setCustomerAccessTokenCookie(res, newAccessToken);

    res.status(200).json(new ApiResponse(200, "Token refreshed successfully", {
      user: getSafeUserPayload(user),
    }));
  } catch (error) {
    next(error);
  }
};

const logout = async (_req, res, next) => {
  try {
    clearCustomerTokenCookies(res);
    res.status(200).json(new ApiResponse(200, "Logged out successfully"));
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email, role: "customer" });
    if (!user) {
      return res.status(200).json(
        new ApiResponse(200, "If an account exists, an OTP has been sent to your email."),
      );
    }

    await sendOtpEmail(email, "reset");

    res.status(200).json(
      new ApiResponse(200, "If an account exists, an OTP has been sent to your email."),
    );
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email, role: "customer" }).select("+passwordHash");
    if (!user) {
      return next(new ApiError("Account not found.", 404));
    }

    await verifyStoredOtp(email, "reset", otp);

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.status(200).json(new ApiResponse(200, "Password reset successfully. You can now login."));
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    res.status(200).json(new ApiResponse(200, "Profile fetched successfully", {
      user: getSafeUserPayload(req.user),
    }));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  sendOtp,
  verifyOtp,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
};
