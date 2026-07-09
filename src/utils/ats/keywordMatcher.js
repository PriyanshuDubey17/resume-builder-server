const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
  "by", "from", "as", "is", "was", "are", "were", "be", "been", "being", "have", "has",
  "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must",
  "shall", "can", "need", "dare", "ought", "used", "we", "you", "they", "he", "she", "it",
  "this", "that", "these", "those", "i", "my", "your", "our", "their", "his", "her", "its",
  "who", "whom", "which", "what", "whose", "when", "where", "why", "how", "all", "each",
  "every", "both", "few", "more", "most", "other", "some", "such", "no", "nor", "not",
  "only", "own", "same", "so", "than", "too", "very", "just", "about", "into", "through",
  "during", "before", "after", "above", "below", "up", "down", "out", "off", "over", "under",
  "again", "further", "then", "once", "here", "there", "any", "work", "working", "role",
  "position", "job", "team", "company", "experience", "years", "year", "required", "preferred",
  "ability", "skills", "skill", "including", "etc", "using", "use", "used", "within",
  "across", "well", "also", "able", "strong", "good", "excellent", "looking", "join",
]);

const tokenize = (text) => {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.replace(/^\.+|\.+$/g, ""))
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
};

const extractTopKeywords = (jobDescription, limit = 15) => {
  const tokens = tokenize(jobDescription);
  const frequency = new Map();
  tokens.forEach((token) => {
    frequency.set(token, (frequency.get(token) || 0) + 1);
  });
  return [...frequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
};

const buildResumeTextBlob = (resume) => {
  const parts = [
    resume.personal?.summary,
    resume.personal?.fullName,
    ...(resume.skills || []).map((s) => s.name),
    ...(resume.experience || []).flatMap((job) => [
      job.company,
      job.role,
      ...(job.bullets || []),
    ]),
    ...(resume.projects || []).flatMap((proj) => [
      proj.name,
      proj.role,
      proj.techStack,
      ...(proj.bullets || []),
    ]),
    ...(resume.education || []).flatMap((edu) => [edu.school, edu.degree, edu.field]),
    ...(resume.certifications || []).map((c) => c.name),
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
};

const matchKeywords = (resume, jobDescription) => {
  if (!jobDescription?.trim()) {
    return { percent: 0, matched: [], missing: [], keywords: [] };
  }

  const keywords = extractTopKeywords(jobDescription);
  if (!keywords.length) {
    return { percent: 0, matched: [], missing: [], keywords: [] };
  }

  const resumeText = buildResumeTextBlob(resume);
  const matched = keywords.filter((kw) => resumeText.includes(kw));
  const missing = keywords.filter((kw) => !resumeText.includes(kw));
  const percent = Math.round((matched.length / keywords.length) * 100);

  return { percent, matched, missing: missing.slice(0, 5), keywords };
};

module.exports = { matchKeywords, extractTopKeywords, buildResumeTextBlob };
