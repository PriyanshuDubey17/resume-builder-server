const ApiError = require("../ApiError");
const { callGroqJson } = require("./groqClient");

const BULLET_SYSTEM_PROMPT = `
You are a resume bullet-point specialist for ATS-optimized resumes.
Return ONLY valid JSON with key "suggested" (single improved bullet string).
Use action verbs, quantify impact where reasonable, stay truthful to the provided context.
Do not invent employers, tools, or metrics not implied by the context.
Keep to one concise bullet (max 25 words).
`.trim();

const buildBulletUserPrompt = (resume, experienceIndex, bulletIndex) => {
  const job = resume.experience?.[experienceIndex];
  const currentBullet = job?.bullets?.[bulletIndex] || "";
  const jobContext = job
    ? `Role: ${job.role} at ${job.company}. Dates: ${job.startDate || ""} - ${job.isCurrent ? "Present" : job.endDate || ""}`
    : "";

  return `
${jobContext}
Current bullet: ${currentBullet}
Job description keywords context: ${(resume.jobDescription || "").slice(0, 500)}

Return JSON: { "suggested": "..." }
`.trim();
};

const improveBulletWithGroq = async (resume, experienceIndex, bulletIndex) => {
  const job = resume.experience?.[experienceIndex];
  if (!job) {
    throw new ApiError("Experience entry not found.", 400);
  }

  const content = await callGroqJson(
    BULLET_SYSTEM_PROMPT,
    buildBulletUserPrompt(resume, experienceIndex, bulletIndex),
  );

  if (!content) {
    throw new ApiError("AI returned an empty response.", 502);
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new ApiError("AI returned invalid JSON.", 502);
  }

  const suggested = typeof parsed.suggested === "string" ? parsed.suggested.trim() : "";
  if (!suggested) {
    throw new ApiError("AI returned an empty bullet.", 502);
  }

  return { suggested };
};

module.exports = { improveBulletWithGroq };
