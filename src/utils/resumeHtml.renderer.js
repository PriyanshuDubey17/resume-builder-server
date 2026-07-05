const escapeHtml = (str) => {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

const formatDateRange = (start, end, isCurrent) => {
  if (!start && !end) return "";
  if (isCurrent) return `${escapeHtml(start)} – Present`;
  return `${escapeHtml(start)} – ${escapeHtml(end)}`;
};

const shortenUrl = (url) => {
  if (!url) return "";
  return escapeHtml(url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""));
};

const renderPersonalLinks = (personal) => {
  const parts = [];
  if (personal.linkedin) parts.push(`LinkedIn: ${shortenUrl(personal.linkedin)}`);
  if (personal.github) parts.push(`GitHub: ${shortenUrl(personal.github)}`);
  if (personal.portfolio) parts.push(`Portfolio: ${shortenUrl(personal.portfolio)}`);
  return parts;
};

const getSkillLevelWidth = (level) => {
  switch (level) {
    case "Beginner":
      return "40%";
    case "Intermediate":
      return "65%";
    case "Advanced":
      return "90%";
    default:
      return "50%";
  }
};

const formatEducationDetails = (edu) => {
  const degree = `${escapeHtml(edu.degree || "")}${edu.field ? ` in ${escapeHtml(edu.field)}` : ""}`;
  const dates = formatDateRange(edu.startDate, edu.endDate, false);
  const gpa = edu.gpa ? `GPA: ${escapeHtml(edu.gpa)}` : "";
  return [degree, escapeHtml(edu.school), dates, gpa].filter(Boolean);
};

const formatSkillLabel = (skill) => {
  const name = escapeHtml(skill.name);
  return skill.level ? `${name} (${escapeHtml(skill.level)})` : name;
};

const renderSummaryHtml = (personal, title = "Summary", titleClass = "") => {
  if (!personal?.summary) return "";
  return `<h2 class="${titleClass}">${title}</h2><p class="summary">${escapeHtml(personal.summary)}</p>`;
};

const renderExperienceHtml = (experience, title = "Experience", titleClass = "", jobClass = "job") => {
  if (!experience?.length) return "";
  const jobs = experience.map((job) => `
    <div class="${jobClass}">
      <div class="job-header">
        <span>${escapeHtml(job.company)}</span>
        <span>${formatDateRange(job.startDate, job.endDate, job.isCurrent)}</span>
      </div>
      <div class="job-role">${escapeHtml(job.role)}</div>
      <ul>${(job.bullets || []).map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>
    </div>
  `).join("");
  return `<h2 class="${titleClass}">${title}</h2>${jobs}`;
};

const renderProjectsHtml = (projects, title = "Projects", titleClass = "", itemClass = "job") => {
  if (!projects?.length) return "";
  const items = projects.map((proj) => `
    <div class="${itemClass}">
      <div class="job-header">
        <span>${escapeHtml(proj.name)}</span>
        <span>${formatDateRange(proj.startDate, proj.endDate, proj.isCurrent)}</span>
      </div>
      ${proj.role ? `<div class="job-role">${escapeHtml(proj.role)}</div>` : ""}
      ${proj.techStack ? `<div class="meta">${escapeHtml(proj.techStack)}</div>` : ""}
      <ul>${(proj.bullets || []).map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>
    </div>
  `).join("");
  return `<h2 class="${titleClass}">${title}</h2>${items}`;
};

const renderEducationHtml = (education, title = "Education", titleClass = "", itemClass = "edu-item") => {
  if (!education?.length) return "";
  const edu = education.map((e) => {
    const parts = formatEducationDetails(e);
    return `<div class="${itemClass}"><strong>${parts[0]}</strong><br/>${parts.slice(1).join(" · ")}</div>`;
  }).join("");
  return `<h2 class="${titleClass}">${title}</h2>${edu}`;
};

const renderSkillsInlineHtml = (skills, title = "Skills", titleClass = "") => {
  if (!skills?.length) return "";
  return `<h2 class="${titleClass}">${title}</h2><p class="skills">${skills.map((s) => formatSkillLabel(s)).join(" · ")}</p>`;
};

const renderSkillsListHtml = (skills, title = "Skills", titleClass = "") => {
  if (!skills?.length) return "";
  return `<h3 class="${titleClass}">${title}</h3><ul>${skills.map((s) => `<li>${formatSkillLabel(s)}</li>`).join("")}</ul>`;
};

