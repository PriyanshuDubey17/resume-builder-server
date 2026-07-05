const { z } = require("zod");
const ApiError = require("../utils/ApiError");

const emailSchema = z
  .string({ required_error: "Email is required" })
  .trim()
  .email("Enter a valid email address")
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string({ required_error: "Password is required" })
  .min(8, "Password must be at least 8 characters");

const otpSchema = z
  .string({ required_error: "OTP is required" })
  .trim()
  .regex(/^\d{6}$/, "OTP must be exactly 6 digits");

const registerSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters"),
  email: emailSchema,
  password: passwordSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

const sendOtpSchema = z.object({
  email: emailSchema,
  purpose: z.enum(["register", "reset"]).optional().default("register"),
});

const verifyOtpSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
  purpose: z.enum(["register", "reset"]).optional().default("register"),
});

const forgotPasswordSchema = z.object({
  email: emailSchema,
});

const resetPasswordSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
  newPassword: passwordSchema,
});

const validate = (schema) => (req, _res, next) => {
  try {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const zodErrors = result.error?.issues || result.error?.errors || [];
      const errors = zodErrors.map((e) => ({
        field: (e.path || []).join(".") || "unknown",
        message: e.message || "Invalid value",
      }));

      const summary = errors.length > 0
        ? errors.map((e) => e.field !== "unknown" ? `${e.field}: ${e.message}` : e.message).join("; ")
        : "Validation failed";

      return next(new ApiError(summary, 400, errors));
    }

    req.body = result.data;
    next();
  } catch (err) {
    return next(new ApiError("Invalid request data. Please check your input.", 400));
  }
};

module.exports = {
  registerSchema,
  loginSchema,
  sendOtpSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  validate,
};
