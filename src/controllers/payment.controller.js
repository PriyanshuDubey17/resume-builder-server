const Resume = require("../models/Resume");
const Payment = require("../models/Payment");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { getResumePricePaise } = require("../utils/pricingSettings");
const { createOrder, verifyPaymentSignature, verifyWebhookSignature } = require("../utils/razorpay.utils");
const { generateAndUploadResumePdf } = require("../utils/pdf.service");
const { sendEmail } = require("../utils/email/email.service");
const { buildPaymentSuccessEmailHtml } = require("../utils/email/paymentSuccess.template");

const getResumePrice = getResumePricePaise;

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
  if (payment.status === "paid") {
    return Resume.findById(payment.resumeId);
  }

  payment.status = "paid";
  payment.razorpayPaymentId = razorpayPaymentId;
  await payment.save();

  const resume = await Resume.findById(payment.resumeId);
  if (!resume) return null;

  const { pdfUrl, pdfPublicId, pdfGeneratedAt } = await generateAndUploadResumePdf(resume);
  resume.status = "paid";
  resume.paymentId = payment._id;
  resume.pdfUrl = pdfUrl;
  resume.pdfPublicId = pdfPublicId;
  resume.pdfGeneratedAt = pdfGeneratedAt;
  await resume.save();

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

    if (resume.status === "paid") {
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

    res.status(200).json(new ApiResponse(200, "Payment verified successfully", {
      resume,
    }));
  } catch (error) {
    next(error);
  }
};

const getPaymentStatus = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
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

    res.status(200).json(new ApiResponse(200, "Payment status fetched", {
      resumeStatus: resume.status,
      latestPaymentStatus: latestPayment?.status || null,
      isPaid: resume.status === "paid",
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
      if (payment && payment.status !== "paid") {
        await fulfillPayment(payment, paymentId);
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
  handleWebhook,
};
