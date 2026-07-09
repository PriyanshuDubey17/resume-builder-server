const { z } = require("zod");
const ApiError = require("../ApiError");
const { sanitizeResumeData } = require("../sanitize.utils");
const { areResumeDatesValid } = require("../dateValidation");
const {
  MAX_EXPERIENCE_ITEMS,
  MAX_PROJECT_ITEMS,
  MAX_SKILLS,
  MAX_EDUCATION_ITEMS,
  MAX_CERTIFICATIONS,
  MAX_LANGUAGES,
} = require("../../constants/resumeImport");

const personalSchema = z.object({
  fullName: z.string().max(120).optional().default(""),
  email: z.string().max(120).optional().default(""),
  phone: z.string().max(30).optional().default(""),
  location: z.string().max(120).optional().default(""),
  linkedin: z.string().max(200).optional().default(""),
  github: z.string().max(200).optional().default(""),
  portfolio: z.string().max(200).optional().default(""),
  summary: z.string().max(2000).optional().default(""),
});

const educationItemSchema = z.object({
  school: z.string().max(120).optional().default(""),
  degree: z.string().max(120).optional().default(""),
  field: z.string().max(120).optional().default(""),
  startDate: z.string().max(30).optional().default(""),
  endDate: z.string().max(30).optional().default(""),
  gpa: z.string().max(20).optional().default(""),
});

const experienceItemSchema = z.object({
  company: z.string().max(120).optional().default(""),
  role: z.string().max(120).optional().default(""),
  startDate: z.string().max(30).optional().default(""),
  endDate: z.string().max(30).optional().default(""),
  isCurrent: z.boolean().optional().default(false),
  bullets: z.array(z.string().max(500)).optional().default([]),
});

const projectItemSchema = z.object({
  name: z.string().max(120).optional().default(""),
  role: z.string().max(120).optional().default(""),
  startDate: z.string().max(30).optional().default(""),
  endDate: z.string().max(30).optional().default(""),
  isCurrent: z.boolean().optional().default(false),
  url: z.string().max(200).optional().default(""),
  techStack: z.string().max(200).optional().default(""),
  bullets: z.array(z.string().max(500)).optional().default([]),
});

const skillItemSchema = z.object({
  name: z.string().max(60).optional().default(""),
  level: z.string().max(30).optional().default(""),
});

const certificationItemSchema = z.object({
  name: z.string().max(120).optional().default(""),
  issuer: z.string().max(120).optional().default(""),
  date: z.string().max(30).optional().default(""),
  url: z.string().max(200).optional().default(""),
});

const languageItemSchema = z.object({
  name: z.string().max(60).optional().default(""),
  level: z.string().max(30).optional().default(""),
});

const importedResumeDataSchema = z.object({
  personal: personalSchema.optional().default({}),
  education: z.array(educationItemSchema).optional().default([]),
  experience: z.array(experienceItemSchema).optional().default([]),
  projects: z.array(projectItemSchema).optional().default([]),
  skills: z.array(skillItemSchema).optional().default([]),
  certifications: z.array(certificationItemSchema).optional().default([]),
  languages: z.array(languageItemSchema).optional().default([]),
});

const normalizeSkillName = (name) => (name || "").trim().toLowerCase();

const dedupeSkills = (skills) => {
  const result = [];
  const seen = new Set();

  (skills || []).forEach((skill) => {
    const name = (skill?.name || "").trim();
    const normalized = normalizeSkillName(name);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    result.push({
      name,
      level: (skill?.level || "").trim(),
    });
  });

  return result;
};

const filterBullets = (bullets) =>
  (bullets || []).map((b) => (b || "").trim()).filter(Boolean);

const normalizeExperience = (items) =>
  (items || [])
    .slice(0, MAX_EXPERIENCE_ITEMS)
    .map((item) => ({
      company: (item.company || "").trim(),
      role: (item.role || "").trim(),
      startDate: (item.startDate || "").trim(),
      endDate: (item.endDate || "").trim(),
      isCurrent: Boolean(item.isCurrent),
      bullets: filterBullets(item.bullets),
    }))
    .filter((item) => item.company || item.role || item.bullets.length > 0);

