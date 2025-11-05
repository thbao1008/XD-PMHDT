import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";

import { seedAdmins } from "../seed/seedAdminsFromFile.js";
import authRoutes from "./routes/authRoutes.js";
import adminUsersRoutes from "./routes/adminUsersRoutes.js";
import adminSupportRoutes from "./routes/adminSupportRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();

// CORS: chỉnh origin theo frontend
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(bodyParser.json());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin/users", adminUsersRoutes);
app.use("/api/admin/support", adminSupportRoutes);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 4002;

// Seed admin khi khởi động rồi start server
seedAdmins()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT} - server.js:35`);
    });
  })
  .catch((err) => {
    console.error("❌ Seed admin error - server.js:39", err);
    process.exit(1);
  });
