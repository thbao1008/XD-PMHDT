import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env from backend/ai_models/.env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..", "..", "..");
// Try backend/ai_models/.env first, then fallback to backend/.env
import fs from "fs";
const envPath1 = path.resolve(backendRoot, "ai_models", ".env");
const envPath2 = path.resolve(backendRoot, ".env");
if (fs.existsSync(envPath1)) {
  dotenv.config({ path: envPath1 });
  console.log(`✅ Loaded .env from: ${envPath1}`);
} else if (fs.existsSync(envPath2)) {
  dotenv.config({ path: envPath2 });
  console.log(`✅ Loaded .env from: ${envPath2}`);
} else {
  console.warn(`⚠️ .env file not found at ${envPath1} or ${envPath2}`);
  dotenv.config(); // Try default locations
}

import express from "express";
import cors from "cors";
// Import db first to ensure connection is established
import "./config/db.js";
import aiRoutes from "./routes/aiRoutes.js";

const app = express();
const PORT = process.env.AI_SERVICE_PORT || 4010;

// Middleware
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    service: "ai-service",
    openrouter: !!process.env.OPENROUTER_API_KEY,
    openrouter_model: process.env.OPENROUTER_MODEL || null
  });
});

// Routes
app.use("/ai", aiRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error("AI Service error:", err);
  res.status(err.status || 500).json({ 
    message: err.message || "Server error" 
  });
});

app.listen(PORT, () => {
  console.log(`🤖 AI Service running on port ${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log(`   OpenRouter: ${process.env.OPENROUTER_API_KEY ? "configured" : "not configured"}`);
}).on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use!`);
  } else {
    console.error(`❌ Error starting AI Service:`, err);
  }
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});

