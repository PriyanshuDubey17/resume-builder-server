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
  getResumeTemplates,
  getAtsScore,
  clearStarterContent,
  applyResumeImport,
  generatePreviewPdf,
  downloadPreviewPdf,
} = require("../controllers/resume.controller");

const {
  optimizeResume,
  generateSummary,
  improveBullet,
} = require("../controllers/ai.controller");

const {
  createResumeSchema,
  updateResumeSchema,
  applyImportSchema,
  optimizeSchema,
  validate,
} = require("../validators/resume.validator");

const {
  validateGenerateSummary,
  validateImproveBullet,
} = require("../validators/ai.validator");

const { protectCustomer, authorizeRole } = require("../middlewares/auth.middleware");
const { requireEmailVerified } = require("../utils/sanitize.utils");
const { aiOptimizeLimiter, previewPdfLimiter, importParseLimiter } = require("../middlewares/rateLimiter");
const { uploadPdf, handleMulterError } = require("../middlewares/upload.middleware");
const { parseResumeImport } = require("../controllers/resumeImport.controller");

router.get("/pricing", getPublicPricing);
router.get("/resume-templates", getResumeTemplates);

router.use(
  "/resumes",
  protectCustomer,
  authorizeRole("customer"),
  requireEmailVerified,
);

router.post("/resumes", validate(createResumeSchema), createResume);
router.post(
  "/resumes/import/parse",
  importParseLimiter,
  (req, res, next) => {
    uploadPdf.single("file")(req, res, (err) => {
      if (err) return handleMulterError(err, req, res, next);
      return next();
    });
  },
  parseResumeImport,
);
router.get("/resumes", getMyResumes);
router.get("/resumes/:id", getResumeById);
router.patch("/resumes/:id", validate(updateResumeSchema), updateResume);
router.delete("/resumes/:id", deleteResume);
router.get("/resumes/:id/preview-html", getResumePreviewHtml);
router.get("/resumes/:id/ats-score", getAtsScore);
router.post("/resumes/:id/clear-starter", clearStarterContent);
router.post("/resumes/:id/apply-import", validate(applyImportSchema), applyResumeImport);
router.get("/resumes/:id/download", downloadResume);
router.post("/resumes/:id/regenerate-pdf", regenerateResumePdfHandler);
router.post(
  "/resumes/:id/preview-pdf",
  previewPdfLimiter,
  generatePreviewPdf,
);
router.get("/resumes/:id/preview-pdf", downloadPreviewPdf);
router.post(
  "/resumes/:id/optimize",
  aiOptimizeLimiter,
  validate(optimizeSchema),
  optimizeResume,
);
router.post(
  "/resumes/:id/generate-summary",
  aiOptimizeLimiter,
  validateGenerateSummary,
  generateSummary,
);
router.post(
  "/resumes/:id/improve-bullet",
  aiOptimizeLimiter,
  validateImproveBullet,
  improveBullet,
);

module.exports = router;
