const Resume = require("../models/Resume");
const Payment = require("../models/Payment");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { getResumePricePaise } = require("../utils/pricingSettings");
const { createOrder, verifyPaymentSignature, verifyWebhookSignature } = require("../utils/razorpay.utils");
const { generateAndUploadResumePdf } = require("../utils/pdf.service");
const { sendEmail } = require("../utils/email/email.service");
const { buildPaymentSuccessEmailHtml } = require("../utils/email/paymentSuccess.template");

const getResumePrice = getResumePricePaise;
const THANK_YOU_COOKIE_NAME = "thank_you_access";
const THANK_YOU_COOKIE_MAX_AGE_MS = 15 * 60 * 1000;

const getThankYouCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: THANK_YOU_COOKIE_MAX_AGE_MS,
  path: "/",
});

const createThankYouAccessToken = ({ userId, resumeId, paymentId }) => {
  if (!process.env.JWT_SECRET) {
    throw new ApiError("Server auth secret is missing.", 500);
  }

  return jwt.sign(
    {
      purpose: "thank-you-access",
      userId: String(userId),
      resumeId: String(resumeId),
      paymentId: String(paymentId),
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" },
  );
};

const setThankYouAccessCookie = (res, payload) => {
  const token = createThankYouAccessToken(payload);
  res.cookie(THANK_YOU_COOKIE_NAME, token, getThankYouCookieOptions());
};

const isResumeFulfilled = (resume) =>
  resume?.status === "paid" && Boolean(resume?.pdfUrl);

const needsFulfillment = (payment, resume) =>
  Boolean(payment && resume && !isResumeFulfilled(resume));

const sendPaymentSuccessEmail = async (payment, resume) => {
  try {
    const user = await User.findById(payment.userId);
    if (!user?.email) return;

    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const downloadPageUrl = `${clientUrl}/builder/${resume._id}`;
    const resumeName = resume.personal?.fullName?.trim() || "Your resume";
    const amountInr = Math.round(payment.amount / 100);

    await sendEmail({
      to: user.email,
      subject: "Your resume PDF is ready",
      text: `Hi ${user.name || "there"}, your payment of ₹${amountInr} was successful. Download your resume: ${downloadPageUrl}`,
      html: buildPaymentSuccessEmailHtml({
        userName: user.name,
        resumeName,
        downloadPageUrl,
        amountInr,
      }),
    });
  } catch (error) {
    console.error("Payment success email failed:", error.message);
  }
};

const fulfillPayment = async (payment, razorpayPaymentId) => {
  const resume = await Resume.findById(payment.resumeId);
  if (!resume) return null;

  if (isResumeFulfilled(resume)) {
    return resume;
  }

  const { pdfUrl, pdfPublicId, pdfGeneratedAt } = await generateAndUploadResumePdf(resume);

  resume.status = "paid";
  resume.paymentId = payment._id;
  resume.pdfUrl = pdfUrl;
  resume.pdfPublicId = pdfPublicId;
  resume.pdfGeneratedAt = pdfGeneratedAt;
  await resume.save();

  if (payment.status !== "paid") {
    payment.status = "paid";
    payment.razorpayPaymentId = razorpayPaymentId;
    await payment.save();
  } else if (razorpayPaymentId && !payment.razorpayPaymentId) {
    payment.razorpayPaymentId = razorpayPaymentId;
    await payment.save();
  }

  await sendPaymentSuccessEmail(payment, resume);

  return resume;
};

const createPaymentOrder = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.resumeId,
      userId: req.user._id,
    });

    if (!resume) {
      return next(new ApiError("Resume not found.", 404));
    }

    if (isResumeFulfilled(resume)) {
      return next(new ApiError("This resume is already paid.", 400));
    }

    const amount = await getResumePrice();

    const existingPayment = await Payment.findOne({
      resumeId: resume._id,
      userId: req.user._id,
      status: "created",
    }).sort({ createdAt: -1 });

    if (existingPayment) {
      if (existingPayment.amount === amount) {
        return res.status(200).json(new ApiResponse(200, "Order created", {
          orderId: existingPayment.razorpayOrderId,
          amount: existingPayment.amount,
          currency: existingPayment.currency || "INR",
          keyId: process.env.RAZORPAY_KEY_ID,
        }));
      }

      existingPayment.status = "failed";
      await existingPayment.save();
    }

    const order = await createOrder({
      amount,
      currency: "INR",
      receipt: `resume_${resume._id}`,
      notes: { resumeId: String(resume._id), userId: String(req.user._id) },
    });

    await Payment.create({
      userId: req.user._id,
      resumeId: resume._id,
      razorpayOrderId: order.id,
      amount,
      status: "created",
    });

    res.status(200).json(new ApiResponse(200, "Order created", {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    }));
  } catch (error) {
    next(error);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return next(new ApiError("Missing payment verification fields.", 400));
    }

    const isValid = verifyPaymentSignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!isValid) {
      return next(new ApiError("Payment verification failed.", 400));
    }

    const payment = await Payment.findOne({
      razorpayOrderId,
      userId: req.user._id,
    });

    if (!payment) {
      return next(new ApiError("Payment record not found.", 404));
    }

    const resume = await fulfillPayment(payment, razorpayPaymentId);

    if (!resume || !isResumeFulfilled(resume)) {
      return next(
        new ApiError("Payment received but PDF generation failed. Please retry.", 500),
      );
    }

    setThankYouAccessCookie(res, {
      userId: req.user._id,
      resumeId: resume._id,
      paymentId: payment._id,
    });

    res.status(200).json(new ApiResponse(200, "Payment verified successfully", {
      resume,
    }));
  } catch (error) {
    next(error);
  }
};

