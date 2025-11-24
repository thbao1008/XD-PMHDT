import "dotenv/config";
import express from "express";
import cors from "cors";
// Import db first to ensure connection is established
import "./config/db.js";
import purchaseRoutes from "./routes/purchaseRoutes.js";

const app = express();
const PORT = process.env.PURCHASE_SERVICE_PORT || 4004;

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "purchase-service" });
});

app.use("/", purchaseRoutes);

app.listen(PORT, () => {
  console.log(`💳 Purchase Service running on port ${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
}).on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use!`);
  } else {
    console.error(`❌ Error starting Purchase Service:`, err);
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

