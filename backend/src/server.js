import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { seedAdmins } from "../seed/seedAdminsFromFile.js";
import authRoutes from "./routes/authRoutes.js";
import adminUsersRoutes from "./routes/adminUsersRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

// Load biến môi trường
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin/users", adminUsersRoutes);

// Middleware xử lý lỗi
app.use(errorHandler);

// Gọi seed admin khi server khởi động
seedAdmins().catch(err => {
  console.error("❌ Seed admin error - server.js:27", err);
});

// Hàm khởi động server với xử lý port trùng
function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`✅ Server running on port ${port} - server.js:33`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.warn(`⚠️ Port ${port} đang bận, thử port ${port + 1}... - server.js:38`);
      startServer(port + 1);
    } else {
      console.error("❌ Server error - server.js:41", err);
    }
  });
}

// Bắt đầu từ PORT trong .env hoặc 4002
startServer(process.env.PORT ? parseInt(process.env.PORT) : 4002);
