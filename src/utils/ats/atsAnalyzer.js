const { getActiveTemplateBySlug, getTemplateTierScore } = require("../../constants/resumeTemplates");
const { areResumeDatesValid } = require("../dateValidation");
const { hasStarterContent } = require("./starterDetector");
const { matchKeywords } = require("./keywordMatcher");

const METRIC_PATTERN = /%|\d+/;

const countWords = (text) => {
  if (!text?.trim()) return 0;
  return text.trim().split(/\s+/).length;
};

const getGrade = (score) => {
  if (score >= 85) return "Excellent";
  if (score >= 65) return "Good";
  return "NeedsWork";
};

const analyzeResumeAts = (resume) => {
  const checks = [];
  let earned = 0;
  let total = 0;

  const addCheck = (id, label, passed, weight, tip = "") => {
    total += weight;
    if (passed) earned += weight;
    checks.push({ id, label, passed, weight, tip });
  };

  const fullName = resume.personal?.fullName?.trim();
  addCheck("fullName", "Full name present", Boolean(fullName), 5, "Add your full name in Personal step");

  const hasContact = Boolean(
    resume.personal?.email?.trim() || resume.personal?.phone?.trim(),
  );
  addCheck(
    "contact",
    "Email or phone present",
    hasContact,
    5,
    "Add at least one contact method",
  );

  const summaryWords = countWords(resume.personal?.summary);
  const summaryOk = summaryWords >= 40 && summaryWords <= 120;
  addCheck(
    "summary",
    "Summary 40–120 words",
    summaryOk,
    10,
    summaryWords < 40
      ? "Write a stronger summary (40+ words)"
      : "Shorten summary to under 120 words",
  );

  const hasExperience = (resume.experience || []).some(
    (job) => job.company?.trim() && job.role?.trim(),
  );
  addCheck(
    "experience",
    "At least one experience entry",
    hasExperience,
    10,
    "Add company name and job title",
  );

  const allBullets = (resume.experience || []).flatMap((job) => job.bullets || []);
  const hasMetrics = allBullets.some((bullet) => METRIC_PATTERN.test(bullet || ""));
  addCheck(
    "metrics",
    "Bullets include numbers or metrics",
    hasMetrics,
    10,
    "Add measurable results (%, numbers, scale)",
  );

  const skillCount = (resume.skills || []).filter((s) => s.name?.trim()).length;
  addCheck(
    "skills",
    "At least 5 skills listed",
    skillCount >= 5,
    10,
    `Add ${Math.max(0, 5 - skillCount)} more skills`,
  );

  const hasWorkSection = hasExperience || (resume.projects || []).length > 0;
  const hasEducation = (resume.education || []).length > 0;
  addCheck(
    "sections",
    "Work history and education present",
    hasWorkSection && hasEducation,
    10,
    "Add education and experience or projects",
  );

  const template = getActiveTemplateBySlug(resume.templateSlug);
  const tierScore = getTemplateTierScore(resume.templateSlug);
  const tierPassed = template?.atsTier === "A";
  total += 15;
  earned += tierScore;
  checks.push({
    id: "templateTier",
    label: `ATS-safe template (Tier ${template?.atsTier || "?"})`,
    passed: tierPassed,
    weight: 15,
    tip: template?.atsTier === "C"
      ? "Switch to Minimal ATS or ATS Elite for job portals"
      : "Consider Minimal ATS for maximum parser safety",
  });

  const starterPresent = hasStarterContent(resume);
  addCheck(
    "noStarter",
    "No example placeholder content",
    !starterPresent,
    10,
    "Clear example data and add your real details",
  );

  const datesValid = areResumeDatesValid(resume);
  addCheck(
    "dateFormat",
    "Dates use Mon YYYY or YYYY format",
    datesValid,
    10,
    'Use formats like "Jan 2022" or "2022"',
  );

  const keywordMatch = matchKeywords(resume, resume.jobDescription);
  if (resume.jobDescription?.trim()) {
    const keywordPassed = keywordMatch.percent >= 50;
    const keywordEarned = Math.round((keywordMatch.percent / 100) * 15);
    earned += keywordEarned;
    total += 15;
    checks.push({
      id: "keywordMatch",
      label: `Keyword match ${keywordMatch.percent}%`,
      passed: keywordPassed,
      weight: 15,
      tip: keywordMatch.missing.length
        ? `Add keywords: ${keywordMatch.missing.slice(0, 3).join(", ")}`
        : "Strong keyword alignment with job description",
    });
  }

  const score = total > 0 ? Math.round((earned / total) * 100) : 0;
  const failedCount = checks.filter((c) => !c.passed).length;

  return {
    score,
    grade: getGrade(score),
    checks,
    failedCount,
    hasStarterContent: starterPresent,
    keywordMatch: resume.jobDescription?.trim() ? keywordMatch : null,
  };
};

module.exports = { analyzeResumeAts };
