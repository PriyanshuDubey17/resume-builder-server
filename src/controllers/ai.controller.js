const Resume = require("../models/Resume");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { getFreeAiLimit } = require("../utils/pricingSettings");
const { optimizeResumeWithGroq } = require("../utils/ai/groq.service");
const { generateSummaryWithGroq } = require("../utils/ai/summary.service");
const { improveBulletWithGroq } = require("../utils/ai/bullet.service");
const { assertAiQuota, incrementAiUsage } = require("../utils/ai/aiQuota");

const optimizeResume = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!resume) {
      return next(new ApiError("Resume not found.", 404));
    }

    const { jobDescription } = req.body;
    const { freeAiLimit } = await assertAiQuota(resume);

    const result = await optimizeResumeWithGroq(resume, jobDescription);

    resume.jobDescription = jobDescription;
    resume.aiMeta = {
      ...resume.aiMeta,
      usageCount: (resume.aiMeta?.usageCount || 0) + 1,
      lastOptimizedAt: new Date(),
      lastSuggestions: result,
    };
    await resume.save();

    res.status(200).json(new ApiResponse(200, "AI optimization complete", {
      suggestions: result.suggestions,
      atsScore: result.atsScore,
      usageCount: resume.aiMeta.usageCount,
      freeAiLimit,
    }));
  } catch (error) {
    next(error);
  }
};

const generateSummary = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!resume) {
      return next(new ApiError("Resume not found.", 404));
    }

    const { targetRole, yearsExperience } = req.body;
    const { freeAiLimit } = await assertAiQuota(resume);

    const result = await generateSummaryWithGroq(resume, { targetRole, yearsExperience });
    const usageCount = await incrementAiUsage(resume);

    res.status(200).json(new ApiResponse(200, "Summary generated", {
      summary: result.summary,
      usageCount,
      freeAiLimit,
    }));
  } catch (error) {
    next(error);
  }
};

const improveBullet = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!resume) {
      return next(new ApiError("Resume not found.", 404));
    }

    const { experienceIndex, bulletIndex } = req.body;
    const { freeAiLimit } = await assertAiQuota(resume);

    const result = await improveBulletWithGroq(resume, experienceIndex, bulletIndex);
    const usageCount = await incrementAiUsage(resume);

    res.status(200).json(new ApiResponse(200, "Bullet improved", {
      suggested: result.suggested,
      usageCount,
      freeAiLimit,
    }));
  } catch (error) {
    next(error);
  }
};

module.exports = { optimizeResume, generateSummary, improveBullet };
