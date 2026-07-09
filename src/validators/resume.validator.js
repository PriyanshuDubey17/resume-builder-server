const { z } = require("zod");
const ApiError = require("../utils/ApiError");
const { sanitizeResumeData } = require("../utils/sanitize.utils");
const { ALLOWED_TEMPLATE_SLUGS } = require("../constants/resumeTemplates");
const { importedResumeDataSchema } = require("../utils/import/normalizeImportedResume");
const personalSchema = z.object({
  fullName: z.string().max(120).optional().default(""),
  email: z.string().max(120).optional().default(""),
  phone: z.string().max(30).optional().default(""),
  location: z.string().max(120).optional().default(""),
  linkedin: z.string().max(200).optional().default(""),
  github: z.string().max(200).optional().default(""),
  portfolio: z.string().max(200).optional().default(""),
  summary: z.string().max(2000).optional().default(""),
});

const educationItemSchema = z.object({
  school: z.string().max(120).optional().default(""),
  degree: z.string().max(120).optional().default(""),
  field: z.string().max(120).optional().default(""),
  startDate: z.string().max(30).optional().default(""),
  endDate: z.string().max(30).optional().default(""),
  gpa: z.string().max(20).optional().default(""),
});

const experienceItemSchema = z.object({
  company: z.string().max(120).optional().default(""),
  role: z.string().max(120).optional().default(""),
  startDate: z.string().max(30).optional().default(""),
  endDate: z.string().max(30).optional().default(""),
  isCurrent: z.boolean().optional().default(false),
  bullets: z.array(z.string().max(500)).optional().default([]),
});

const projectItemSchema = z.object({
  name: z.string().max(120).optional().default(""),
  role: z.string().max(120).optional().default(""),
  startDate: z.string().max(30).optional().default(""),
  endDate: z.string().max(30).optional().default(""),
  isCurrent: z.boolean().optional().default(false),
  url: z.string().max(200).optional().default(""),
  techStack: z.string().max(200).optional().default(""),
  bullets: z.array(z.string().max(500)).optional().default([]),
});

const skillItemSchema = z.object({
  name: z.string().max(60).optional().default(""),
  level: z.string().max(30).optional().default(""),
});

const certificationItemSchema = z.object({
  name: z.string().max(120).optional().default(""),
  issuer: z.string().max(120).optional().default(""),
  date: z.string().max(30).optional().default(""),
  url: z.string().max(200).optional().default(""),
});

const languageItemSchema = z.object({
  name: z.string().max(60).optional().default(""),
  level: z.string().max(30).optional().default(""),
});

const templateSlugSchema = z.enum(ALLOWED_TEMPLATE_SLUGS, {
  errorMap: () => ({ message: "Invalid template." }),
});

const createResumeSchema = z
  .object({
    templateSlug: templateSlugSchema,
    source: z.enum(["starter", "import"]).optional().default("starter"),
    importedData: importedResumeDataSchema.optional(),
    importFileName: z.string().max(200).optional().default(""),
  })
  .superRefine((data, ctx) => {
    if (data.source === "import" && !data.importedData) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "importedData is required when source is import.",
        path: ["importedData"],
      });
    }
    if (data.source === "starter" && data.importedData) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "importedData is not allowed when source is starter.",
        path: ["importedData"],
      });
    }
  });

const updateResumeSchema = z.object({
  templateSlug: templateSlugSchema.optional(),  status: z.enum(["draft", "completed"]).optional(),
  personal: personalSchema.optional(),
  education: z.array(educationItemSchema).optional(),
  experience: z.array(experienceItemSchema).optional(),
  projects: z.array(projectItemSchema).optional(),
  skills: z.array(skillItemSchema).optional(),
  certifications: z.array(certificationItemSchema).optional(),
  languages: z.array(languageItemSchema).optional(),
  jobDescription: z.string().max(10000).optional(),
});

const applyImportSchema = z.object({
  importedData: importedResumeDataSchema,
  importFileName: z.string().max(200).optional().default(""),
});

const optimizeSchema = z.object({
  jobDescription: z
    .string({ required_error: "Job description is required" })
    .trim()
    .min(20, "Job description must be at least 20 characters")
    .max(10000),
});

const validate = (schema) => (req, _res, next) => {
  try {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const zodErrors = result.error?.issues || [];
      const errors = zodErrors.map((e) => ({
        field: (e.path || []).join(".") || "unknown",
        message: e.message || "Invalid value",
      }));
      const summary = errors.map((e) => `${e.field}: ${e.message}`).join("; ");
      return next(new ApiError(summary || "Validation failed", 400, errors));
    }

    req.body = sanitizeResumeData(result.data);
    next();
  } catch (err) {
    return next(new ApiError("Invalid request data.", 400));
  }
};

module.exports = {
  createResumeSchema,
  updateResumeSchema,
  applyImportSchema,
  optimizeSchema,
  importedResumeDataSchema,
  validate,
};
