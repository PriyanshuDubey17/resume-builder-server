const mongoose = require("mongoose");

const personalSchema = new mongoose.Schema(
  {
    fullName: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    location: { type: String, default: "" },
    linkedin: { type: String, default: "" },
    github: { type: String, default: "" },
    portfolio: { type: String, default: "" },
    summary: { type: String, default: "" },
  },
  { _id: false },
);

const educationSchema = new mongoose.Schema(
  {
    school: { type: String, default: "" },
    degree: { type: String, default: "" },
    field: { type: String, default: "" },
    startDate: { type: String, default: "" },
    endDate: { type: String, default: "" },
    gpa: { type: String, default: "" },
  },
  { _id: false },
);

const experienceSchema = new mongoose.Schema(
  {
    company: { type: String, default: "" },
    role: { type: String, default: "" },
    startDate: { type: String, default: "" },
    endDate: { type: String, default: "" },
    isCurrent: { type: Boolean, default: false },
    bullets: { type: [String], default: [] },
  },
  { _id: false },
);

const skillSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    level: { type: String, default: "" },
  },
  { _id: false },
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    role: { type: String, default: "" },
    startDate: { type: String, default: "" },
    endDate: { type: String, default: "" },
    isCurrent: { type: Boolean, default: false },
    url: { type: String, default: "" },
    techStack: { type: String, default: "" },
    bullets: { type: [String], default: [] },
  },
  { _id: false },
);

const certificationSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    issuer: { type: String, default: "" },
    date: { type: String, default: "" },
    url: { type: String, default: "" },
  },
  { _id: false },
);

const languageSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    level: { type: String, default: "" },
  },
  { _id: false },
);

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    templateSlug: {
      type: String,
      required: true,
      default: "modern-professional",
    },
    status: {
      type: String,
      enum: ["draft", "completed", "paid"],
      default: "draft",
    },
    personal: {
      type: personalSchema,
      default: () => ({}),
    },
    education: {
      type: [educationSchema],
      default: [],
    },
    experience: {
      type: [experienceSchema],
      default: [],
    },
    projects: {
      type: [projectSchema],
      default: [],
    },
    skills: {
      type: [skillSchema],
      default: [],
    },
    certifications: {
      type: [certificationSchema],
      default: [],
    },
    languages: {
      type: [languageSchema],
      default: [],
    },
    jobDescription: {
      type: String,
      default: "",
    },
    aiMeta: {
      usageCount: { type: Number, default: 0 },
      lastOptimizedAt: { type: Date, default: null },
      lastSuggestions: { type: mongoose.Schema.Types.Mixed, default: null },
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    pdfUrl: {
      type: String,
      default: null,
    },
    pdfPublicId: {
      type: String,
      default: null,
    },
    lastEditedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Resume", resumeSchema);
