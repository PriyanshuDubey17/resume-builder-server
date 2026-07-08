const Resume = require("../models/Resume");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { getFreeAiLimit } = require("../utils/pricingSettings");
const { optimizeResumeWithGroq } = require("../utils/ai/groq.service");

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
    const freeAiLimit = await getFreeAiLimit();
    const usageCount = resume.aiMeta?.usageCount || 0;

    if (resume.status !== "paid" && usageCount >= freeAiLimit) {
      return next(
        new ApiError(`Free AI limit reached (${freeAiLimit}). Pay to unlock unlimited optimizations.`, 403),
      );
    }

    const result = await optimizeResumeWithGroq(resume, jobDescription);

    resume.jobDescription = jobDescription;
    resume.aiMeta = {
      usageCount: usageCount + 1,
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

module.exports = { optimizeResume };
