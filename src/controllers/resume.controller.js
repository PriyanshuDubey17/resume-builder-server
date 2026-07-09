const Resume = require("../models/Resume");
const axios = require("axios");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const {
  getOrCreatePricingSetting,
  getPricingSnapshot,
} = require("../utils/pricingSettings");
const { getActiveTemplateBySlug } = require("../constants/resumeTemplates");
const { renderResumeHtml } = require("../utils/resumeHtml.renderer");
const { getSignedDownloadUrl } = require("../utils/cloudinary");
const { buildStarterResumeContent } = require("../constants/starterResumeContent");
const { normalizeImportedResume } = require("../utils/import/normalizeImportedResume");
const { isPdfStale, isPreviewPdfStale, regenerateResumePdf, regeneratePreviewPdf, generatePreviewPdfBuffer, uploadPreviewPdf, generatePdfBuffer } = require("../utils/pdf.service");
const { analyzeResumeAts } = require("../utils/ats/atsAnalyzer");
const { RESUME_TEMPLATES } = require("../constants/resumeTemplates");

const buildResumeFileName = (resume) => {
  const safeName = (resume.personal?.fullName || "resume")
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);

  return `${safeName || "resume"}.pdf`;
};

const createResume = async (req, res, next) => {
  try {
    const { templateSlug, source = "starter", importedData, importFileName = "" } = req.body;

    const template = getActiveTemplateBySlug(templateSlug);
    if (!template) {
      return next(new ApiError("Invalid or inactive template.", 400));
    }

    let resumePayload = {
      userId: req.user._id,
      templateSlug,
    };

    if (source === "import") {
      const { data: normalized } = normalizeImportedResume(importedData);
      resumePayload = {
        ...resumePayload,
        personal: normalized.personal,
        education: normalized.education,
        experience: normalized.experience,
        projects: normalized.projects,
        skills: normalized.skills,
        certifications: normalized.certifications,
        languages: normalized.languages,
        importMeta: {
          source: "pdf",
          importedAt: new Date(),
          fileName: (importFileName || "").trim().slice(0, 200),
        },
      };
    } else {
      const starter = buildStarterResumeContent(req.user);
      resumePayload = {
        ...resumePayload,
        personal: starter.personal,
        education: starter.education,
        experience: starter.experience,
        projects: starter.projects,
        skills: starter.skills,
        certifications: starter.certifications,
        languages: starter.languages,
      };
    }

    const resume = await Resume.create(resumePayload);

    res.status(201).json(new ApiResponse(201, "Resume created", { resume }));
  } catch (error) {
    next(error);
  }
};

const getMyResumes = async (req, res, next) => {
  try {
    const resumes = await Resume.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .select("-aiMeta.lastSuggestions");

    res.status(200).json(new ApiResponse(200, "Resumes fetched", { resumes }));
  } catch (error) {
    next(error);
  }
};

const getResumeById = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!resume) {
      return next(new ApiError("Resume not found.", 404));
    }

    res.status(200).json(new ApiResponse(200, "Resume fetched", { resume }));
  } catch (error) {
    next(error);
  }
};

const updateResume = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!resume) {
      return next(new ApiError("Resume not found.", 404));
    }

    if (req.body.templateSlug) {
      const template = getActiveTemplateBySlug(req.body.templateSlug);
      if (!template) {
        return next(new ApiError("Invalid or inactive template.", 400));
      }
      resume.templateSlug = req.body.templateSlug;
    }

    const fields = [
      "personal",
      "education",
      "experience",
      "projects",
      "skills",
      "certifications",
      "languages",
      "jobDescription",
      "status",
    ];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === "skills" && Array.isArray(req.body.skills)) {
          resume.skills = req.body.skills
            .map((skill) => ({
              name: (skill?.name || "").trim(),
              level: (skill?.level || "").trim(),
            }))
            .filter((skill) => skill.name.length > 0);
        } else {
          resume[field] = req.body[field];
        }
      }
    });

    resume.lastEditedAt = new Date();
    await resume.save();

    res.status(200).json(new ApiResponse(200, "Resume saved", { resume }));
  } catch (error) {
    next(error);
  }
};

const deleteResume = async (req, res, next) => {
  try {
    const resume = await Resume.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!resume) {
      return next(new ApiError("Resume not found.", 404));
    }

    res.status(200).json(new ApiResponse(200, "Resume deleted"));
  } catch (error) {
    next(error);
  }
};

const getResumePreviewHtml = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!resume) {
      return next(new ApiError("Resume not found.", 404));
    }

    const showWatermark =
      req.query.variant === "download" ? false : resume.status !== "paid";
    const html = renderResumeHtml(resume, showWatermark);

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (error) {
    next(error);
  }
};

const downloadResume = async (req, res, next) => {
  try {
    let resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!resume) {
      return next(new ApiError("Resume not found.", 404));
    }

    if (resume.status !== "paid" || !resume.pdfUrl) {
      return next(new ApiError("Payment required before download.", 403));
    }

    let regenerated = false;
    if (isPdfStale(resume)) {
      resume = await regenerateResumePdf(resume);
      regenerated = true;
    }

    const fileName = buildResumeFileName(resume);
    const pdfSourceUrl = resume.pdfPublicId
      ? getSignedDownloadUrl(resume.pdfPublicId)
      : resume.pdfUrl;

    const pdfResponse = await axios.get(pdfSourceUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("X-Download-Filename", fileName);
    if (regenerated) {
      res.setHeader("X-Pdf-Regenerated", "true");
    }

    res.send(Buffer.from(pdfResponse.data));
  } catch (error) {
    if (error.response) {
      return next(new ApiError("Failed to fetch PDF for download.", 502));
    }
    next(error);
  }
};

