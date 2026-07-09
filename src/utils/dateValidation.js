const MONTH_PATTERN =
  /^(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(t(ember)?)?|oct(ober)?|nov(ember)?|dec(ember)?)\s+\d{4}$/i;

const YEAR_PATTERN = /^\d{4}$/;

const isValidResumeDate = (value) => {
  if (!value || typeof value !== "string") return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  return YEAR_PATTERN.test(trimmed) || MONTH_PATTERN.test(trimmed);
};

const collectResumeDates = (resume) => {
  const dates = [];
  (resume.education || []).forEach((item) => {
    if (item.startDate?.trim()) dates.push(item.startDate);
    if (item.endDate?.trim()) dates.push(item.endDate);
  });
  (resume.experience || []).forEach((item) => {
    if (item.startDate?.trim()) dates.push(item.startDate);
    if (!item.isCurrent && item.endDate?.trim()) dates.push(item.endDate);
  });
  (resume.projects || []).forEach((item) => {
    if (item.startDate?.trim()) dates.push(item.startDate);
    if (!item.isCurrent && item.endDate?.trim()) dates.push(item.endDate);
  });
  (resume.certifications || []).forEach((item) => {
    if (item.date?.trim()) dates.push(item.date);
  });
  return dates;
};

const areResumeDatesValid = (resume) => {
  const dates = collectResumeDates(resume);
  return dates.every(isValidResumeDate);
};

module.exports = {
  isValidResumeDate,
  collectResumeDates,
  areResumeDatesValid,
};
