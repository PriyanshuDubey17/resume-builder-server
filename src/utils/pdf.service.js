const { cloudinary } = require("./cloudinary");
const { renderResumeHtml } = require("./resumeHtml.renderer");

const PDF_UPLOAD_FOLDER = "resume-builder/pdfs";

let browserInstance = null;

const getBrowser = async () => {
  if (!browserInstance) {
    const puppeteer = require("puppeteer");
    browserInstance = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return browserInstance;
};

const generatePdfBuffer = async (resume) => {
  const html = renderResumeHtml(resume, false);
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });
  await page.close();
  return pdfBuffer;
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
  const pdfBuffer = await generatePdfBuffer(resume);
  const result = await uploadPdfToCloudinary(pdfBuffer, resume._id);
  return {
    pdfUrl: result.secure_url,
    pdfPublicId: result.public_id,
    pdfGeneratedAt: new Date(),
  };
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

module.exports = {
  generatePdfBuffer,
  generateAndUploadResumePdf,
  isPdfStale,
  regenerateResumePdf,
};
