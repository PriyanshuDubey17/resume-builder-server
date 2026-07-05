const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const {
  ADMIN_ACCESS_COOKIE,
  CUSTOMER_ACCESS_COOKIE,
} = require("../utils/auth.utils");

const attachUserFromToken = async (req, token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded._id).select("-__v");

  if (!user) {
    throw new ApiError("User not found. Please login again.", 401);
  }

  if (user.status !== "active") {
    throw new ApiError("Account is blocked or inactive.", 403);
  }

  req.user = user;
};

const createProtect = (cookieName) => async (req, _res, next) => {
  try {
    const token = req.cookies?.[cookieName];
    if (!token) {
      return next(new ApiError("Access denied. Please login.", 401));
    }
    await attachUserFromToken(req, token);
    next();
  } catch (err) {
    if (err instanceof ApiError) {
      return next(err);
    }
    if (err.name === "TokenExpiredError") {
      return next(new ApiError("Session expired. Please login again.", 401));
    }
    if (err.name === "JsonWebTokenError") {
      return next(new ApiError("Invalid token. Please login again.", 401));
    }
    next(err);
  }
};

const protectAdmin = createProtect(ADMIN_ACCESS_COOKIE);
const protectCustomer = createProtect(CUSTOMER_ACCESS_COOKIE);

const authorizeRole = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError("You do not have permission to access this resource.", 403),
      );
    }
    next();
  };
};

module.exports = { protectAdmin, protectCustomer, authorizeRole };
