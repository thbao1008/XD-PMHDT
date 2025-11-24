// backend/services/ai-service/src/middleware/authGuard.js
import jwt from "jsonwebtoken";

/**
 * authGuard middleware - Verify JWT token and attach user to request
 * Giống code cũ trong src - sử dụng JWT verify trực tiếp, không query database
 */
export function authGuard(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Thiếu token" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Thiếu token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret_key");
    req.user = decoded;
    next();
  } catch (err) {
    console.error("authGuard error - ai-service:", err);
    return res.status(403).json({ message: "Token không hợp lệ" });
  }
}