const regenerateResumePdfHandler = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!resume) {
      return next(new ApiError("Resume not found.", 404));
    }

    if (resume.status !== "paid") {
      return next(new ApiError("Payment required before regenerating PDF.", 403));
    }

    const updatedResume = await regenerateResumePdf(resume);

    res.status(200).json(new ApiResponse(200, "PDF regenerated", { resume: updatedResume }));
  } catch (error) {
    next(error);
  }
};

const getPublicPricing = async (_req, res, next) => {
  try {
    const pricingSetting = await getOrCreatePricingSetting();

    res.status(200).json(new ApiResponse(200, "Pricing fetched", {
      pricing: getPricingSnapshot(pricingSetting),
    }));
  } catch (error) {
    next(error);
  }
};

const getResumeTemplates = async (_req, res, next) => {
  try {
    const templates = [...RESUME_TEMPLATES].sort((a, b) => {
      const tierOrder = { A: 0, B: 1, C: 2 };
      const tierDiff = (tierOrder[a.atsTier] ?? 9) - (tierOrder[b.atsTier] ?? 9);
      if (tierDiff !== 0) return tierDiff;
      return (b.atsStaticScore || 0) - (a.atsStaticScore || 0);
    });
    res.status(200).json(new ApiResponse(200, "Templates fetched", { templates }));
  } catch (error) {
    next(error);
  }
};

const getAtsScore = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!resume) {
      return next(new ApiError("Resume not found.", 404));
    }

    const analysis = analyzeResumeAts(resume);
    res.status(200).json(new ApiResponse(200, "ATS score calculated", { ats: analysis }));
  } catch (error) {
    next(error);
  }
};

const clearStarterContent = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!resume) {
      return next(new ApiError("Resume not found.", 404));
    }

    resume.personal = {
      fullName: resume.personal?.fullName || "",
      email: resume.personal?.email || "",
      phone: "",
      location: "",
      linkedin: "",
      github: "",
      portfolio: "",
      summary: "",
    };
    resume.education = [];
    resume.experience = [];
    resume.projects = [];
    resume.skills = [];
    resume.certifications = [];
    resume.languages = [];
    resume.lastEditedAt = new Date();
    await resume.save();

    res.status(200).json(new ApiResponse(200, "Example content cleared", { resume }));
  } catch (error) {
    next(error);
  }
};

const generatePreviewPdf = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!resume) {
      return next(new ApiError("Resume not found.", 404));
    }

    if (resume.status === "paid") {
      return next(new ApiError("Use the paid download for this resume.", 400));
    }

    if (resume.previewPdfUrl && !isPreviewPdfStale(resume)) {
      return res.status(200).json(new ApiResponse(200, "Preview PDF already generated", {
        resume,
        alreadyGenerated: true,
      }));
    }

    const updatedResume = await regeneratePreviewPdf(resume);

    res.status(200).json(new ApiResponse(200, "Preview PDF generated", { resume: updatedResume }));
  } catch (error) {
    next(error);
  }
};

const renderPreviewPdf = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!resume) {
      return next(new ApiError("Resume not found.", 404));
    }

    const showWatermark = req.query.watermark !== "false";
    const pdfBuffer = await generatePdfBuffer(resume, showWatermark);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Cache-Control", "no-store");
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

const applyResumeImport = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!resume) {
      return next(new ApiError("Resume not found.", 404));
    }

    if (resume.status === "paid") {
      return next(new ApiError("Paid resumes cannot be overwritten by import.", 400));
    }

    const { importedData, importFileName = "" } = req.body;
    const { data: normalized } = normalizeImportedResume(importedData);

    resume.personal = normalized.personal;
    resume.education = normalized.education;
    resume.experience = normalized.experience;
    resume.projects = normalized.projects;
    resume.skills = normalized.skills;
    resume.certifications = normalized.certifications;
    resume.languages = normalized.languages;
    resume.importMeta = {
      source: "pdf",
      importedAt: new Date(),
      fileName: (importFileName || "").trim().slice(0, 200),
    };
    resume.lastEditedAt = new Date();
    await resume.save();

    res.status(200).json(new ApiResponse(200, "Import applied", { resume }));
  } catch (error) {
    next(error);
  }
};

const downloadPreviewPdf = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!resume) {
      return next(new ApiError("Resume not found.", 404));
    }

    if (!resume.previewPdfUrl) {
      return next(new ApiError("Generate a free preview PDF first.", 404));
    }

    if (isPreviewPdfStale(resume)) {
      await regeneratePreviewPdf(resume);
    }

    const fileName = buildResumeFileName(resume).replace(".pdf", "-preview.pdf");
    const pdfSourceUrl = resume.previewPdfPublicId
      ? getSignedDownloadUrl(resume.previewPdfPublicId)
      : resume.previewPdfUrl;

    const pdfResponse = await axios.get(pdfSourceUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("X-Download-Filename", fileName);
    res.send(Buffer.from(pdfResponse.data));
  } catch (error) {
    if (error.response) {
      return next(new ApiError("Failed to fetch preview PDF.", 502));
    }
    next(error);
  }
};

module.exports = {
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
  renderPreviewPdf,
  downloadPreviewPdf,
};
