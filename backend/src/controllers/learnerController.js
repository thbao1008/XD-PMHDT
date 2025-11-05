import pool from "../config/db.js";
import bcrypt from "bcryptjs";

export const learnerController = {
  // Lấy danh sách learners
  getAll: async (req, res) => {
    try {
      const result = await pool.query("SELECT id, name, email, phone, dob, status FROM users WHERE role='learner'");
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Lấy learner theo id
  getById: async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query("SELECT id, name, email, phone, dob, status FROM users WHERE id=$1 AND role='learner'", [id]);
      if (result.rows.length === 0) return res.status(404).json({ message: "Learner not found" });
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Tạo learner mới
  create: async (req, res) => {
    const { name, email, phone, dob, password } = req.body;
    try {
      const hashed = await bcrypt.hash(password, 10);
      const result = await pool.query(
        "INSERT INTO users (name, email, phone, dob, password, role, status) VALUES ($1,$2,$3,$4,$5,'learner','active') RETURNING id, name, email",
        [name, email, phone, dob, hashed]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Cập nhật learner
  update: async (req, res) => {
    const { id } = req.params;
    const { name, phone, dob, password } = req.body;
    try {
      const hashed = password ? await bcrypt.hash(password, 10) : undefined;
      await pool.query(
        `UPDATE users SET name=$1, phone=$2, dob=$3${hashed ? ", password=$4" : ""}, updated_at=CURRENT_TIMESTAMP WHERE id=$5 AND role='learner'`,
        hashed ? [name, phone, dob, hashed, id] : [name, phone, dob, id]
      );
      res.json({ message: "Learner updated" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Xóa learner
  delete: async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM users WHERE id=$1 AND role='learner'", [id]);
      res.json({ message: "Learner deleted" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
};

