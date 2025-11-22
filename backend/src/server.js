import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";


// Controllers
import * as learnerCtrl from "./controllers/learnerController.js";
import { getLearnersByMentor } from "./controllers/mentorController.js";
import { getPackages } from "./controllers/packageController.js";

// Multer for file uploads
import multer from "multer";

// Routes
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import learnerRoutes from "./routes/learnerRoutes.js";
import mentorRoutes from "./routes/mentorRoutes.js";
import communityRoutes from "./routes/communityRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

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

// ====== Multer config for file uploads ======
import fs from "fs";

// Ensure uploads directory exists
const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Preserve original extension
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage });

// ====== Health check ======
app.get("/health/ai", (_req, res) => {
  res.json({
    openrouter: !!process.env.OPENROUTER_API_KEY,
    openrouter_model: process.env.OPENROUTER_MODEL || null,
  });
});

// ====== Routes ======
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

app.use("/api/learners", learnerRoutes);
app.use("/api/mentors", mentorRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/notifications", notificationRoutes);

// Challenge routes
app.get("/api/challenges", learnerCtrl.listAllChallenges);
app.get("/api/challenges/:id", learnerCtrl.getChallengeById);

// Public packages route moved to adminRoutes.js (/api/admin/packages/public)

// Mentor learners
app.get("/api/admin/mentors/:id/learners", getLearnersByMentor);

// ====== File upload endpoint ======
app.post("/api/uploads", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  res.json({ url: fileUrl, filename: req.file.filename });
});

// ====== Static uploads with proper Content-Type ======
app.use("/uploads", (req, res, next) => {
  const filePath = path.resolve(process.cwd(), "uploads", req.path);
  const ext = path.extname(req.path).toLowerCase();
  
  // Set Content-Type based on extension
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.wmv': 'video/x-ms-wmv',
    '.flv': 'video/x-flv',
    '.mkv': 'video/x-matroska',
    '.pdf': 'application/pdf',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4'
  };
  
  if (mimeTypes[ext]) {
    res.setHeader('Content-Type', mimeTypes[ext]);
  }
  
  // Use express.static to serve the file
  express.static(path.resolve(process.cwd(), "uploads"))(req, res, next);
});

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
