const ApiError = require("../ApiError");
const { callGroqJson } = require("./groqClient");

const SUMMARY_SYSTEM_PROMPT = `
You are a professional resume writer focused on ATS-friendly summaries.
Return ONLY valid JSON with key "summary" (string, 40-80 words).
Never invent employers, degrees, or skills not supported by the resume data.
Use strong action-oriented language and relevant keywords for the target role.
`.trim();

const buildSummaryUserPrompt = (resume, { targetRole, yearsExperience }) => {
  const skills = (resume.skills || []).map((s) => s.name).filter(Boolean).slice(0, 10);
  const roles = (resume.experience || []).map((e) => e.role).filter(Boolean).slice(0, 3);

  return `
Target role: ${targetRole}
Years of experience: ${yearsExperience || "Not specified"}
Current skills: ${skills.join(", ") || "None listed"}
Recent roles: ${roles.join(", ") || "None listed"}
Current summary (if any): ${resume.personal?.summary || ""}

Return JSON: { "summary": "..." }
`.trim();
};

const generateSummaryWithGroq = async (resume, { targetRole, yearsExperience }) => {
  const content = await callGroqJson(
    SUMMARY_SYSTEM_PROMPT,
    buildSummaryUserPrompt(resume, { targetRole, yearsExperience }),
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

  const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
  if (!summary) {
    throw new ApiError("AI returned an empty summary.", 502);
  }

  return { summary };
};

module.exports = { generateSummaryWithGroq };
