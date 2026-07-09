const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.ADMIN_URL,
].filter(Boolean);

function addWwwPair(origins, url) {
  try {
    const parsed = new URL(url);
    const host = parsed.host;
    const altHost = host.startsWith("www.")
      ? host.slice(4)
      : `www.${host}`;
    const altOrigin = `${parsed.protocol}//${altHost}`;
    origins.push(altOrigin);
  } catch {
    // ignore invalid URLs
  }
}

if (process.env.CLIENT_URL) {
  addWwwPair(allowedOrigins, process.env.CLIENT_URL);
}
if (process.env.ADMIN_URL) {
  addWwwPair(allowedOrigins, process.env.ADMIN_URL);
}

const uniqueOrigins = [...new Set(allowedOrigins)];

const corsOptions = {
  origin: function (origin, callback) {
    // Postman / server-to-server requests (no origin)
    if (!origin) return callback(null, true);

    if (uniqueOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  exposedHeaders: ["Content-Disposition", "X-Download-Filename", "X-Pdf-Regenerated"],
};

module.exports = corsOptions;
