const Resume = require("../models/Resume");
const Payment = require("../models/Payment");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { getResumePricePaise } = require("../utils/pricingSettings");
const { createOrder, verifyPaymentSignature, verifyWebhookSignature } = require("../utils/razorpay.utils");
const { generateAndUploadResumePdf } = require("../utils/pdf.service");

const getResumePrice = getResumePricePaise;

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

const fulfillPayment = async (payment, razorpayPaymentId) => {
  payment.status = "paid";
  payment.razorpayPaymentId = razorpayPaymentId;
  await payment.save();

  const resume = await Resume.findById(payment.resumeId);
  if (!resume) return;

  const { pdfUrl, pdfPublicId } = await generateAndUploadResumePdf(resume);
  resume.status = "paid";
  resume.paymentId = payment._id;
  resume.pdfUrl = pdfUrl;
  resume.pdfPublicId = pdfPublicId;
  await resume.save();

  return resume;
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

    if (payment.status === "paid") {
      const resume = await Resume.findById(payment.resumeId);
      return res.status(200).json(new ApiResponse(200, "Payment already verified", {
        resume,
      }));
    }

    const resume = await fulfillPayment(payment, razorpayPaymentId);

    res.status(200).json(new ApiResponse(200, "Payment verified successfully", {
      resume,
    }));
  } catch (error) {
    next(error);
  }
};

const handleWebhook = async (req, res, next) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = JSON.stringify(req.body);

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

module.exports = { createPaymentOrder, verifyPayment, handleWebhook };