const normalizeProjects = (items) =>
  (items || [])
    .slice(0, MAX_PROJECT_ITEMS)
    .map((item) => ({
      name: (item.name || "").trim(),
      role: (item.role || "").trim(),
      startDate: (item.startDate || "").trim(),
      endDate: (item.endDate || "").trim(),
      isCurrent: Boolean(item.isCurrent),
      url: (item.url || "").trim(),
      techStack: (item.techStack || "").trim(),
      bullets: filterBullets(item.bullets),
    }))
    .filter((item) => item.name || item.role || item.bullets.length > 0);

const normalizeEducation = (items) =>
  (items || [])
    .slice(0, MAX_EDUCATION_ITEMS)
    .map((item) => ({
      school: (item.school || "").trim(),
      degree: (item.degree || "").trim(),
      field: (item.field || "").trim(),
      startDate: (item.startDate || "").trim(),
      endDate: (item.endDate || "").trim(),
      gpa: (item.gpa || "").trim(),
    }))
    .filter((item) => item.school || item.degree);

const normalizeCertifications = (items) =>
  (items || [])
    .slice(0, MAX_CERTIFICATIONS)
    .map((item) => ({
      name: (item.name || "").trim(),
      issuer: (item.issuer || "").trim(),
      date: (item.date || "").trim(),
      url: (item.url || "").trim(),
    }))
    .filter((item) => item.name);

const normalizeLanguages = (items) =>
  (items || [])
    .slice(0, MAX_LANGUAGES)
    .map((item) => ({
      name: (item.name || "").trim(),
      level: (item.level || "").trim(),
    }))
    .filter((item) => item.name);

const hasMinimumContent = (data) => {
  const fullName = data.personal?.fullName?.trim();
  const hasExperience = (data.experience || []).length > 0;
  const hasEducation = (data.education || []).length > 0;
  return Boolean(fullName || hasExperience || hasEducation);
};

const buildWarnings = (data, { wasTruncated = false } = {}) => {
  const warnings = [];

  if (wasTruncated) {
    warnings.push("Text was truncated — review carefully.");
  }

  if (!(data.experience || []).length) {
    warnings.push("No experience found.");
  }

  if ((data.skills || []).length < 5) {
    warnings.push("Fewer than 5 skills.");
  }

  if (!areResumeDatesValid(data)) {
    warnings.push("Some dates could not be read.");
  }

  if (!(data.personal?.email || "").trim() && !(data.personal?.phone || "").trim()) {
    warnings.push("No contact email or phone found.");
  }

  return warnings;
};

const normalizeImportedResume = (rawData, options = {}) => {
  const parsed = importedResumeDataSchema.safeParse(rawData || {});

  if (!parsed.success) {
    throw new ApiError("Imported resume data is invalid.", 400);
  }

  const sanitized = sanitizeResumeData(parsed.data);

  const normalized = {
    personal: {
      fullName: (sanitized.personal?.fullName || "").trim(),
      email: (sanitized.personal?.email || "").trim(),
      phone: (sanitized.personal?.phone || "").trim(),
      location: (sanitized.personal?.location || "").trim(),
      linkedin: (sanitized.personal?.linkedin || "").trim(),
      github: (sanitized.personal?.github || "").trim(),
      portfolio: (sanitized.personal?.portfolio || "").trim(),
      summary: (sanitized.personal?.summary || "").trim(),
    },
    education: normalizeEducation(sanitized.education),
    experience: normalizeExperience(sanitized.experience),
    projects: normalizeProjects(sanitized.projects),
    skills: dedupeSkills(sanitized.skills).slice(0, MAX_SKILLS),
    certifications: normalizeCertifications(sanitized.certifications),
    languages: normalizeLanguages(sanitized.languages),
  };

  if (!hasMinimumContent(normalized)) {
    throw new ApiError("Not enough resume content found in this PDF.", 422);
  }

  const warnings = buildWarnings(normalized, options);

  return { data: normalized, warnings };
};

module.exports = {
  importedResumeDataSchema,
  normalizeImportedResume,
};