const renderSkillsPillsHtml = (skills, title = "Skills", titleClass = "") => {
  if (!skills?.length) return "";
  return `<h2 class="${titleClass}">${title}</h2><div class="pills">${skills.map((s) => `<span class="pill">${formatSkillLabel(s)}</span>`).join("")}</div>`;
};

const renderSkillsBarsHtml = (skills, title = "Skills", titleClass = "") => {
  if (!skills?.length) return "";
  const bars = skills.map((s) => `
    <div class="skill-bar">
      <span>${formatSkillLabel(s)}</span>
      <div class="bar"><div class="bar-fill" style="width:${getSkillLevelWidth(s.level)}"></div></div>
    </div>
  `).join("");
  return `<h3 class="${titleClass}">${title}</h3>${bars}`;
};

const renderCertificationsHtml = (certifications, title = "Certifications", titleClass = "", itemClass = "cert-item") => {
  if (!certifications?.length) return "";
  const items = certifications.map((cert) => `
    <div class="${itemClass}">
      <strong>${escapeHtml(cert.name)}</strong>
      <div class="meta">${[cert.issuer, cert.date].filter(Boolean).map(escapeHtml).join(" · ")}</div>
    </div>
  `).join("");
  return `<h2 class="${titleClass}">${title}</h2>${items}`;
};

const renderLanguagesHtml = (languages, title = "Languages", titleClass = "") => {
  if (!languages?.length) return "";
  const text = languages.map((l) => `${escapeHtml(l.name)}${l.level ? ` (${escapeHtml(l.level)})` : ""}`).join(" · ");
  return `<h2 class="${titleClass}">${title}</h2><p class="languages">${text}</p>`;
};

