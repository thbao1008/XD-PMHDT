import "dotenv/config";
import express from "express";
import cors from "cors";
// Import db first to ensure connection is established
import "./config/db.js";
import packageRoutes from "./routes/packageRoutes.js";

const app = express();
const PORT = process.env.PACKAGE_SERVICE_PORT || 4003;

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "package-service" });
});

app.use("/", packageRoutes);

app.listen(PORT, () => {
  console.log(`📦 Package Service running on port ${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
}).on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use!`);
  } else {
    console.error(`❌ Error starting Package Service:`, err);
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

