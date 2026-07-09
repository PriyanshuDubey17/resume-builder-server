const { cloudinary } = require("./cloudinary");
const { renderResumeHtml } = require("./resumeHtml.renderer");

const PDF_UPLOAD_FOLDER = "resume-builder/pdfs";

const isServerless = () => Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

const launchServerlessBrowser = async () => {
  const chromiumModule = await import("@sparticuz/chromium");
  const chromium = chromiumModule.default ?? chromiumModule;
  const puppeteer = require("puppeteer-core");

  chromium.setGraphicsMode = false;

  return puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });
};

const launchLocalBrowser = async () => {
  const puppeteer = require("puppeteer");
  const launchOptions = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  };

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  } else {
    // Use installed Google Chrome when Puppeteer's bundled browser is not cached.
    launchOptions.channel = "chrome";
  }

  return puppeteer.launch(launchOptions);
};

const launchBrowser = async () => {
  if (isServerless()) {
    return launchServerlessBrowser();
  }
  return launchLocalBrowser();
};

const generatePdfBuffer = async (resume, showWatermark = false) => {
  const html = renderResumeHtml(resume, showWatermark);
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: "networkidle0", timeout: 15000 });
    } catch {
      await page.setContent(html, { waitUntil: "domcontentloaded" });
    }
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    await page.close();
    return pdfBuffer;
  } catch (error) {
    throw new Error(`PDF generation failed: ${error.message}`);
  } finally {
    await browser.close();
  }
};

const uploadPdfToCloudinary = (pdfBuffer, resumeId) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: PDF_UPLOAD_FOLDER,
        resource_type: "raw",
        format: "pdf",
        public_id: `resume-${resumeId}-${Date.now()}`,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );
    uploadStream.end(pdfBuffer);
  });
};

const generateAndUploadResumePdf = async (resume) => {
  try {
    const pdfBuffer = await generatePdfBuffer(resume);
    const result = await uploadPdfToCloudinary(pdfBuffer, resume._id);
    return {
      pdfUrl: result.secure_url,
      pdfPublicId: result.public_id,
      pdfGeneratedAt: new Date(),
    };
  } catch (error) {
    throw new Error(`PDF generation failed: ${error.message}`);
  }
};

const isPdfStale = (resume) =>
  Boolean(resume.pdfGeneratedAt && resume.lastEditedAt > resume.pdfGeneratedAt);

const regenerateResumePdf = async (resume) => {
  const { pdfUrl, pdfPublicId, pdfGeneratedAt } = await generateAndUploadResumePdf(resume);
  resume.pdfUrl = pdfUrl;
  resume.pdfPublicId = pdfPublicId;
  resume.pdfGeneratedAt = pdfGeneratedAt;
  await resume.save();
  return resume;
};

const PREVIEW_PDF_FOLDER = "resume-builder/preview-pdfs";

const uploadPreviewPdf = (pdfBuffer, resumeId) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: PREVIEW_PDF_FOLDER,
        resource_type: "raw",
        format: "pdf",
        public_id: `preview-${resumeId}-${Date.now()}`,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          previewPdfUrl: result.secure_url,
          previewPdfPublicId: result.public_id,
        });
      },
    );
    uploadStream.end(pdfBuffer);
  });
};

const generatePreviewPdfBuffer = async (resume) => generatePdfBuffer(resume, true);

module.exports = {
  generatePdfBuffer,
  generateAndUploadResumePdf,
  isPdfStale,
  regenerateResumePdf,
  generatePreviewPdfBuffer,
  uploadPreviewPdf,
};
