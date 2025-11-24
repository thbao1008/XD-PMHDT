import pool from "../config/db.js";
import {
  findUserById,
  findUserByIdentifier,
  createUserInDb,
  updateUserInDb,
  deleteUserInDb,
  toggleUserStatusInDb
} from "../models/userModel.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Tìm project root (đi lên từ user-service/src/controllers đến root)
 */
function getProjectRoot() {
  // __dirname = backend/services/user-service/src/controllers
  // Đi lên 3 cấp: controllers -> src -> user-service -> services -> backend
  return path.resolve(__dirname, "..", "..", "..");
}

function safeUserForClient(user) {
  if (!user) return null;
  const u = { ...user };
  delete u.password;
  return u;
}

// Ensure uploads directory exists at backend/uploads
const backendDir = getProjectRoot();
const uploadsDir = path.resolve(backendDir, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer config for avatar upload
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, "avatar-" + uniqueSuffix + ext);
  }
});
const uploadAvatarMiddleware = multer({ storage: avatarStorage });

export async function listUsers(req, res) {
  try {
    const result = await pool.query(`
      SELECT 
        u.id, u.name, u.email, u.phone, u.dob, u.role, u.status, u.created_at,
        l.id AS learner_id,
        lp.package_name,
        lp.status AS package_status,
        lp.expiry_date,
        lp.days_left,
        mu.id AS mentor_id,
        mu.name AS mentor_name
      FROM users u
      LEFT JOIN learners l ON l.user_id = u.id
      LEFT JOIN learner_package_view lp ON lp.learner_id = l.id
      LEFT JOIN mentors m ON l.mentor_id = m.id
      LEFT JOIN users mu ON m.user_id = mu.id
      ORDER BY u.id DESC
    `);

    return res.json({ success: true, users: result.rows });
  } catch (err) {
    console.error("listUsers error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Get user's own profile (không cần admin)
export async function getMyProfile(req, res) {
  try {
    const userId = req.user?.id || req.user?.user_id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const result = await pool.query(`
      SELECT 
        u.id, u.name, u.email, u.phone, u.dob, u.role, u.status, u.created_at, u.avatar_url,
        l.id AS learner_id,
        lp.package_name,
        lp.status AS package_status,
        lp.expiry_date,
        lp.days_left,
        mu.id AS mentor_id,
        mu.name AS mentor_name,
        m.id AS mentor_mentor_id,
        m.rating AS mentor_rating,
        COALESCE(
          (SELECT AVG(average_score) 
           FROM practice_history 
           WHERE learner_id = l.id 
             AND practice_type = 'speaking_practice' 
             AND average_score IS NOT NULL),
          0
        ) AS learner_average_score
      FROM users u
      LEFT JOIN learners l ON l.user_id = u.id
      LEFT JOIN learner_package_view lp ON lp.learner_id = l.id
      LEFT JOIN mentors m ON l.mentor_id = m.id
      LEFT JOIN users mu ON m.user_id = mu.id
      WHERE u.id = $1
    `, [userId]);
    
    if (result.rows.length > 0 && result.rows[0].role?.toUpperCase() === "MENTOR") {
      const mentorRes = await pool.query(`
        SELECT m.rating
        FROM mentors m
        WHERE m.user_id = $1
      `, [userId]);
      if (mentorRes.rows.length > 0) {
        result.rows[0].mentor_rating = mentorRes.rows[0].rating;
      }
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    // Format avatar_url to absolute URL (giống code cũ trong src)
    const protocol = req.get("x-forwarded-proto") || req.protocol || "http";
    const host = req.get("x-forwarded-host") || req.get("host") || "localhost:4000";
    const baseUrl = `${protocol}://${host}`;
    
    const user = result.rows[0];
    if (user.avatar_url?.startsWith("/")) {
      user.avatar_url = `${baseUrl}${user.avatar_url}`;
    }

    return res.json({ success: true, user });
  } catch (err) {
    console.error("getMyProfile error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getUser(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        u.id, u.name, u.email, u.phone, u.dob, u.role, u.status, u.created_at, u.avatar_url,
        l.id AS learner_id,
        lp.package_name,
        lp.status AS package_status,
        lp.expiry_date,
        lp.days_left,
        mu.id AS mentor_id,
        mu.name AS mentor_name,
        m.id AS mentor_mentor_id,
        m.rating AS mentor_rating,
        COALESCE(
          (SELECT AVG(average_score) 
           FROM practice_history 
           WHERE learner_id = l.id 
             AND practice_type = 'speaking_practice' 
             AND average_score IS NOT NULL),
          0
        ) AS learner_average_score
      FROM users u
      LEFT JOIN learners l ON l.user_id = u.id
      LEFT JOIN learner_package_view lp ON lp.learner_id = l.id
      LEFT JOIN mentors m ON l.mentor_id = m.id
      LEFT JOIN users mu ON m.user_id = mu.id
      WHERE u.id = $1
    `, [id]);
    
    if (result.rows.length > 0 && result.rows[0].role?.toUpperCase() === "MENTOR") {
      const mentorRes = await pool.query(`
        SELECT m.rating
        FROM mentors m
        WHERE m.user_id = $1
      `, [id]);
      if (mentorRes.rows.length > 0) {
        result.rows[0].mentor_rating = mentorRes.rows[0].rating;
      }
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    return res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error("getUser error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function createUser(req, res) {
  try {
    const { name, email, phone, dob, role, password, packageId } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc" });
    }

    const existingEmail = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existingEmail.rows.length > 0) {
      return res.status(400).json({ success: false, message: "Email đã tồn tại" });
    }

    const bcrypt = (await import("bcryptjs")).default;
    const hashed = await bcrypt.hash(password, 10);

    const userResult = await pool.query(
      "INSERT INTO users (name, email, password, phone, dob, role, status) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [name, email, hashed, phone || null, dob || null, role, 'active']
    );
    const user = userResult.rows[0];

    if (role.toUpperCase() === "LEARNER" && packageId) {
      await pool.query(
        "INSERT INTO purchases (learner_id, package_id, status, created_at) VALUES ($1,$2,$3,NOW())",
        [user.id, packageId, "completed"]
      );
    }

    res.status(201).json({ success: true, user: safeUserForClient(user) });
  } catch (err) {
    console.error("createUser error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await updateUserInDb(id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, user: safeUserForClient(updated) });
  } catch (err) {
    console.error("updateUser error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    const deleted = await deleteUserInDb(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    console.error("deleteUser error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function toggleUserStatus(req, res) {
  try {
    const { id } = req.params;
    const updated = await toggleUserStatusInDb(id);
    if (!updated) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, user: safeUserForClient(updated) });
  } catch (err) {
    console.error("toggleUserStatus error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// Upload avatar cho chính user (không cần admin)
export async function uploadMyAvatar(req, res) {
  try {
    const userId = req.user?.id || req.user?.user_id || req.user?._id;
    console.log(`[uploadMyAvatar] Request received: userId=${userId}, hasFile=${!!req.file}, filename=${req.file?.filename}`);
    
    if (!userId) {
      console.error("[uploadMyAvatar] No userId found in token");
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (!req.file) {
      console.error("[uploadMyAvatar] No file uploaded");
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    // Verify file was saved
    const backendDir = getProjectRoot();
    const uploadsDir = path.resolve(backendDir, "uploads");
    const filePath = path.join(uploadsDir, req.file.filename);
    
    if (!fs.existsSync(filePath)) {
      console.error(`[uploadMyAvatar] File was not saved! Path: ${filePath}`);
      return res.status(500).json({ error: "File upload failed - file not saved", path: filePath });
    }
    
    console.log(`[uploadMyAvatar] File uploaded successfully: ${req.file.filename}, path: ${filePath}`);
    
    // Format avatar URL to absolute URL (giống code cũ trong src)
    const protocol = req.get("x-forwarded-proto") || req.protocol || "http";
    const host = req.get("x-forwarded-host") || req.get("host") || "localhost:4000";
    const baseUrl = `${protocol}://${host}`;
    const avatarUrl = `${baseUrl}/uploads/${req.file.filename}`;
    
    const updated = await updateUserInDb(userId, { avatar_url: avatarUrl });
    if (!updated) {
      console.error(`[uploadMyAvatar] User not found: userId=${userId}`);
      return res.status(404).json({ message: "User not found" });
    }
    
    // Format avatar_url in response
    const user = safeUserForClient(updated);
    if (user.avatar_url?.startsWith("/")) {
      user.avatar_url = `${baseUrl}${user.avatar_url}`;
    }
    
    console.log(`[uploadMyAvatar] Avatar updated successfully for user ${userId}`);
    return res.json({ success: true, user });
  } catch (err) {
    console.error("uploadMyAvatar error:", err);
    return res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? err.message : undefined });
  }
}

// Upload avatar cho user khác (yêu cầu admin)
export async function uploadAvatar(req, res) {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    // Format avatar URL to absolute URL (giống code cũ trong src)
    const protocol = req.get("x-forwarded-proto") || req.protocol || "http";
    const host = req.get("x-forwarded-host") || req.get("host") || "localhost:4000";
    const baseUrl = `${protocol}://${host}`;
    const avatarUrl = `${baseUrl}/uploads/${req.file.filename}`;
    
    const updated = await updateUserInDb(id, { avatar_url: avatarUrl });
    if (!updated) return res.status(404).json({ message: "User not found" });
    return res.json({ success: true, user: safeUserForClient(updated) });
  } catch (err) {
    console.error("uploadAvatar error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

export { uploadAvatarMiddleware };

