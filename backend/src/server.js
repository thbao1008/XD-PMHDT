// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { seedAdmins } from "../seed/seedAdminsFromFile.js";
import authRoutes from "./routes/authRoutes.js";
import adminUsersRoutes from "./routes/adminUsersRoutes.js";
import adminSupportRoutes from "./routes/adminSupportRoutes.js";
import adminPackagesRoutes from "./routes/adminPackagesRoutes.js";
import adminPurchasesRoutes from "./routes/adminPurchasesRoutes.js";
import learnerRoutes from "./routes/learnerRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js"; 

dotenv.config();

const app = express();

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(requestLogger);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin/users", adminUsersRoutes);
app.use("/api/admin/support", adminSupportRoutes);
app.use("/api/admin/packages", adminPackagesRoutes);
app.use("/api/packages", adminPackagesRoutes);
app.use("/api/admin/purchases", adminPurchasesRoutes);
app.use("/api/admin/learners", learnerRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 4002;

seedAdmins()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT} - server.js:40`);
    });
  })
  .catch((err) => {
    console.error("❌ Seed admin error: - server.js:44", err);
    process.exit(1);
  });
