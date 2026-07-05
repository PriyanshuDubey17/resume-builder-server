const { z } = require("zod");
const ApiError = require("../utils/ApiError");

const pinSchema = z
  .string({ required_error: "PIN is required" })
  .trim()
  .regex(/^\d{6}$/, "PIN must be exactly 6 digits");

const emailChangeSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .email("Enter a valid email address")
    .transform((value) => value.toLowerCase()),
  currentPin: pinSchema,
});

const mobileChangeSchema = z.object({
  mobile: z
    .string({ required_error: "Mobile is required" })
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  currentPin: pinSchema,
});

const pinChangeSchema = z
  .object({
    currentPin: pinSchema,
    newPin: pinSchema,
  })
  .refine((data) => data.currentPin !== data.newPin, {
    message: "New PIN must be different from current PIN",
    path: ["newPin"],
  });

const avatarSchema = z.object({
  profilePic: z
    .string({ required_error: "profilePic URL is required" })
    .trim()
    .url("profilePic must be a valid URL"),
  profilePicPublicId: z
    .string({ required_error: "profilePicPublicId is required" })
    .trim()
    .min(1, "profilePicPublicId is required"),
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
        ? errors.map((e) => (e.field !== "unknown" ? `${e.field}: ${e.message}` : e.message)).join("; ")
        : "Validation failed";
      return next(new ApiError(summary, 400, errors));
    }
    req.body = result.data;
    next();
  } catch (_error) {
    return next(new ApiError("Invalid request data. Please check your input.", 400));
  }
};

module.exports = {
  emailChangeSchema,
  mobileChangeSchema,
  pinChangeSchema,
  avatarSchema,
  validate,
};
