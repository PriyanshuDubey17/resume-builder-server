require("dotenv").config();
const app = require("./app");

if (process.env.VERCEL) {
  module.exports = app;
} else {
  const connectDB = require("./src/config/db");
  const PORT = process.env.PORT || 4001;

  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error("MongoDB Error:", err.message);
      process.exit(1);
    });
}
