const ApiError = require("../ApiError");
const {
  MAX_PDF_PAGES,
  MIN_EXTRACTED_CHARS,
  MAX_EXTRACTED_CHARS,
} = require("../../constants/resumeImport");

let pdfParseModule = null;

function ensurePdfParseModule() {
  if (pdfParseModule) {
    return pdfParseModule;
  }

  try {
    require("@napi-rs/canvas");
  } catch {
    // pdf-parse can still load; import route may fail without canvas on some runtimes
  }

  pdfParseModule = require("pdf-parse");
  return pdfParseModule;
}

const mapPdfParseError = (error, { PasswordException, InvalidPDFException, FormatError }) => {
  if (process.env.NODE_ENV !== "production") {
    console.error("[pdfTextExtractor]", error?.name || "Error", error?.message || error);
  }

  if (error instanceof PasswordException) {
    return new ApiError("Password-protected PDFs are not supported.", 400);
  }

  if (error instanceof InvalidPDFException || error instanceof FormatError) {
    return new ApiError("Invalid or corrupted PDF file.", 400);
  }

  const message = (error?.message || "").toLowerCase();

  if (message.includes("password") || message.includes("encrypted")) {
    return new ApiError("Password-protected PDFs are not supported.", 400);
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

  const { PDFParse, PasswordException, InvalidPDFException, FormatError } =
    ensurePdfParseModule();

  let parser;
  try {
    parser = new PDFParse({ data: buffer });
    const result = await parser.getText();

    const pageCount = result.total || 0;
    if (pageCount > MAX_PDF_PAGES) {
      throw new ApiError(`PDF must be ${MAX_PDF_PAGES} pages or fewer.`, 400);
    }

    const rawText = (result.text || "")
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
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
    throw mapPdfParseError(error, { PasswordException, InvalidPDFException, FormatError });
  } finally {
    if (parser) {
      await parser.destroy().catch(() => {});
    }
  }
};

module.exports = { extractTextFromPdfBuffer };
