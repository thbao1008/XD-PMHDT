import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import * as sessionService from "../services/sessionService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envFile = process.env.DOCKER === "true" ? "../../.env.docker" : "../../.env.local";
const envPath = path.resolve(__dirname, envFile);
dotenv.config({ path: envPath });

export async function authGuard(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "Thiếu token. Vui lòng đăng nhập." });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token không hợp lệ. Vui lòng đăng nhập." });
    }

    // Kiểm tra session hợp lệ
    const sessionCheck = await sessionService.validateSession(token);
    
    if (!sessionCheck.valid) {
      return res.status(403).json({ 
        message: "Phiên đăng nhập đã hết hạn hoặc bạn đã đăng nhập từ thiết bị khác. Vui lòng đăng nhập lại.",
        reason: sessionCheck.reason,
        requiresLogin: true
      });
    }

    // Verify JWT token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret_key");
      req.user = decoded;
      req.session = sessionCheck.session;
      next();
    } catch (jwtErr) {
      return res.status(403).json({ 
        message: "Token không hợp lệ. Vui lòng đăng nhập lại.",
        requiresLogin: true
      });
    }
  } catch (err) {
    console.error("❌ Auth guard error:", err);
    return res.status(500).json({ message: "Lỗi xác thực. Vui lòng thử lại." });
  }
}

export function adminGuard(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: "Chỉ admin mới có quyền truy cập" });
  }
  next();
}

