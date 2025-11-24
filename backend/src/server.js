import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";


// NOTE: Controllers and routes have been migrated to microservices
// This server now only handles file uploads and static file serving
// All API routes are handled by API Gateway and respective microservices

// NOTE: File uploads have been migrated to File Service

// Middleware
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { trackTraffic } from "./middleware/trafficTracker.js";

// Seed + Queue
import { seedAdmins } from "../seed/seedAdminsFromFile.js";
import "./queueHandlers.js";

const app = express();
const PORT = process.env.PORT || 4002;

// ====== Log trạng thái key ======
const hasOpenRouterKey = !!process.env.OPENROUTER_API_KEY;
console.log(
  "🔑 OPENROUTER_API_KEY: - server.js",
  hasOpenRouterKey
    ? process.env.OPENROUTER_API_KEY.slice(0, 8) + "..."
    : "❌ missing"
);

if (!hasOpenRouterKey) {
  console.warn("⚠️  WARNING: OPENROUTER_API_KEY is not set in .env file.");
  console.warn("   AI features (story mode, analysis) will use fallback responses.");
  console.warn("   To enable AI features, add OPENROUTER_API_KEY=your_key_here to your .env file.");
  console.warn("   Get your API key from: https://openrouter.ai/keys");
}

// ====== Middleware ======
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(requestLogger);
app.use(trackTraffic); // Track traffic và online users

// NOTE: Multer config has been migrated to File Service

// ====== Health check ======
app.get("/health/ai", (_req, res) => {
  res.json({
    openrouter: !!process.env.OPENROUTER_API_KEY,
    openrouter_model: process.env.OPENROUTER_MODEL || null,
  });
});

// ====== Routes ======
// NOTE: All routes have been migrated to microservices
// Routes are now handled by API Gateway which proxies to respective services:
// - /api/auth -> User Service
// - /api/admin -> Admin Service
// - /api/learners -> Learner Service
// - /api/mentors -> Mentor Service
// - /api/community -> Community Service
// - /api/notifications -> Notification Service
// - /api/challenges -> Learner Service
// - /api/packages -> Package Service
// - /api/purchases -> Purchase Service
// - /api/ai -> AI Service

// NOTE: File uploads and static file serving have been migrated to File Service
// Routes are now handled by API Gateway which proxies to File Service:
// - /api/uploads -> File Service
// - /uploads -> File Service

// ====== Simple logger ======
app.use((req, _res, next) => {
  console.log("📥 Incoming: - server.js:78", req.method, req.url);
  next();
});

// ====== Error handler ======
app.use(errorHandler);

// ====== Start server ======
seedAdmins()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT} - server.js:89`);
      console.log(
        "🧠 Analysis (OpenRouter):",
        process.env.OPENROUTER_API_KEY ? "enabled" : "disabled"
      );
    });
  })
  .catch((err) => {
    console.error("❌ Seed admin error: - server.js:97", err);
    process.exit(1);
  });

// ====== Global error handlers ======
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection: - server.js:103", err);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception: - server.js:106", err);
  process.exit(1);
});

// ====== Python BERTopic integration ======
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function autoDetectTopics(transcripts) {
  return new Promise((resolve, reject) => {
    const pyPath = path.resolve(__dirname, "../ai_models/autoDetectTopics.py");
    const args = [pyPath, JSON.stringify(transcripts)];
    const py = spawn("python", args);

    let data = "";
    let err = "";

    py.stdout.on("data", chunk => { data += chunk.toString(); });
    py.stderr.on("data", chunk => { err += chunk.toString(); });

    py.on("close", code => {
      if (code !== 0) {
        return reject(new Error(`autoDetectTopics exited ${code}: ${err}`));
      }
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(e);
      }
    });
  });
}
