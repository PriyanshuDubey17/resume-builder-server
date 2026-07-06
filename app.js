const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const corsOptions = require("./src/config/cors");
const errorHandler = require("./src/middlewares/errorHandler");
const ApiError = require("./src/utils/ApiError");
const app = express();
const cookieParser = require("cookie-parser");

app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(cors(corsOptions));

const { handleWebhook } = require("./src/controllers/payment.controller");
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    try {
      req.rawBody = req.body.toString();
      req.body = JSON.parse(req.rawBody);
    } catch {
      return next(new ApiError("Invalid webhook payload", 400));
    }
    next();
  },
  handleWebhook,
);

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

/* ── Routes ── */
const adminLoginRoutes = require("./src/routes/adminLogin.routes");
const customerAuthRoutes = require("./src/routes/customerAuth.routes");
const resumeRoutes = require("./src/routes/resume.routes");
const paymentRoutes = require("./src/routes/payment.routes");
const adminRoutes = require("./src/routes/admin.routes");
const profileRoutes = require("./src/routes/profile.routes");
const { authGeneralLimiter } = require("./src/middlewares/rateLimiter");

app.use("/api/admin-login", authGeneralLimiter, adminLoginRoutes);
app.use("/api/auth", authGeneralLimiter, customerAuthRoutes);
app.use("/api", resumeRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);

app.use("/api/admin/profile", profileRoutes);
app.use("/",(req, res)=>{
  res.json({ message: "Welcome to the API" });
});

// 404 handler
app.use((req, res, next) => {
  next(new ApiError("Route not found", 404));
});

// error handler
app.use(errorHandler);

module.exports = app;
