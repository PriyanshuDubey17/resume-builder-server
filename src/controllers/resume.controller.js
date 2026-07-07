const Resume = require("../models/Resume");
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
const { isPdfStale, regenerateResumePdf } = require("../utils/pdf.service");

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
    const { templateSlug } = req.body;

    const template = getActiveTemplateBySlug(templateSlug);
    if (!template) {
      return next(new ApiError("Invalid or inactive template.", 400));
    }

    const starter = buildStarterResumeContent(req.user);

    const resume = await Resume.create({
      userId: req.user._id,
      templateSlug,
      personal: starter.personal,
      education: starter.education,
      experience: starter.experience,
      projects: starter.projects,
      skills: starter.skills,
      certifications: starter.certifications,
      languages: starter.languages,
    });

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
        resume[field] = req.body[field];
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

    const showWatermark = resume.status !== "paid";
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

    let downloadUrl = resume.pdfUrl;
    const fileName = buildResumeFileName(resume);
    if (resume.pdfPublicId) {
      downloadUrl = getSignedDownloadUrl(resume.pdfPublicId, fileName);
    }

    res.status(200).json(new ApiResponse(200, "Download URL generated", {
      downloadUrl,
      fileName,
      expiresInMinutes: 15,
      regenerated,
    }));
  } catch (error) {
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
};