const getThankYouContext = async (req, res, next) => {
  try {
    const token = req.cookies?.[THANK_YOU_COOKIE_NAME];
    if (!token) {
      return next(new ApiError("Thank you page is only available right after payment.", 403));
    }

    if (!process.env.JWT_SECRET) {
      return next(new ApiError("Server auth secret is missing.", 500));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      res.clearCookie(THANK_YOU_COOKIE_NAME, getThankYouCookieOptions());
      return next(new ApiError("Thank you access expired. Please continue from builder.", 403));
    }

    if (decoded?.purpose !== "thank-you-access") {
      res.clearCookie(THANK_YOU_COOKIE_NAME, getThankYouCookieOptions());
      return next(new ApiError("Invalid thank you access token.", 403));
    }

    if (String(decoded.userId) !== String(req.user._id)) {
      res.clearCookie(THANK_YOU_COOKIE_NAME, getThankYouCookieOptions());
      return next(new ApiError("Unauthorized thank you access.", 403));
    }

    const payment = await Payment.findOne({
      _id: decoded.paymentId,
      userId: req.user._id,
      resumeId: decoded.resumeId,
      status: "paid",
    });

    if (!payment) {
      res.clearCookie(THANK_YOU_COOKIE_NAME, getThankYouCookieOptions());
      return next(new ApiError("Paid transaction not found for thank you page.", 403));
    }

    const resume = await Resume.findOne({
      _id: decoded.resumeId,
      userId: req.user._id,
    });

    if (!isResumeFulfilled(resume)) {
      res.clearCookie(THANK_YOU_COOKIE_NAME, getThankYouCookieOptions());
      return next(new ApiError("Resume is not ready for download yet.", 403));
    }

    res.clearCookie(THANK_YOU_COOKIE_NAME, getThankYouCookieOptions());

    return res.status(200).json(new ApiResponse(200, "Thank you context fetched", {
      resumeId: String(resume._id),
      paymentId: String(payment._id),
      amount: payment.amount,
      currency: payment.currency || "INR",
      paidAt: payment.updatedAt,
      resumeName: resume.personal?.fullName || "Your resume",
    }));
  } catch (error) {
    return next(error);
  }
};

const getPaymentStatus = async (req, res, next) => {
  try {
    let resume = await Resume.findOne({
      _id: req.params.resumeId,
      userId: req.user._id,
    });

    if (!resume) {
      return next(new ApiError("Resume not found.", 404));
    }

    const latestPayment = await Payment.findOne({
      resumeId: resume._id,
      userId: req.user._id,
    }).sort({ createdAt: -1 });

    if (latestPayment?.status === "paid" && needsFulfillment(latestPayment, resume)) {
      try {
        const fulfilledResume = await fulfillPayment(
          latestPayment,
          latestPayment.razorpayPaymentId,
        );
        if (fulfilledResume) {
          resume = fulfilledResume;
        }
      } catch (error) {
        console.error("Auto-recover fulfillment failed:", error.message);
      }
    }

    res.status(200).json(new ApiResponse(200, "Payment status fetched", {
      resumeStatus: resume.status,
      latestPaymentStatus: latestPayment?.status || null,
      isPaid: isResumeFulfilled(resume),
    }));
  } catch (error) {
    next(error);
  }
};

const handleWebhook = async (req, res, next) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = req.rawBody;

    if (!verifyWebhookSignature(rawBody, signature)) {
      return next(new ApiError("Invalid webhook signature.", 400));
    }

    const event = req.body?.event;
    if (event === "payment.captured") {
      const paymentEntity = req.body?.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      const payment = await Payment.findOne({ razorpayOrderId: orderId });
      if (payment) {
        const resume = await Resume.findById(payment.resumeId);
        if (needsFulfillment(payment, resume)) {
          await fulfillPayment(payment, paymentId);
        }
      }
    }

    res.status(200).json({ status: "ok" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  getPaymentStatus,
  getThankYouContext,
  handleWebhook,
  fulfillPayment,
  isResumeFulfilled,
  needsFulfillment,
};
