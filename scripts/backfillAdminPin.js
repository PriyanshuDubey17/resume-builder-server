const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

const connectDB = require("../src/config/db");
const User = require("../src/models/User");

dotenv.config();

const run = async () => {
  const defaultPin = (process.env.ADMIN_DEFAULT_PIN || "").trim();

  if (!/^\d{6}$/.test(defaultPin)) {
    console.error("ADMIN_DEFAULT_PIN must be exactly 6 digits.");
    process.exit(1);
  }

  try {
    await connectDB();
    const pinHash = await bcrypt.hash(defaultPin, 10);

    const result = await User.updateMany(
      { role: "admin", $or: [{ pinHash: { $exists: false } }, { pinHash: null }, { pinHash: "" }] },
      { $set: { pinHash } },
    );

    console.log(
      `Admin PIN backfill completed. Matched: ${result.matchedCount}, Updated: ${result.modifiedCount}`,
    );
  } catch (error) {
    console.error("Backfill failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

run();
