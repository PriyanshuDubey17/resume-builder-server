const jwt = require("jsonwebtoken");

const ADMIN_ACCESS_COOKIE = "adminAccessToken";
const ADMIN_REFRESH_COOKIE = "adminRefreshToken";
const CUSTOMER_ACCESS_COOKIE = "customerAccessToken";
const CUSTOMER_REFRESH_COOKIE = "customerRefreshToken";

// Legacy names — cleared on login/logout to avoid localhost cookie collisions
const LEGACY_ACCESS_COOKIE = "accessToken";
const LEGACY_REFRESH_COOKIE = "refreshToken";

const getCookieOptions = (maxAge) => {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge,
  };
};

const generateAccessToken = (user) => {
  return jwt.sign(
    { _id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "15m" },
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { _id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" },
  );
};

const clearLegacyTokenCookies = (res) => {
  const options = getCookieOptions(0);
  res.clearCookie(LEGACY_ACCESS_COOKIE, options);
  res.clearCookie(LEGACY_REFRESH_COOKIE, options);
};

const clearAdminTokenCookies = (res) => {
  const options = getCookieOptions(0);
  res.clearCookie(ADMIN_ACCESS_COOKIE, options);
  res.clearCookie(ADMIN_REFRESH_COOKIE, options);
  clearLegacyTokenCookies(res);
};

const clearCustomerTokenCookies = (res) => {
  const options = getCookieOptions(0);
  res.clearCookie(CUSTOMER_ACCESS_COOKIE, options);
  res.clearCookie(CUSTOMER_REFRESH_COOKIE, options);
  clearLegacyTokenCookies(res);
};

const setAdminTokenCookies = (res, accessToken, refreshToken) => {
  res.cookie(ADMIN_ACCESS_COOKIE, accessToken, getCookieOptions(15 * 60 * 1000));
  res.cookie(ADMIN_REFRESH_COOKIE, refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));
  clearCustomerTokenCookies(res);
};

const setAdminAccessTokenCookie = (res, accessToken) => {
  res.cookie(ADMIN_ACCESS_COOKIE, accessToken, getCookieOptions(15 * 60 * 1000));
};

const setCustomerTokenCookies = (res, accessToken, refreshToken) => {
  res.cookie(CUSTOMER_ACCESS_COOKIE, accessToken, getCookieOptions(15 * 60 * 1000));
  res.cookie(CUSTOMER_REFRESH_COOKIE, refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));
  clearAdminTokenCookies(res);
};

const setCustomerAccessTokenCookie = (res, accessToken) => {
  res.cookie(CUSTOMER_ACCESS_COOKIE, accessToken, getCookieOptions(15 * 60 * 1000));
};

const getSafeUserPayload = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  mobile: user.mobile || null,
  role: user.role,
  profilePic: user.profilePic,
  emailVerified: user.emailVerified,
  status: user.status,
});

module.exports = {
  ADMIN_ACCESS_COOKIE,
  ADMIN_REFRESH_COOKIE,
  CUSTOMER_ACCESS_COOKIE,
  CUSTOMER_REFRESH_COOKIE,
  generateAccessToken,
  generateRefreshToken,
  setAdminTokenCookies,
  setAdminAccessTokenCookie,
  clearAdminTokenCookies,
  setCustomerTokenCookies,
  setCustomerAccessTokenCookie,
  clearCustomerTokenCookies,
  getSafeUserPayload,
};
