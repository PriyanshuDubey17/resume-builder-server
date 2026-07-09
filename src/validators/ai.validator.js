const { z } = require("zod");
const ApiError = require("../utils/ApiError");

const generateSummarySchema = z.object({
  targetRole: z
    .string({ required_error: "Target role is required" })
    .trim()
    .min(2, "Target role must be at least 2 characters")
    .max(120),
  yearsExperience: z.string().max(30).optional().default(""),
});

const improveBulletSchema = z.object({
  experienceIndex: z.number().int().min(0),
  bulletIndex: z.number().int().min(0),
});

const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.errors[0]?.message || "Invalid input";
    return next(new ApiError(message, 400));
  }
  req.body = result.data;
  next();
};

module.exports = {
  validateGenerateSummary: validate(generateSummarySchema),
  validateImproveBullet: validate(improveBulletSchema),
};
