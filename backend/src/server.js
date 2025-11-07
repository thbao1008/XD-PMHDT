// src/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";

import { seedAdmins } from "../seed/seedAdminsFromFile.js";
import authRoutes from "./routes/authRoutes.js";
import adminUsersRoutes from "./routes/adminUsersRoutes.js";
import adminSupportRoutes from "./routes/adminSupportRoutes.js";
import adminPackagesRoutes from "./routes/adminPackagesRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import adminPurchasesRoutes from "./routes/adminPurchasesRoutes.js"
dotenv.config();

const app = express();

// ===== Middleware =====
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(bodyParser.json());
app.use(express.json());

// ===== Routes =====
app.use("/api/auth", authRoutes);

// Quản lý user (admin)
app.use("/api/admin/users", adminUsersRoutes);

// Quản lý support
app.use("/api/admin/support", adminSupportRoutes);

// Quản lý packages (admin)
app.use("/api/admin/packages", adminPackagesRoutes);

// Public packages (cho FE hiển thị gói học)
app.use("/api/packages", adminPackagesRoutes);

// ===== Error handler =====
app.use(errorHandler);

app.use("/api/admin/purchases", adminPurchasesRoutes);

const PORT = process.env.PORT || 4002;

// ===== Start server =====
seedAdmins()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT} - server.js:49`);
    });
  })
  .catch((err) => {
    console.error("❌ Seed admin error: - server.js:53", err);
    process.exit(1);
  });
