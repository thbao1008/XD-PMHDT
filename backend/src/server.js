import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import adminUsersRoutes from "./routes/adminUsersRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { seedAdmin } from "./config/seedAdmin.js";

seedAdmin();

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin/users", adminUsersRoutes);

// Middleware xử lý lỗi
app.use(errorHandler);

// ✅ Thay thế app.listen(...) bằng hàm này
function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`✅ Server running on port ${port} - server.js:27`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.warn(`⚠️ Port ${port} đang bận, thử port ${port + 1}... - server.js:32`);
      startServer(port + 1);
    } else {
      console.error("Server error: - server.js:35", err);
    }
  });
}

// Bắt đầu từ port trong .env hoặc 4002
startServer(process.env.PORT ? parseInt(process.env.PORT) : 4002);
