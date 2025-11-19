import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";


// Controllers
import * as learnerCtrl from "./controllers/learnerController.js";
import { getLearnersByMentor } from "./controllers/mentorController.js";

// Multer for file uploads
import multer from "multer";

// Routes
import authRoutes from "./routes/authRoutes.js";
import adminUsersRoutes from "./routes/adminUsersRoutes.js";
import adminSupportRoutes from "./routes/adminSupportRoutes.js";
import adminPackagesRoutes from "./routes/adminPackagesRoutes.js";
import adminPurchasesRoutes from "./routes/adminPurchasesRoutes.js";
import adminReportRoutes from "./routes/adminReportsRoutes.js";
import learnerRoutes from "./routes/learnerRoutes.js";
import mentorRoutes from "./routes/mentorRoutes.js";

// Middleware
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";

// Seed + Queue
import { seedAdmins } from "../seed/seedAdminsFromFile.js";
import "./queueHandlers.js";

const app = express();
const PORT = process.env.PORT || 4002;

// ====== Log trạng thái key ======
console.log(
  "🔑 OPENROUTER_API_KEY: - server.js",
  process.env.OPENROUTER_API_KEY
    ? process.env.OPENROUTER_API_KEY.slice(0, 8) + "..."
    : "❌ missing"
);

// ====== Middleware ======
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(requestLogger);

// ====== Multer config for file uploads ======
const upload = multer({ dest: "uploads/" });

// ====== Health check ======
app.get("/health/ai", (_req, res) => {
  res.json({
    openrouter: !!process.env.OPENROUTER_API_KEY,
    openrouter_model: process.env.OPENROUTER_MODEL || null,
  });
});

// ====== Routes ======
app.use("/api/auth", authRoutes);
app.use("/api/admin/users", adminUsersRoutes);
app.use("/api/admin/support", adminSupportRoutes);
app.use("/api/admin/packages", adminPackagesRoutes);
app.use("/api/admin/purchases", adminPurchasesRoutes);
app.use("/api/admin/reports", adminReportRoutes);

app.use("/api/learners", learnerRoutes);
app.use("/api/mentors", mentorRoutes);

// Challenge routes
app.get("/api/challenges", learnerCtrl.listAllChallenges);
app.get("/api/challenges/:id", learnerCtrl.getChallengeById);

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

// ====== Static uploads ======
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

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
