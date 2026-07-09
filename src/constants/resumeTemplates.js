const RESUME_TEMPLATES = [
  {
    slug: "modern-professional",
    name: "Modern Professional",
    category: "professional",
    sortOrder: 1,
    atsTier: "B",
    atsStaticScore: 85,
    recommendedFor: ["experienced", "tech"],
    atsNotes: "Header-band layout, clean sections, good for most roles",
  },
  {
    slug: "minimal-ats",
    name: "Minimal ATS",
    category: "minimal",
    sortOrder: 2,
    atsTier: "A",
    atsStaticScore: 98,
    recommendedFor: ["fresher", "experienced", "tech"],
    atsNotes: "Single column, plain text, safest for job portals",
  },
  {
    slug: "sidebar-accent",
    name: "Sidebar Accent",
    category: "creative",
    sortOrder: 3,
    atsTier: "C",
    atsStaticScore: 74,
    recommendedFor: ["tech"],
    atsNotes: "Skill bars in header — use for email applications",
  },
  {
    slug: "executive-classic",
    name: "Executive Classic",
    category: "executive",
    sortOrder: 4,
    atsTier: "C",
    atsStaticScore: 72,
    recommendedFor: ["experienced"],
    atsNotes: "Serif styling — best for senior roles via direct email",
  },
  {
    slug: "tech-developer",
    name: "Tech Developer",
    category: "tech",
    sortOrder: 5,
    atsTier: "C",
    atsStaticScore: 76,
    recommendedFor: ["tech", "fresher"],
    atsNotes: "Skill pills — strong for tech, weaker on some ATS parsers",
  },
  {
    slug: "ats-elite",
    name: "ATS Elite",
    category: "premium",
    sortOrder: 6,
    atsTier: "A",
    atsStaticScore: 96,
    recommendedFor: ["fresher", "experienced", "tech"],
    atsNotes: "Optimized headings and spacing for ATS parsing",
  },
  {
    slug: "campus-starter",
    name: "Campus Starter",
    category: "student",
    sortOrder: 7,
    atsTier: "B",
    atsStaticScore: 84,
    recommendedFor: ["fresher"],
    atsNotes: "Education-first layout for students and fresh graduates",
  },
  {
    slug: "compact-pro",
    name: "Compact Pro",
    category: "experienced",
    sortOrder: 8,
    atsTier: "A",
    atsStaticScore: 95,
    recommendedFor: ["experienced"],
    atsNotes: "Dense layout for long resumes — fits more on fewer pages",
  },
  {
    slug: "impact-metrics",
    name: "Impact Metrics",
    category: "business",
    sortOrder: 9,
    atsTier: "B",
    atsStaticScore: 86,
    recommendedFor: ["experienced"],
    atsNotes: "Metrics-focused bullets with clean section structure",
  },
];

const TEMPLATE_BY_SLUG = Object.fromEntries(
  RESUME_TEMPLATES.map((template) => [template.slug, template]),
);

const ALLOWED_TEMPLATE_SLUGS = RESUME_TEMPLATES.map((template) => template.slug);

const TIER_SCORES = { A: 15, B: 10, C: 5 };

const getActiveTemplateBySlug = (slug) => TEMPLATE_BY_SLUG[slug] || null;

const getTemplateTierScore = (slug) => {
  const template = getActiveTemplateBySlug(slug);
  return TIER_SCORES[template?.atsTier] ?? 5;
};

module.exports = {
  RESUME_TEMPLATES,
  ALLOWED_TEMPLATE_SLUGS,
  getActiveTemplateBySlug,
  getTemplateTierScore,
};