const TEMPLATE_STYLES = {
  "modern-professional": `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Inter, Arial, sans-serif; font-size: 11px; color: #18181B; }
    .page { display: flex; min-height: 297mm; }
    .sidebar { width: 32%; background: #27272A; color: #fff; padding: 28px 20px; }
    .sidebar h1 { font-size: 20px; margin-bottom: 8px; }
    .sidebar .contact { font-size: 10px; line-height: 1.6; margin-bottom: 20px; }
    .sidebar h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin: 16px 0 8px; border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 4px; }
    .sidebar ul { list-style: none; }
    .sidebar li { font-size: 10px; margin-bottom: 4px; }
    .main { width: 68%; padding: 28px 24px; }
    .main h2 { font-size: 12px; text-transform: uppercase; color: #3F3F46; border-bottom: 2px solid #3F3F46; padding-bottom: 4px; margin: 18px 0 10px; }
    .main h2:first-child { margin-top: 0; }
    .summary { line-height: 1.5; color: #52525B; margin-bottom: 4px; }
    .job { margin-bottom: 14px; }
    .job-header { display: flex; justify-content: space-between; font-weight: bold; }
    .job-role { color: #52525B; font-weight: normal; font-size: 10px; }
    .meta { font-size: 10px; color: #71717A; }
    .job ul { margin: 6px 0 0 16px; }
    .job li { margin-bottom: 3px; line-height: 1.4; }
    .edu-item, .cert-item { margin-bottom: 8px; }
    .languages { margin-bottom: 8px; }
  `,
  "minimal-ats": `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #000; max-width: 700px; margin: 0 auto; padding: 32px; }
    h1 { font-size: 24px; margin-bottom: 4px; }
    .contact-line { font-size: 10px; margin-bottom: 16px; color: #333; }
    h2 { font-size: 12px; text-transform: uppercase; margin: 16px 0 8px; border-bottom: 1px solid #000; }
    p, li { line-height: 1.45; }
    .job { margin-bottom: 12px; }
    .job-title { font-weight: bold; }
    ul { margin-left: 18px; }
    .skills, .languages { font-size: 10px; margin-bottom: 8px; }
    .meta { font-size: 10px; color: #555; }
  `,
  "sidebar-accent": `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; }
    .page { display: flex; min-height: 297mm; }
    .sidebar { width: 30%; background: #27272A; color: #fff; padding: 28px 18px; }
    .sidebar h1 { font-size: 18px; margin-bottom: 12px; }
    .sidebar .info { font-size: 10px; line-height: 1.7; margin-bottom: 16px; }
    .sidebar h3 { font-size: 10px; text-transform: uppercase; margin: 14px 0 8px; }
    .skill-bar { margin-bottom: 8px; }
    .skill-bar span { font-size: 9px; display: block; margin-bottom: 2px; }
    .bar { height: 4px; background: rgba(255,255,255,0.3); border-radius: 2px; }
    .bar-fill { height: 100%; background: #fff; border-radius: 2px; }
    .cert-item { margin-bottom: 6px; font-size: 10px; }
    .languages { font-size: 10px; margin-bottom: 8px; }
    .main { width: 70%; padding: 28px 22px; color: #18181B; }
    .main h2 { color: #3F3F46; font-size: 12px; text-transform: uppercase; margin: 16px 0 8px; }
    .job { margin-bottom: 14px; padding-left: 12px; border-left: 2px solid #3F3F46; }
    .job h3 { font-size: 11px; }
    ul { margin: 6px 0 0 14px; }
    li { margin-bottom: 3px; line-height: 1.4; }
    .meta { font-size: 10px; color: #71717A; }
  `,
  "executive-classic": `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Georgia, 'Times New Roman', serif; font-size: 11px; color: #18181B; padding: 36px 40px; }
    .header { text-align: center; margin-bottom: 20px; }
    .header h1 { font-size: 28px; font-weight: normal; letter-spacing: 2px; margin-bottom: 6px; }
    .header .contact { font-family: Arial, sans-serif; font-size: 10px; color: #52525B; }
    hr { border: none; border-top: 1px solid #999; margin: 14px 0; }
    h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .summary { font-style: italic; line-height: 1.5; margin-bottom: 4px; }
    .job { margin-bottom: 12px; font-family: Arial, sans-serif; }
    .job-header { font-weight: bold; }
    ul { margin: 4px 0 0 18px; }
    li { margin-bottom: 3px; line-height: 1.4; }
    .skills, .languages { font-family: Arial, sans-serif; margin-bottom: 8px; }
    .meta { font-size: 10px; color: #52525B; }
  `,
  "tech-developer": `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Inter, Arial, sans-serif; font-size: 11px; color: #18181B; padding: 28px 32px; }
    h1 { font-size: 24px; color: #18181B; margin-bottom: 4px; }
    .mono { font-family: 'Courier New', monospace; font-size: 10px; color: #52525B; }
    .links { margin-bottom: 14px; }
    h2 { font-family: 'Courier New', monospace; font-size: 11px; color: #52525B; text-transform: uppercase; margin: 14px 0 8px; }
    .pills { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
    .pill { background: #F4F4F5; padding: 3px 10px; border-radius: 12px; font-size: 10px; color: #3F3F46; }
    .job { margin-bottom: 12px; }
    .job h3 { font-size: 12px; }
    ul { margin: 4px 0 0 16px; }
    li { margin-bottom: 3px; line-height: 1.4; }
    .meta { font-size: 10px; color: #71717A; }
    .languages { margin-bottom: 8px; }
  `,
  "ats-elite": `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Inter, Arial, sans-serif; font-size: 11px; color: #18181B; padding: 32px; max-width: 700px; margin: 0 auto; }
    .accent-bar { border-top: 4px solid #3F3F46; margin-bottom: 20px; }
    h1 { font-size: 26px; font-weight: 600; margin-bottom: 4px; color: #18181B; }
    .headline { font-size: 12px; color: #52525B; margin-bottom: 8px; }
    .contact-line { font-size: 10px; color: #52525B; margin-bottom: 20px; }
    h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #3F3F46; border-bottom: 2px solid #3F3F46; padding-bottom: 4px; margin: 20px 0 10px; }
    h2:first-of-type { margin-top: 0; }
    .summary { line-height: 1.55; color: #52525B; margin-bottom: 4px; }
    .job { margin-bottom: 14px; }
    .job-header { display: flex; justify-content: space-between; font-weight: 600; }
    .job-role { color: #52525B; font-weight: normal; font-size: 11px; margin: 2px 0 4px; }
    .meta { font-size: 10px; color: #52525B; margin-bottom: 4px; }
    ul { margin: 4px 0 0 16px; }
    li { margin-bottom: 3px; line-height: 1.45; }
    .edu-item { margin-bottom: 8px; }
    .edu-item strong { display: block; }
    .cert-item { margin-bottom: 8px; }
    .skills, .languages { font-size: 11px; color: #18181B; margin-bottom: 8px; line-height: 1.5; }
  `,
};

const renderModernProfessional = (resume) => {
  const { personal, education, experience, projects, skills, certifications, languages } = resume;
  const links = renderPersonalLinks(personal);

  return `
    <div class="page">
      <div class="sidebar">
        <h1>${escapeHtml(personal.fullName)}</h1>
        <div class="contact">
          ${personal.email ? `${escapeHtml(personal.email)}<br/>` : ""}
          ${personal.phone ? `${escapeHtml(personal.phone)}<br/>` : ""}
          ${personal.location ? `${escapeHtml(personal.location)}<br/>` : ""}
          ${links.join("<br/>")}
        </div>
        ${renderSkillsListHtml(skills)}
        ${renderLanguagesHtml(languages, "Languages", "sidebar h3")}
      </div>
      <div class="main">
        ${renderSummaryHtml(personal)}
        ${renderExperienceHtml(experience)}
        ${renderProjectsHtml(projects)}
        ${renderEducationHtml(education)}
        ${renderCertificationsHtml(certifications)}
      </div>
    </div>
  `;
};

