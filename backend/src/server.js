import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { seedAdmins } from "../seed/seedAdminsFromFile.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import adminUsersRoutes from "./routes/adminUsersRoutes.js";
import adminSupportRoutes from "./routes/adminSupportRoutes.js";
import adminPackagesRoutes from "./routes/adminPackagesRoutes.js";
import adminPurchasesRoutes from "./routes/adminPurchasesRoutes.js";
import learnerRoutes from "./routes/learnerRoutes.js";
import mentorRoutes from "./routes/mentorRoutes.js";
import adminReportRoutes from "./routes/adminReportsRoutes.js";
// Middleware
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4002;

// Middleware
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(requestLogger);

// Routes
app.use("/api/auth", authRoutes);

// Admin routes
app.use("/api/admin/users", adminUsersRoutes);
app.use("/api/admin/support", adminSupportRoutes);
app.use("/api/admin/packages", adminPackagesRoutes);
app.use("/api/admin/purchases", adminPurchasesRoutes);
app.use("/api/admin/reports", adminReportRoutes);
// mount đúng prefix cho admin
app.use("/api/admin", adminReportRoutes);
// Learner routes (dùng learner_id)
app.use("/api/learners", learnerRoutes);

// Mentor routes (dùng mentor_id)
app.use("/api/mentors", mentorRoutes);

// Public packages (nếu cần)
app.use("/api/packages", adminPackagesRoutes);
app.use("/api/admin/learners", learnerRoutes);
// Error handler cuối cùng
app.use(errorHandler);
// report cho cả mentor và learner
app.use("/api", adminReportRoutes);
// Start server sau khi seed admin
seedAdmins()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT} - server.js:58`);
    });
  })
  .catch((err) => {
    console.error("❌ Seed admin error: - server.js:62", err);
    process.exit(1);
  });
