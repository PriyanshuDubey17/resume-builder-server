const multer = require("multer");
const ApiError = require("../utils/ApiError");
const { MAX_PDF_BYTES } = require("../constants/resumeImport");

const ALLOWED_PDF_MIMES = new Set([
  "application/pdf",
  "application/x-pdf",
  "application/octet-stream",
]);

const pdfFileFilter = (_req, file, cb) => {
  const isPdfExt = (file.originalname || "").toLowerCase().endsWith(".pdf");
  const isPdfMime = ALLOWED_PDF_MIMES.has(file.mimetype);

  if (!isPdfExt && !isPdfMime) {
    return cb(new ApiError("Only PDF files are allowed.", 400), false);
  }

  return cb(null, true);
};

const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PDF_BYTES,
    files: 1,
  },
  fileFilter: pdfFileFilter,
});

const handleMulterError = (err, _req, _res, next) => {
  if (!err) return next();

  if (err.code === "LIMIT_FILE_SIZE") {
    return next(new ApiError("File too large. Maximum size is 5 MB.", 400));
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return next(new ApiError("Only one PDF file can be uploaded.", 400));
  }

  return next(err);
};

module.exports = { uploadPdf, handleMulterError };