const renderMinimalATS = (resume) => {
  const { personal, education, experience, projects, skills, certifications, languages } = resume;
  const contact = [
    personal.email,
    personal.phone,
    personal.location,
    ...renderPersonalLinks(personal).map((l) => l.replace(/^(LinkedIn|GitHub|Portfolio): /, "")),
  ].filter(Boolean).map(escapeHtml).join(" | ");

  const expHtml = (experience || []).length
    ? `<h2>Experience</h2>${(experience || []).map((job) => `
      <div class="job">
        <div class="job-title">${escapeHtml(job.role)} — ${escapeHtml(job.company)}</div>
        <div>${formatDateRange(job.startDate, job.endDate, job.isCurrent)}</div>
        <ul>${(job.bullets || []).map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>
      </div>
    `).join("")}`
    : "";

  const projHtml = (projects || []).length
    ? `<h2>Projects</h2>${(projects || []).map((proj) => `
      <div class="job">
        <div class="job-title">${escapeHtml(proj.name)}${proj.role ? ` — ${escapeHtml(proj.role)}` : ""}</div>
        <div>${formatDateRange(proj.startDate, proj.endDate, proj.isCurrent)}</div>
        ${proj.techStack ? `<div class="meta">${escapeHtml(proj.techStack)}</div>` : ""}
        <ul>${(proj.bullets || []).map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>
      </div>
    `).join("")}`
    : "";

  const eduHtml = (education || []).length
    ? `<h2>Education</h2>${(education || []).map((e) => {
      const parts = formatEducationDetails(e);
      return `<div class="job"><div class="job-title">${parts[0]} — ${escapeHtml(e.school)}</div><div>${parts.slice(2).join(" · ")}</div></div>`;
    }).join("")}`
    : "";

  return `
    <h1>${escapeHtml(personal.fullName)}</h1>
    <div class="contact-line">${contact}</div>
    ${renderSummaryHtml(personal)}
    ${expHtml}
    ${projHtml}
    ${eduHtml}
    ${renderSkillsInlineHtml(skills)}
    ${renderCertificationsHtml(certifications)}
    ${renderLanguagesHtml(languages)}
  `;
};

const renderSidebarAccent = (resume) => {
  const { personal, education, experience, projects, skills, certifications, languages } = resume;
  const links = renderPersonalLinks(personal);

  return `
    <div class="page">
      <div class="sidebar">
        <h1>${escapeHtml(personal.fullName)}</h1>
        <div class="info">
          ${personal.email ? `${escapeHtml(personal.email)}<br/>` : ""}
          ${personal.phone ? `${escapeHtml(personal.phone)}<br/>` : ""}
          ${personal.location ? `${escapeHtml(personal.location)}<br/>` : ""}
          ${links.join("<br/>")}
        </div>
        ${renderSkillsBarsHtml(skills)}
        ${renderLanguagesHtml(languages, "Languages", "sidebar h3")}
        ${renderCertificationsHtml(certifications, "Certifications", "sidebar h3", "cert-item")}
      </div>
      <div class="main">
        ${renderSummaryHtml(personal, "About")}
        ${renderExperienceHtml(experience, "Experience", "", "job")}
        ${renderProjectsHtml(projects, "Projects", "", "job")}
        ${renderEducationHtml(education, "Education", "", "job")}
      </div>
    </div>
  `;
};

const renderExecutiveClassic = (resume) => {
  const { personal, education, experience, projects, skills, certifications, languages } = resume;
  const contact = [
    personal.email,
    personal.phone,
    personal.location,
    ...renderPersonalLinks(personal),
  ].filter(Boolean).map((item) => escapeHtml(item)).join(" · ");

  return `
    <div class="header">
      <h1>${escapeHtml(personal.fullName)}</h1>
      <div class="contact">${contact}</div>
    </div>
    <hr/>
    ${renderSummaryHtml(personal, "Executive Summary")}
    ${(personal.summary) ? "<hr/>" : ""}
    ${renderExperienceHtml(experience, "Professional Experience")}
    ${(experience || []).length ? "<hr/>" : ""}
    ${renderProjectsHtml(projects, "Projects")}
    ${(projects || []).length ? "<hr/>" : ""}
    ${renderEducationHtml(education)}
    ${(education || []).length ? "<hr/>" : ""}
    ${renderSkillsInlineHtml(skills, "Core Competencies")}
    ${renderCertificationsHtml(certifications)}
    ${renderLanguagesHtml(languages)}
  `;
};

const renderAtsElite = (resume) => {
  const { personal, education, experience, projects, skills, certifications, languages } = resume;
  const contact = [
    personal.email,
    personal.phone,
    personal.location,
    ...renderPersonalLinks(personal).map((l) => l.replace(/^(LinkedIn|GitHub|Portfolio): /, "")),
  ].filter(Boolean).map(escapeHtml).join(" | ");
  const latestRole = experience?.[0]?.role;

  return `
    <div class="accent-bar"></div>
    <h1>${escapeHtml(personal.fullName)}</h1>
    ${latestRole ? `<div class="headline">${escapeHtml(latestRole)}</div>` : ""}
    <div class="contact-line">${contact}</div>
    ${renderSummaryHtml(personal, "Summary")}
    ${renderExperienceHtml(experience, "Experience")}
    ${renderProjectsHtml(projects, "Projects")}
    ${renderEducationHtml(education, "Education")}
    ${renderSkillsInlineHtml(skills, "Skills")}
    ${renderCertificationsHtml(certifications, "Certifications")}
    ${renderLanguagesHtml(languages, "Languages")}
  `;
};

const renderTechDeveloper = (resume) => {
  const { personal, education, experience, projects, skills, certifications, languages } = resume;
  const contact = [
    personal.email,
    personal.phone,
    personal.location,
    ...renderPersonalLinks(personal).map((l) => l.replace(/^(LinkedIn|GitHub|Portfolio): /, "")),
  ].filter(Boolean).map(escapeHtml);
  const latestRole = experience?.[0]?.role;

  return `
    <h1>${escapeHtml(personal.fullName)}</h1>
    ${latestRole ? `<div class="mono">${escapeHtml(latestRole)}</div>` : ""}
    <div class="links mono">${contact.join(" · ")}</div>
    ${renderSummaryHtml(personal, "Summary")}
    ${renderSkillsPillsHtml(skills)}
    ${renderProjectsHtml(projects, "Projects")}
    ${renderExperienceHtml(experience, "Experience")}
    ${renderEducationHtml(education)}
    ${renderCertificationsHtml(certifications)}
    ${renderLanguagesHtml(languages)}
  `;
};

const RENDERERS = {
  "modern-professional": renderModernProfessional,
  "minimal-ats": renderMinimalATS,
  "sidebar-accent": renderSidebarAccent,
  "executive-classic": renderExecutiveClassic,
  "tech-developer": renderTechDeveloper,
  "ats-elite": renderAtsElite,
};

const renderResumeBody = (resume) => {
  const renderer = RENDERERS[resume.templateSlug] || renderModernProfessional;
  return renderer(resume);
};

const renderResumeHtml = (resume, showWatermark = true) => {
  const styles = TEMPLATE_STYLES[resume.templateSlug] || TEMPLATE_STYLES["modern-professional"];
  const body = renderResumeBody(resume);
  const watermarkTiles = showWatermark
    ? Array.from({ length: 16 }, () => `
        <span style="white-space:nowrap;font-size:13px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:rgba(79,70,229,0.14);">
          PREVIEW — PAY TO DOWNLOAD
        </span>
      `).join("")
    : "";

  const watermark = showWatermark ? `
    <div style="position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;overflow:hidden;">
      <div style="position:absolute;inset:0;background:rgba(79,70,229,0.04);"></div>
      <div style="position:absolute;inset:-45%;display:flex;flex-wrap:wrap;align-content:center;justify-content:center;gap:36px 40px;transform:rotate(-32deg);">
        ${watermarkTiles}
      </div>
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center;padding:16px;">
        <span style="font-size:28px;font-weight:800;letter-spacing:0.25em;text-transform:uppercase;color:rgba(79,70,229,0.32);">Preview Only</span>
        <span style="font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:rgba(79,70,229,0.2);">Pay to download clean PDF</span>
      </div>
    </div>
  ` : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${styles}
    @page { size: A4; margin: 0; }
    body { margin: 0; }
  </style></head><body>${body}${watermark}</body></html>`;
};

const getTemplateStyles = (slug) => TEMPLATE_STYLES[slug] || TEMPLATE_STYLES["modern-professional"];

module.exports = { renderResumeHtml, getTemplateStyles, escapeHtml };
