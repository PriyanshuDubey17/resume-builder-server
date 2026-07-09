const {
  STARTER_PERSONAL_BASE,
  STARTER_EDUCATION,
  STARTER_EXPERIENCE,
  STARTER_PROJECTS,
  STARTER_SKILLS,
  STARTER_CERTIFICATIONS,
  STARTER_LANGUAGES,
} = require("../../constants/starterResumeContent");

const STARTER_COMPANIES = new Set(
  STARTER_EXPERIENCE.map((item) => item.company.toLowerCase()),
);
const STARTER_PROJECT_NAMES = new Set(
  STARTER_PROJECTS.map((item) => item.name.toLowerCase()),
);
const STARTER_SCHOOLS = new Set(
  STARTER_EDUCATION.map((item) => item.school.toLowerCase()),
);
const STARTER_SKILL_NAMES = new Set(
  STARTER_SKILLS.map((item) => item.name.toLowerCase()),
);

const hasStarterContent = (resume) => {
  const personal = resume.personal || {};

  if (personal.summary?.trim() === STARTER_PERSONAL_BASE.summary) return true;
  if (personal.phone?.trim() === STARTER_PERSONAL_BASE.phone) return true;
  if (personal.location?.trim() === STARTER_PERSONAL_BASE.location) return true;

  const hasStarterCompany = (resume.experience || []).some((item) =>
    STARTER_COMPANIES.has((item.company || "").trim().toLowerCase()),
  );
  if (hasStarterCompany) return true;

  const hasStarterProject = (resume.projects || []).some((item) =>
    STARTER_PROJECT_NAMES.has((item.name || "").trim().toLowerCase()),
  );
  if (hasStarterProject) return true;

  const hasStarterSchool = (resume.education || []).some((item) =>
    STARTER_SCHOOLS.has((item.school || "").trim().toLowerCase()),
  );
  if (hasStarterSchool) return true;

  const starterSkillMatches = (resume.skills || []).filter((item) =>
    STARTER_SKILL_NAMES.has((item.name || "").trim().toLowerCase()),
  ).length;
  if (starterSkillMatches >= 3) return true;

  const hasStarterCert = (resume.certifications || []).some(
    (item) => item.name === STARTER_CERTIFICATIONS[0]?.name,
  );
  if (hasStarterCert) return true;

  const hasStarterLang = (resume.languages || []).some(
    (item) =>
      item.name === STARTER_LANGUAGES[0]?.name &&
      item.level === STARTER_LANGUAGES[0]?.level,
  );
  if (hasStarterLang) return true;

  return false;
};

module.exports = { hasStarterContent };
