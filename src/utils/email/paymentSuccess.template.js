const buildPaymentSuccessEmailHtml = ({ userName, resumeName, downloadPageUrl, amountInr }) => {
  const displayName = userName || "there";
  const displayResume = resumeName || "your resume";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #A13625;">Resume AI ATS</h2>
      <p>Hi ${displayName},</p>
      <p>Your payment of <strong>₹${amountInr}</strong> was successful. <strong>${displayResume}</strong> is ready to download.</p>
      <p>
        <a href="${downloadPageUrl}" style="display: inline-block; background: #4F46E5; color: #fff; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: bold;">
          Download your resume
        </a>
      </p>
      <p style="color: #5C5A54;">You can also open your dashboard anytime to re-download your PDF.</p>
    </div>
  `;
};

module.exports = { buildPaymentSuccessEmailHtml };
