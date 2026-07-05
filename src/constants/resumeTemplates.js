const RESUME_TEMPLATES = [
  {
    slug: "modern-professional",
    name: "Modern Professional",
    category: "professional",
    sortOrder: 1,
  },
  {
    slug: "minimal-ats",
    name: "Minimal ATS",
    category: "minimal",
    sortOrder: 2,
  },
  {
    slug: "sidebar-accent",
    name: "Sidebar Accent",
    category: "creative",
    sortOrder: 3,
  },
  {
    slug: "executive-classic",
    name: "Executive Classic",
    category: "executive",
    sortOrder: 4,
  },
  {
    slug: "tech-developer",
    name: "Tech Developer",
    category: "tech",
    sortOrder: 5,
  },
  {
    slug: "ats-elite",
    name: "ATS Elite",
    category: "premium",
    sortOrder: 6,
  },
];

const TEMPLATE_BY_SLUG = Object.fromEntries(
  RESUME_TEMPLATES.map((template) => [template.slug, template]),
);

const ALLOWED_TEMPLATE_SLUGS = RESUME_TEMPLATES.map((template) => template.slug);

const getActiveTemplateBySlug = (slug) => TEMPLATE_BY_SLUG[slug] || null;

module.exports = {
  RESUME_TEMPLATES,
  ALLOWED_TEMPLATE_SLUGS,
  getActiveTemplateBySlug,
};
