
import express from "express";
import pool from "../config/db.js";

const router = express.Router();

// Public: lấy danh sách gói học cho Home
router.get("/public", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, price, original_price, duration_days FROM packages ORDER BY duration_days ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Lỗi GET public packages: - adminPackagesRoutes.js:15", err);
    res.status(500).json({ error: "DB error" });
  }
});

// Admin: CRUD
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM packages ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "DB error" });
  }
});

router.post("/", async (req, res) => {
  const { name, price, originalPrice, durationDays } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO packages (name, price, original_price, duration_days) VALUES ($1,$2,$3,$4) RETURNING *",
      [name, price, originalPrice, durationDays]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "DB error" });
  }
});

// Tạo gói học mới
router.post("/", async (req, res) => {
  const { name, price, originalPrice, durationDays } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO packages (name, price, original_price, duration_days) VALUES ($1,$2,$3,$4) RETURNING *",
      [name, price, originalPrice, durationDays]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Lỗi POST package: - adminPackagesRoutes.js:53", err);
    res.status(500).json({ error: "DB error" });
  }
});

// Cập nhật gói học
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, price, originalPrice, durationDays } = req.body;
  try {
    const result = await pool.query(
      "UPDATE packages SET name=$1, price=$2, original_price=$3, duration_days=$4 WHERE id=$5 RETURNING *",
      [name, price, originalPrice, durationDays, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy gói học" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Lỗi PUT package: - adminPackagesRoutes.js:72", err);
    res.status(500).json({ error: "DB error" });
  }
});

// Xóa gói học
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM packages WHERE id=$1 RETURNING *", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy gói học" });
    }
    res.json({ message: "Đã xóa gói học" });
  } catch (err) {
    console.error("❌ Lỗi DELETE package: - adminPackagesRoutes.js:87", err);
    res.status(500).json({ error: "DB error" });
  }
});

export default router;
