const pdfParse = require("pdf-parse");
const ApiError = require("../ApiError");
const {
  MAX_PDF_PAGES,
  MIN_EXTRACTED_CHARS,
  MAX_EXTRACTED_CHARS,
} = require("../../constants/resumeImport");

const normalizeExtractedText = (rawText) =>
  (rawText || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const mapPdfParseError = (error) => {
  console.error("[resume-import] pdf-parse:", error?.name || "Error", error?.message || error);

  const message = (error?.message || "").toLowerCase();

  if (message.includes("password") || message.includes("encrypted")) {
    return new ApiError("Password-protected PDFs are not supported.", 400);
  }

  if (
    message.includes("invalid pdf") ||
    message.includes("corrupt") ||
    message.includes("format error") ||
    message.includes("xref")
  ) {
    return new ApiError("Invalid or corrupted PDF file.", 400);
  }

  return new ApiError(
    "Could not read this PDF. Try exporting again from Word or Google Docs.",
    400,
  );
};

const extractTextFromPdfBuffer = async (buffer) => {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new ApiError("Invalid file.", 400);
  }

  try {
    const result = await pdfParse(buffer);

    const pageCount = result.numpages || 0;
    if (pageCount > MAX_PDF_PAGES) {
      throw new ApiError(`PDF must be ${MAX_PDF_PAGES} pages or fewer.`, 400);
    }

    const rawText = normalizeExtractedText(result.text);
    const charCount = rawText.length;

    if (charCount < MIN_EXTRACTED_CHARS) {
      throw new ApiError(
        "This looks like a scanned PDF. Upload a text-based PDF exported from Word or Google Docs.",
        422,
      );
    }

    let text = rawText;
    let wasTruncated = false;

    if (text.length > MAX_EXTRACTED_CHARS) {
      text = text.slice(0, MAX_EXTRACTED_CHARS);
      wasTruncated = true;
    }

    return {
      text,
      pageCount: pageCount || 1,
      charCount,
      wasTruncated,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw mapPdfParseError(error);
  }
};

module.exports = { extractTextFromPdfBuffer };
