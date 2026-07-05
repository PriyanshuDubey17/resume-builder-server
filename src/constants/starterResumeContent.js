const STARTER_PERSONAL_BASE = {
  phone: "+91 98765 43210",
  location: "Bangalore, India",
  linkedin: "https://linkedin.com/in/yourprofile",
  github: "https://github.com/yourprofile",
  portfolio: "https://yourportfolio.dev",
  summary:
    "Results-driven software engineer with 4+ years building scalable web applications. Passionate about clean code, user experience, and shipping products that help people land their dream jobs.",
};

const STARTER_EDUCATION = [
  {
    school: "Delhi Technological University",
    degree: "B.Tech",
    field: "Computer Science",
    startDate: "2016",
    endDate: "2020",
    gpa: "8.6",
  },
];

const STARTER_EXPERIENCE = [
  {
    company: "TechNova Solutions",
    role: "Senior Software Engineer",
    startDate: "Jan 2022",
    endDate: "",
    isCurrent: true,
    bullets: [
      "Led development of a resume builder platform serving 10,000+ monthly users",
      "Reduced page load time by 40% through Next.js optimization and caching",
      "Mentored 3 junior developers on React best practices and code reviews",
    ],
  },
  {
    company: "StartUp Labs",
    role: "Full Stack Developer",
    startDate: "Jun 2020",
    endDate: "Dec 2021",
    isCurrent: false,
    bullets: [
      "Built REST APIs with Node.js and MongoDB for a SaaS product",
      "Implemented Razorpay payment integration with webhook verification",
    ],
  },
];

const STARTER_PROJECTS = [
  {
    name: "Resume Builder SaaS",
    role: "Lead Developer",
    startDate: "Mar 2024",
    endDate: "",
    isCurrent: true,
    url: "https://github.com/yourprofile/resume-builder",
    techStack: "Next.js, Node.js, MongoDB, Razorpay",
    bullets: [
      "Built ATS-friendly resume templates with live preview and PDF export",
      "Integrated AI job-description optimization for keyword matching",
    ],
  },
  {
    name: "E-Commerce Dashboard",
    role: "Full Stack Developer",
    startDate: "Jan 2023",
    endDate: "Aug 2023",
    isCurrent: false,
    url: "",
    techStack: "React, Express, PostgreSQL",
    bullets: [
      "Developed admin analytics dashboard processing 50K+ daily orders",
    ],
  },
];

const STARTER_SKILLS = [
  { name: "React", level: "Advanced" },
  { name: "Node.js", level: "Advanced" },
  { name: "TypeScript", level: "Intermediate" },
  { name: "MongoDB", level: "Intermediate" },
  { name: "AWS", level: "Beginner" },
];

const STARTER_CERTIFICATIONS = [
  {
    name: "AWS Certified Cloud Practitioner",
    issuer: "Amazon Web Services",
    date: "2023",
    url: "",
  },
];

const STARTER_LANGUAGES = [
  { name: "English", level: "Professional" },
  { name: "Hindi", level: "Native" },
];

const buildStarterResumeContent = (user = {}) => ({
  personal: {
    ...STARTER_PERSONAL_BASE,
    fullName: user.name?.trim() || "Your Name",
    email: user.email?.trim() || "",
  },
  education: STARTER_EDUCATION,
  experience: STARTER_EXPERIENCE,
  projects: STARTER_PROJECTS,
  skills: STARTER_SKILLS,
  certifications: STARTER_CERTIFICATIONS,
  languages: STARTER_LANGUAGES,
});

module.exports = {
  STARTER_PERSONAL_BASE,
  STARTER_EDUCATION,
  STARTER_EXPERIENCE,
  STARTER_PROJECTS,
  STARTER_SKILLS,
  STARTER_CERTIFICATIONS,
  STARTER_LANGUAGES,
  buildStarterResumeContent,
};
