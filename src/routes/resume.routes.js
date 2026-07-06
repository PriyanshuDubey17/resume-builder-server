const express = require("express");
const router = express.Router();

const {
  createResume,
  getMyResumes,
  getResumeById,
  updateResume,
  deleteResume,
  getResumePreviewHtml,
  downloadResume,
  regenerateResumePdfHandler,
  getPublicPricing,
} = require("../controllers/resume.controller");

const { optimizeResume } = require("../controllers/ai.controller");

const {
  createResumeSchema,
  updateResumeSchema,
  optimizeSchema,
  validate,
} = require("../validators/resume.validator");

const { protectCustomer, authorizeRole } = require("../middlewares/auth.middleware");
const { requireEmailVerified } = require("../utils/sanitize.utils");
const { aiOptimizeLimiter } = require("../middlewares/rateLimiter");

router.get("/pricing", getPublicPricing);

// Scope auth to resume routes only — a bare router.use() would intercept
// every /api/* path (e.g. /api/admin/stats) before later routers run.
router.use(
  "/resumes",
  protectCustomer,
  authorizeRole("customer"),
  requireEmailVerified,
);

router.post("/resumes", validate(createResumeSchema), createResume);
router.get("/resumes", getMyResumes);
router.get("/resumes/:id", getResumeById);
router.patch("/resumes/:id", validate(updateResumeSchema), updateResume);
router.delete("/resumes/:id", deleteResume);
router.get("/resumes/:id/preview-html", getResumePreviewHtml);
router.get("/resumes/:id/download", downloadResume);
router.post("/resumes/:id/regenerate-pdf", regenerateResumePdfHandler);
router.post(
  "/resumes/:id/optimize",
  aiOptimizeLimiter,
  validate(optimizeSchema),
  optimizeResume,
);

module.exports = router;
