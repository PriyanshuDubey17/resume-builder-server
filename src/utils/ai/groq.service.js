const Groq = require("groq-sdk");
const ApiError = require("../ApiError");

const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";
const DEFAULT_FALLBACK_MODEL = "qwen/qwen3.6-27b";
const REQUEST_TIMEOUT_MS = 30000;

const ATS_SYSTEM_PROMPT = `
You are a senior ATS resume optimization specialist.

Your purpose:
- Improve resume quality for ATS parsing and recruiter readability.
- Align resume language with the provided job description.
- Keep all suggestions truthful and evidence-based.

Non-negotiable rules:
- Never invent or fabricate company names, job titles, degrees, certifications, dates, or achievements.
- Do not add technologies unless reasonably supported by the current resume and/or clearly required by the job description.
- Keep wording concise, scannable, and impact-oriented.
- Use strong action verbs and outcome-focused bullet style.
- Prioritize role-relevant keywords from the job description naturally.
- Preserve the candidate's existing career narrative.

Output requirements:
- Return ONLY valid JSON.
- No markdown, no prose outside JSON, no code fences.
- Follow the exact output schema requested by the user prompt.
`.trim();

const sanitizeResumeForPrompt = (resume) => ({
  personal: {
    summary: resume.personal?.summary || "",
  },
  skills: Array.isArray(resume.skills) ? resume.skills : [],
  experience: Array.isArray(resume.experience) ? resume.experience : [],
});

const buildOptimizeUserPrompt = (resume, jobDescription) => {
  const resumePayload = sanitizeResumeForPrompt(resume);

  return `
JOB DESCRIPTION:
${jobDescription}

CURRENT RESUME:
${JSON.stringify(resumePayload)}

Return this exact JSON structure:
{
  "suggestions": {
    "skills": { "add": ["skill1"], "remove": [] },
    "summary": { "original": "...", "suggested": "..." },
    "experience": [
      {
        "index": 0,
        "bullets": { "original": ["..."], "suggested": ["..."] }
      }
    ]
  },
  "atsScore": { "before": 0, "after": 0 }
}

Validation constraints:
- suggestions.skills.add/remove must be arrays of strings.
- suggestions.summary must include original and suggested strings.
- suggestions.experience must be an array.
- atsScore.before and atsScore.after must be numbers from 0 to 100.
- suggested ATS score should be >= before score.
`.trim();
};

const stripCodeFences = (text) => {
  const trimmed = text.trim();
  if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
    return trimmed.replace(/^```[a-zA-Z0-9]*\n?/, "").replace(/\n?```$/, "").trim();
  }
  return trimmed;
};

const normalizeParsedResult = (parsed) => {
  if (!parsed || typeof parsed !== "object") {
    throw new ApiError("AI returned invalid optimization data.", 502);
  }

  const suggestions = parsed.suggestions || {};
  const skills = suggestions.skills || {};
  const summary = suggestions.summary || {};
  const experience = Array.isArray(suggestions.experience) ? suggestions.experience : [];
  const atsScore = parsed.atsScore || {};

  const normalized = {
    suggestions: {
      skills: {
        add: Array.isArray(skills.add) ? skills.add.filter((item) => typeof item === "string") : [],
        remove: Array.isArray(skills.remove) ? skills.remove.filter((item) => typeof item === "string") : [],
      },
      summary: {
        original: typeof summary.original === "string" ? summary.original : "",
        suggested: typeof summary.suggested === "string" ? summary.suggested : "",
      },
      experience: experience
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
          index: Number.isInteger(item.index) ? item.index : 0,
          bullets: {
            original: Array.isArray(item.bullets?.original)
              ? item.bullets.original.filter((bullet) => typeof bullet === "string")
              : [],
            suggested: Array.isArray(item.bullets?.suggested)
              ? item.bullets.suggested.filter((bullet) => typeof bullet === "string")
              : [],
          },
        })),
    },
    atsScore: {
      before: Number.isFinite(atsScore.before) ? atsScore.before : 0,
      after: Number.isFinite(atsScore.after) ? atsScore.after : 0,
    },
  };

  if (normalized.suggestions.summary.suggested.length === 0) {
    throw new ApiError("AI returned incomplete optimization output.", 502);
  }

  return normalized;
};

const parseOptimizationResponse = (content) => {
  if (!content || typeof content !== "string") {
    throw new ApiError("AI returned an empty response. Please try again.", 502);
  }

  const sanitized = stripCodeFences(content);

  try {
    const parsed = JSON.parse(sanitized);
    return normalizeParsedResult(parsed);
  } catch (error) {
    throw new ApiError("AI returned invalid JSON format. Please try again.", 502);
  }
};

const getModelCandidates = () => {
  const primary = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
  const fallback = process.env.GROQ_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL;

  if (fallback && fallback !== primary) {
    return [primary, fallback];
  }

  return [primary];
};

const createGroqClient = () => {
  if (!process.env.GROQ_API_KEY) {
    throw new ApiError("AI service is not configured.", 500);
  }

  return new Groq({
    apiKey: process.env.GROQ_API_KEY,
    timeout: REQUEST_TIMEOUT_MS,
  });
};

const mapProviderError = (error) => {
  const statusCode = error?.status || error?.response?.status;

  if (statusCode === 429) {
    return new ApiError("AI service is busy. Please try again in a moment.", 429);
  }

  if (statusCode >= 500) {
    return new ApiError("AI optimization service is temporarily unavailable.", 502);
  }

  if (error instanceof ApiError) {
    return error;
  }

  return new ApiError("AI optimization failed. Please try again.", 502);
};

const optimizeResumeWithGroq = async (resume, jobDescription) => {
  const client = createGroqClient();
  const models = getModelCandidates();
  const userPrompt = buildOptimizeUserPrompt(resume, jobDescription);

  let lastError = null;

  for (const model of models) {
    try {
      const completion = await client.chat.completions.create({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: ATS_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      });

      const content = completion?.choices?.[0]?.message?.content;
      return parseOptimizationResponse(content);
    } catch (error) {
      lastError = error;
      if ((error?.status || error?.response?.status) === 429) {
        throw mapProviderError(error);
      }
    }
  }

  throw mapProviderError(lastError);
};

module.exports = { optimizeResumeWithGroq };
