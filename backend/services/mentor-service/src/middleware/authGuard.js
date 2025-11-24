import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envFile = process.env.DOCKER === "true" ? "../../.env.docker" : "../../.env.local";
const envPath = path.resolve(__dirname, envFile);
dotenv.config({ path: envPath });

export function authGuard(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "Thiếu token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret_key");
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Token không hợp lệ" });
  }
}

export function mentorGuard(req, res, next) {
  if (req.user?.role?.toLowerCase() !== 'mentor') {
    return res.status(403).json({ message: "Chỉ mentor mới có quyền truy cập" });
  }
  next();
}

