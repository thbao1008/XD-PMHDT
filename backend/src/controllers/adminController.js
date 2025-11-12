import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import {
  findUserByIdentifier,
  createUserInDb,
  updateUserInDb,
  deleteUserInDb,
  toggleUserStatusInDb
} from "../models/userModel.js";

// Lấy danh sách user (JOIN learners + view + mentor)
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
    console.error("listUsers error - adminController.js:34", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Lấy user theo id (JOIN learners + view + mentor)
export async function getUser(req, res) {
  try {
    const { id } = req.params;
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
  WHERE u.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    return res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error("getUser error - adminController.js:67", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Tạo user mới
export async function createUser(req, res) {
  try {
    const { name, email, phone, dob, role, password, packageId } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: "Thiếu dữ liệu bắt buộc" });
    }
    if (role.toLowerCase() === "admin") {
      return res.status(403).json({ success: false, message: "Không được tạo admin từ giao diện" });
    }

    if (email) {
      const existingEmail = await findUserByIdentifier(email);
      if (existingEmail?.email === email) {
        return res.status(409).json({ success: false, message: "Email đã tồn tại" });
      }
    }
    if (phone) {
      const existingPhone = await findUserByIdentifier(phone);
      if (existingPhone?.phone === phone) {
        return res.status(409).json({ success: false, message: "Số điện thoại đã tồn tại" });
      }
    }

    const hashed = await bcrypt.hash(password, 10);

    const newUser = await createUserInDb({
      name,
      email,
      phone: phone || null,
      dob: dob || null,
      role: role.toLowerCase(),
      password: hashed,
      status: "active"
    });

    let learnerId = null;

    if (role.toLowerCase() === "learner") {
      const lrRes = await pool.query(
        `INSERT INTO learners (user_id, start_date) VALUES ($1, NOW()) RETURNING id`,
        [newUser.id]
      );
      learnerId = lrRes.rows[0].id;

      if (packageId) {
        await pool.query(
          `INSERT INTO purchases (learner_id, package_id, status, created_at, extra_days)
           VALUES ($1,$2,'active',NOW(),0)`,
          [learnerId, packageId]
        );
      }
    }

    const { password: _, ...safe } = newUser;
    return res.status(201).json({ success: true, user: safe, learnerId });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ success: false, message: "Email hoặc SĐT đã tồn tại" });
    }
    console.error("createUser error - adminController.js:133", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Cập nhật user (chỉ đổi mật khẩu learner)
export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: "Chỉ được phép thay đổi mật khẩu" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const updated = await updateUserInDb(id, { password: hashed });
    if (!updated) return res.status(404).json({ success: false, message: "Not found" });

    const { password: _, ...safe } = updated;
    return res.json({ success: true, user: safe });
  } catch (err) {
    console.error("updateUser error - adminController.js:156", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Xóa user
export async function deleteUser(req, res) {
  try {
    const deleted = await deleteUserInDb(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true });
  } catch (err) {
    console.error("deleteUser error - adminController.js:168", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Toggle trạng thái (active/banned)
export async function toggleUserStatus(req, res) {
  try {
    const { id } = req.params;
``
    // Đổi trạng thái user
    const updated = await toggleUserStatusInDb(id);
    if (!updated) return res.status(404).json({ success: false, message: "Not found" });

    // Nếu là learner thì cập nhật purchases
    if (updated.role === "learner") {
      if (updated.status === "banned") {
        // Khi Ban → chuyển gói học sang paused
        await pool.query(
          `UPDATE purchases 
           SET status = 'paused'
           WHERE learner_id = (
             SELECT id FROM learners WHERE user_id = $1
           ) AND status = 'active'`,
          [updated.id]
        );
      } else if (updated.status === "active") {
        // Khi Unban → khôi phục gói học từ paused về active
        await pool.query(
          `UPDATE purchases 
           SET status = 'active'
           WHERE learner_id = (
             SELECT id FROM learners WHERE user_id = $1
           ) AND status = 'paused'`,
          [updated.id]
        );
      }
    }

    const { password, ...safe } = updated;
    return res.json({ success: true, user: safe });
  } catch (err) {
    console.error("toggleUserStatus error - adminController.js:210", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
