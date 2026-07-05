const axios = require("axios");
const ApiError = require("../ApiError");

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const buildOptimizePrompt = (resume, jobDescription) => {
  return `You are an ATS resume optimization assistant. Analyze the job description and suggest improvements to the resume data.

RULES:
- NEVER invent companies, degrees, or job titles the candidate did not have
- Only suggest adding skills that are reasonably implied by their experience
- Rewrite bullets using strong action verbs and relevant keywords from the JD
- Return ONLY valid JSON, no markdown fences

JOB DESCRIPTION:
${jobDescription}

CURRENT RESUME:
${JSON.stringify({
  personal: { summary: resume.personal?.summary },
  skills: resume.skills,
  experience: resume.experience,
})}

Return this exact JSON structure:
{
  "suggestions": {
    "skills": { "add": ["skill1"], "remove": [] },
    "summary": { "original": "...", "suggested": "..." },
    "experience": [{ "index": 0, "bullets": { "original": ["..."], "suggested": ["..."] } }]
  },
  "atsScore": { "before": 0, "after": 0 }
}`;
};

const optimizeResumeWithGemini = async (resume, jobDescription) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new ApiError("AI service is not configured.", 500);
  }

  const prompt = buildOptimizePrompt(resume, jobDescription);

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
        },
      },
      { timeout: 30000 },
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new ApiError("AI returned an empty response. Please try again.", 502);
    }

    const parsed = JSON.parse(text);
    return parsed;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.response?.status === 429) {
      throw new ApiError("AI service is busy. Please try again in a moment.", 429);
    }
    console.error("Gemini API error:", error.message);
    throw new ApiError("AI optimization failed. Please try again.", 502);
  }
};

module.exports = { optimizeResumeWithGemini };
