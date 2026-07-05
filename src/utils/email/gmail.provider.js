const nodemailer = require("nodemailer");
const ApiError = require("../../utils/ApiError");

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SENDER_EMAIL_ADDRESS,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function sendViaGmail({ to, subject, text, html }) {
  if (!process.env.SENDER_EMAIL_ADDRESS || !process.env.GMAIL_APP_PASSWORD) {
    throw new ApiError("Missing Gmail provider environment configuration.", 500);
  }

  try {
    const info = await transporter.sendMail({
      from: `"Resume Builder" <${process.env.SENDER_EMAIL_ADDRESS}>`,
      to,
      subject,
      text,
      html,
    });
    return info;
  } catch (error) {
    console.error("Email sending failed:", error);
    throw error;
  }
}

module.exports = { sendViaGmail };