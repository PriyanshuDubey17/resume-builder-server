// scripts/script.js
const path = require("path");
const bcrypt = require("bcryptjs");
require("dotenv").config({
  path: path.join(__dirname, "../.env"), // 👈 FIX
});
const mongoose = require("mongoose");
const User = require("../src/models/User");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const seedPin = (process.env.ADMIN_DEFAULT_PIN || "123456").trim();
  if (!/^\d{6}$/.test(seedPin)) {
    console.error("ADMIN_DEFAULT_PIN must be exactly 6 digits.");
    process.exit(1);
  }

  const exists = await User.findOne({ role: "admin" });
  if (exists) {
    console.log("Admin already exists");
    process.exit(0);
  }

  const pinHash = await bcrypt.hash(seedPin, 10);

  await User.create({
    name: "Super Admin",
    email: "admin@resumebuilder.com",
    mobile: "6204239578",
    pinHash,
    role: "admin",
    status: "active",
    emailVerified: true,
    mobileVerified: true,
  });

  console.log("Admin created");
  process.exit(0);
})();
