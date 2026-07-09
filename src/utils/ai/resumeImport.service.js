const ApiError = require("../ApiError");
const { callGroqJson } = require("./groqClient");

const IMPORT_SYSTEM_PROMPT = `
You are a resume data extraction specialist.

Your task: convert raw resume text into structured JSON matching the requested schema.

Non-negotiable rules:
- Extract ONLY information explicitly present in the text.
- Never invent employers, job titles, degrees, schools, dates, skills, or achievements.
- If a field is missing, use an empty string "" for strings or an empty array [] for lists.
- Dates should use YYYY or Mon YYYY / Month YYYY format when possible (e.g. Jan 2022, 2020).
- Bullets must be separate strings in a bullets array.
- Do not include jobDescription — always omit it from output.
- Return ONLY valid JSON with no markdown or code fences.
`.trim();

const buildImportUserPrompt = (resumeText) => `
RESUME TEXT:
${resumeText}

Return this exact JSON structure:
{
  "personal": {
    "fullName": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": "",
    "github": "",
    "portfolio": "",
    "summary": ""
  },
  "education": [
    {
      "school": "",
      "degree": "",
      "field": "",
      "startDate": "",
      "endDate": "",
      "gpa": ""
    }
  ],
  "experience": [
    {
      "company": "",
      "role": "",
      "startDate": "",
      "endDate": "",
      "isCurrent": false,
      "bullets": [""]
    }
  ],
  "projects": [
    {
      "name": "",
      "role": "",
      "startDate": "",
      "endDate": "",
      "isCurrent": false,
      "url": "",
      "techStack": "",
      "bullets": [""]
    }
  ],
  "skills": [{ "name": "", "level": "" }],
  "certifications": [{ "name": "", "issuer": "", "date": "", "url": "" }],
  "languages": [{ "name": "", "level": "" }]
}

Use empty arrays when a section is not present in the text.
`.trim();

const parseGroqImportResponse = (content) => {
  if (!content) {
    throw new ApiError("AI returned an empty response.", 502);
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new ApiError("Could not parse resume. Try a simpler PDF or fill manually.", 502);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new ApiError("Could not parse resume. Try a simpler PDF or fill manually.", 502);
  }

  return parsed;
};

const structureResumeFromText = async (resumeText) => {
  const content = await callGroqJson(IMPORT_SYSTEM_PROMPT, buildImportUserPrompt(resumeText));
  return parseGroqImportResponse(content);
};

module.exports = { structureResumeFromText };
