const Resume = require("../models/Resume");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { extractTextFromPdfBuffer } = require("../utils/import/pdfTextExtractor");
const { structureResumeFromText } = require("../utils/ai/resumeImport.service");
const { normalizeImportedResume } = require("../utils/import/normalizeImportedResume");

const parseResumeImport = async (req, res, next) => {
  try {
    if (!req.file?.buffer) {
      return next(new ApiError("PDF file is required.", 400));
    }

    const { text, pageCount, charCount, wasTruncated } = await extractTextFromPdfBuffer(
      req.file.buffer,
    );

    const rawStructured = await structureResumeFromText(text);
    const { data: parsed, warnings } = normalizeImportedResume(rawStructured, { wasTruncated });

    res.status(200).json(
      new ApiResponse(200, "Resume parsed successfully", {
        parsed,
        warnings,
        meta: {
          charCount,
          pageCount,
          fileName: req.file.originalname || "resume.pdf",
        },
      }),
    );
  } catch (error) {
    next(error);
  }
};

module.exports = { parseResumeImport };
