import "dotenv/config";
import express from "express";
import cors from "cors";
// Import db first to ensure connection is established
import "./config/db.js";
import { authGuard } from "./middleware/authGuard.js";
import adminRoutes from "./routes/adminRoutes.js";
import { seedAdmins } from "./seed/seedAdminsFromFile.js";

const app = express();
const PORT = process.env.ADMIN_SERVICE_PORT || 4008;

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "admin-service" });
});

// Routes
app.use("/admin", adminRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error("Admin Service error:", err);
  res.status(err.status || 500).json({ 
    message: err.message || "Server error" 
  });
});

// Seed admins on startup
seedAdmins()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`👑 Admin Service running on port ${PORT}`);
      console.log(`✅ Health check: http://localhost:${PORT}/health`);
    }).on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use!`);
      } else {
        console.error(`❌ Error starting Admin Service:`, err);
      }
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error("❌ Seed admin error:", err);
    process.exit(1);
  });

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});

