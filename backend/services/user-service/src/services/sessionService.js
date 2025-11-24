/**
 * Session Service
 * Quản lý user sessions để đảm bảo 1 tài khoản chỉ hoạt động trên 1 thiết bị
 */

import pool from "../config/db.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "secret_key";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "1d";

/**
 * Tạo session mới cho user và invalidate tất cả sessions cũ
 */
export async function createSession(userId, deviceInfo = null, ipAddress = null, userAgent = null) {
  try {
    // Invalidate tất cả sessions cũ của user này
    await pool.query(
      `UPDATE user_sessions 
       SET is_active = FALSE 
       WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    );

    // Tạo JWT token
    const user = await pool.query("SELECT id, email, phone, role, name FROM users WHERE id = $1", [userId]);
    if (user.rows.length === 0) {
      throw new Error("User not found");
    }

    const userData = user.rows[0];
    const token = jwt.sign(
      { 
        id: userData.id, 
        email: userData.email, 
        phone: userData.phone, 
        role: userData.role, 
        name: userData.name,
        sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    // Tính expires_at từ JWT_EXPIRES
    const expiresInMs = parseJWTExpires(JWT_EXPIRES);
    const expiresAt = new Date(Date.now() + expiresInMs);

    // Tạo session mới
    const result = await pool.query(
      `INSERT INTO user_sessions 
       (user_id, token, device_info, ip_address, user_agent, expires_at, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING *`,
      [userId, token, deviceInfo, ipAddress, userAgent, expiresAt]
    );

    return {
      session: result.rows[0],
      token: token
    };
  } catch (err) {
    console.error("❌ Error creating session:", err);
    throw err;
  }
}

/**
 * Kiểm tra session có hợp lệ không
 */
export async function validateSession(token) {
  try {
    // Kiểm tra JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      return { valid: false, reason: "Invalid token" };
    }

    // Kiểm tra session trong database
    const result = await pool.query(
      `SELECT * FROM user_sessions 
       WHERE token = $1 AND is_active = TRUE AND expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return { valid: false, reason: "Session not found or expired" };
    }

    const session = result.rows[0];
    
    // Cập nhật last_activity
    await pool.query(
      `UPDATE user_sessions 
       SET last_activity = NOW() 
       WHERE id = $1`,
      [session.id]
    );

    return { 
      valid: true, 
      session: session,
      userId: decoded.id 
    };
  } catch (err) {
    console.error("❌ Error validating session:", err);
    return { valid: false, reason: "Server error" };
  }
}

/**
 * Xóa session (logout)
 */
export async function deleteSession(token) {
  try {
    await pool.query(
      `UPDATE user_sessions 
       SET is_active = FALSE 
       WHERE token = $1`,
      [token]
    );
    return true;
  } catch (err) {
    console.error("❌ Error deleting session:", err);
    return false;
  }
}

/**
 * Xóa tất cả sessions của user
 */
export async function deleteAllUserSessions(userId) {
  try {
    await pool.query(
      `UPDATE user_sessions 
       SET is_active = FALSE 
       WHERE user_id = $1`,
      [userId]
    );
    return true;
  } catch (err) {
    console.error("❌ Error deleting all user sessions:", err);
    return false;
  }
}

/**
 * Parse JWT_EXPIRES string thành milliseconds
 */
function parseJWTExpires(expires) {
  const match = expires.match(/^(\d+)([smhd])$/);
  if (!match) return 24 * 60 * 60 * 1000; // Default 1 day

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
}

/**
 * Cleanup expired sessions (có thể gọi định kỳ)
 */
export async function cleanupExpiredSessions() {
  try {
    const result = await pool.query(
      `UPDATE user_sessions 
       SET is_active = FALSE 
       WHERE expires_at < NOW() AND is_active = TRUE`
    );
    return result.rowCount;
  } catch (err) {
    console.error("❌ Error cleaning up expired sessions:", err);
    return 0;
  }
}

