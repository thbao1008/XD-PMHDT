import "dotenv/config";
import express from "express";
import cors from "cors";
// Import db first to ensure connection is established
import pool from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";

const app = express();
const PORT = process.env.USER_SERVICE_PORT || 4005;

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

app.get("/health", async (req, res) => {
  try {
    // Quick DB check with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000); // 2 second timeout
    
    try {
      await pool.query("SELECT 1");
      clearTimeout(timeout);
      res.json({ status: "ok", service: "user-service", db: "connected" });
    } catch (dbErr) {
      clearTimeout(timeout);
      res.status(503).json({ 
        status: "error", 
        service: "user-service", 
        db: "disconnected",
        error: dbErr.message 
      });
    }
  } catch (err) {
    res.status(503).json({ 
      status: "error", 
      service: "user-service", 
      db: "timeout",
      error: err.message 
    });
  }
});

// Handle request aborted errors gracefully (must be before routes)
app.use((err, req, res, next) => {
  // Ignore "request aborted" errors - client disconnected
  if (err.message && (err.message.includes("request aborted") || err.message.includes("aborted"))) {
    return; // Silently ignore
  }
  // Ignore connection errors - client disconnected
  if (err.code === "ECONNRESET" || err.code === "EPIPE" || err.code === "ECONNABORTED") {
    return; // Silently ignore
  }
  next(err);
});

app.use("/auth", authRoutes);
app.use("/users", userRoutes); // Route cho user upload avatar cho chính họ
app.use("/admin", userRoutes); // Route cho admin quản lý users

// Error handler - must be after routes
app.use((err, req, res, next) => {
  // Ignore "request aborted" errors - client disconnected
  if (err.message && (err.message.includes("request aborted") || err.message.includes("aborted"))) {
    return; // Silently ignore
  }
  // Ignore connection errors - client disconnected
  if (err.code === "ECONNRESET" || err.code === "EPIPE" || err.code === "ECONNABORTED") {
    return; // Silently ignore
  }
  // Handle other errors
  console.error("User Service error:", err);
  if (!res.headersSent) {
    res.status(err.status || 500).json({ 
      message: err.message || "Server error" 
    });
  }
});

app.listen(PORT, () => {
  console.log(`👤 User Service running on port ${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
}).on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use!`);
    console.error(`   Please stop the process using port ${PORT} or change the port.`);
  } else {
    console.error(`❌ Error starting User Service:`, err);
  }
  process.exit(1);
});

// Handle uncaught errors
process.on("uncaughtException", (err) => {
  // Ignore "request aborted" errors
  if (err.message && (err.message.includes("request aborted") || err.message.includes("aborted"))) {
    return;
  }
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  // Ignore "request aborted" errors
  if (reason && reason.message && (reason.message.includes("request aborted") || reason.message.includes("aborted"))) {
    return;
  }
  // Ignore connection errors
  if (reason && (reason.code === "ECONNRESET" || reason.code === "EPIPE" || reason.code === "ECONNABORTED")) {
    return;
  }
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});

