import express from "express";
import pool from "../config/db.js";

const router = express.Router();

// Tạo mới support request (người dùng đăng ký từ Home)
router.post("/", async (req, res) => {
  const { name, email, phone, note } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO support_requests (name, email, phone, note) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, email, phone, note]
    );
    res.json({ success: true, request: result.rows[0] });
  } catch (err) {
    console.error("❌ Lỗi tạo support request: - adminSupportRoutes.js:17", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin xem danh sách support requests
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM support_requests ORDER BY created_at DESC"
    );
    res.json({ requests: result.rows });
  } catch (err) {
    console.error("❌ Lỗi lấy support requests: - adminSupportRoutes.js:30", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin cập nhật trạng thái (pending → resolved)
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const result = await pool.query(
      "UPDATE support_requests SET status=$1 WHERE id=$2 RETURNING *",
      [status, id]
    );
    res.json({ success: true, request: result.rows[0] });
  } catch (err) {
    console.error("❌ Lỗi update support request: - adminSupportRoutes.js:46", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
