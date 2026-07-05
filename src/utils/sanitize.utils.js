const ApiError = require("./ApiError");

const sanitizeText = (value) => {
  if (typeof value !== "string") return value;
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .trim();
};

const sanitizeResumeData = (data) => {
  if (!data || typeof data !== "object") return data;

  const sanitized = { ...data };

  if (sanitized.personal) {
    sanitized.personal = Object.fromEntries(
      Object.entries(sanitized.personal).map(([key, val]) => [key, sanitizeText(val)]),
    );
  }

  if (Array.isArray(sanitized.education)) {
    sanitized.education = sanitized.education.map((item) =>
      Object.fromEntries(
        Object.entries(item).map(([key, val]) => [key, sanitizeText(val)]),
      ),
    );
  }

  if (Array.isArray(sanitized.experience)) {
    sanitized.experience = sanitized.experience.map((item) => ({
      ...item,
      company: sanitizeText(item.company),
      role: sanitizeText(item.role),
      startDate: sanitizeText(item.startDate),
      endDate: sanitizeText(item.endDate),
      bullets: Array.isArray(item.bullets)
        ? item.bullets.map((b) => sanitizeText(b))
        : [],
    }));
  }

  if (Array.isArray(sanitized.projects)) {
    sanitized.projects = sanitized.projects.map((item) => ({
      ...item,
      name: sanitizeText(item.name),
      role: sanitizeText(item.role),
      startDate: sanitizeText(item.startDate),
      endDate: sanitizeText(item.endDate),
      url: sanitizeText(item.url),
      techStack: sanitizeText(item.techStack),
      bullets: Array.isArray(item.bullets)
        ? item.bullets.map((b) => sanitizeText(b))
        : [],
    }));
  }

  if (Array.isArray(sanitized.skills)) {
    sanitized.skills = sanitized.skills.map((item) => ({
      name: sanitizeText(item.name),
      level: sanitizeText(item.level),
    }));
  }

  if (Array.isArray(sanitized.certifications)) {
    sanitized.certifications = sanitized.certifications.map((item) =>
      Object.fromEntries(
        Object.entries(item).map(([key, val]) => [key, sanitizeText(val)]),
      ),
    );
  }

  if (Array.isArray(sanitized.languages)) {
    sanitized.languages = sanitized.languages.map((item) => ({
      name: sanitizeText(item.name),
      level: sanitizeText(item.level),
    }));
  }

  if (sanitized.jobDescription) {
    sanitized.jobDescription = sanitizeText(sanitized.jobDescription);
  }

  return sanitized;
};

const requireEmailVerified = (req, _res, next) => {
  if (!req.user?.emailVerified) {
    return next(new ApiError("Please verify your email before continuing.", 403));
  }
  next();
};

module.exports = { sanitizeText, sanitizeResumeData, requireEmailVerified };
