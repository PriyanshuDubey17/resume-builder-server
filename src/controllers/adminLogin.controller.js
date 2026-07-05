const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const {
  generateAccessToken,
  generateRefreshToken,
  setAdminTokenCookies,
  setAdminAccessTokenCookie,
  clearAdminTokenCookies,
  getSafeUserPayload,
  ADMIN_REFRESH_COOKIE,
} = require("../utils/auth.utils");

const loginWithPin = async (req, res, next) => {
  try {
    const { phone, pin } = req.body;
    const user = await User.findOne({ mobile: phone }).select("+pinHash");

    if (!user) {
      return next(new ApiError("Account not found", 404));
    }

    if (user.role !== "admin") {
      return next(new ApiError("Not authorized. Admin access only.", 403));
    }

    if (user.status !== "active") {
      return next(
        new ApiError("Account is blocked or inactive. Contact support.", 403),
      );
    }

    if (!user.pinHash) {
      return next(new ApiError("PIN is not set for this account.", 400));
    }

    const isPinValid = await bcrypt.compare(pin, user.pinHash);
    if (!isPinValid) {
      return next(new ApiError("Invalid PIN.", 401));
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    setAdminTokenCookies(res, accessToken, refreshToken);
    user.lastLoginAt = new Date();
    await user.save();

    const response = new ApiResponse(200, "Login successful", {
      user: getSafeUserPayload(user),
    });
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.[ADMIN_REFRESH_COOKIE];

    if (!token) {
      return next(new ApiError("Refresh token missing. Please login.", 401));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      clearAdminTokenCookies(res);
      if (err.name === "TokenExpiredError") {
        return next(new ApiError("Session expired. Please login again.", 401));
      }
      return next(new ApiError("Invalid refresh token. Please login.", 401));
    }

    const user = await User.findById(decoded._id);

    if (!user) {
      clearAdminTokenCookies(res);
      return next(new ApiError("User not found. Please login again.", 401));
    }

    if (user.role !== "admin") {
      clearAdminTokenCookies(res);
      return next(new ApiError("Not authorized. Admin access only.", 403));
    }

    if (user.status !== "active") {
      clearAdminTokenCookies(res);
      return next(new ApiError("Account is blocked or inactive.", 403));
    }

    const newAccessToken = generateAccessToken(user);
    setAdminAccessTokenCookie(res, newAccessToken);

    const response = new ApiResponse(200, "Token refreshed successfully", {
      user: getSafeUserPayload(user),
    });
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

const logout = async (_req, res, next) => {
  try {
    clearAdminTokenCookies(res);
    const response = new ApiResponse(200, "Logged out successfully");
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

module.exports = { loginWithPin, refreshToken, logout };
