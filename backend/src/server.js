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

// Controllers
import { getLearnersByMentor } from "./controllers/mentorController.js";

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

// Learner routes
app.use("/api/learners", learnerRoutes);

// Mentor routes
app.use("/api/mentors", mentorRoutes);

// Public packages
app.use("/api/packages", adminPackagesRoutes);

// Endpoint: learners của mentor
app.get("/api/admin/mentors/:id/learners", getLearnersByMentor);

// Error handler cuối cùng
app.use(errorHandler);
// Middleware log request
app.use((req, res, next) => {
  console.log("Incoming: - server.js:60", req.method, req.url);
  next();
});

// Start server sau khi seed admin
seedAdmins()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT} - server.js:68`);
    });
  })
  .catch((err) => {
    console.error("❌ Seed admin error: - server.js:72", err);
    process.exit(1);
  });
