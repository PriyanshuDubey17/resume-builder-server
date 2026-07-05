const crypto = require("crypto");
const ApiError = require("./ApiError");

let razorpayInstance = null;

const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new ApiError("Payment service is not configured.", 500);
  }

  if (!razorpayInstance) {
    const Razorpay = require("razorpay");
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }

  return razorpayInstance;
};

const createOrder = async ({ amount, currency, receipt, notes }) => {
  const razorpay = getRazorpay();
  return razorpay.orders.create({
    amount,
    currency: currency || "INR",
    receipt,
    notes,
  });
};

const verifyPaymentSignature = ({ orderId, paymentId, signature }) => {
  const body = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  return expected === signature;
};

const verifyWebhookSignature = (body, signature) => {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  return expected === signature;
};

module.exports = {
  createOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
};
