// backend/src/controllers/learnerController.js
import pool from "../config/db.js";
import { getPurchasesByLearner } from "../models/purchaseModel.js";

// Lấy danh sách learners kèm đơn hàng mới nhất
export async function getAll(req, res) {
  try {
    const result = await pool.query(`
      SELECT l.id AS learner_id,
             u.id AS user_id,
             u.name, u.email, u.phone, u.dob,
             (SELECT p.id 
                FROM purchases p 
               WHERE p.learner_id = l.id 
            ORDER BY p.created_at DESC 
               LIMIT 1) AS latest_purchase_id
      FROM learners l
      JOIN users u ON l.user_id = u.id
      ORDER BY l.id DESC
    `);
    res.json({ learners: result.rows });
  } catch (err) {
    console.error("Error learnerController.getAll: - learnerController.js:23", err);
    res.status(500).json({ message: "Server error" });
  }
}

// Lấy learner theo id
export async function getById(req, res) {
  const { id } = req.params; // learnerId
  try {
    const result = await pool.query(`
      SELECT l.id AS learner_id, u.*
      FROM learners l
      JOIN users u ON l.user_id = u.id
      WHERE l.id = $1
    `, [id]);
    if (!result.rows[0]) return res.status(404).json({ message: "Learner not found" });
    res.json({ learner: result.rows[0] });
  } catch (err) {
    console.error("Error learnerController.getById: - learnerController.js:41", err);
    res.status(500).json({ message: "Server error" });
  }
}

// Lấy toàn bộ lịch sử mua của learner
export async function getPurchases(req, res) {
  const { id } = req.params; // learnerId
  try {
    const purchases = await getPurchasesByLearner(id);
    return res.json({ purchases });
  } catch (err) {
    console.error("Error learnerController.getPurchases: - learnerController.js:53", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// Tạo learner mới
export async function create(req, res) {
  const { name, email, phone, dob, packageId } = req.body;
  try {
    const userRes = await pool.query(`
      INSERT INTO users (name, email, phone, dob, role, status, created_at)
      VALUES ($1,$2,$3,$4,'learner','active',NOW())
      RETURNING id
    `, [name, email, phone, dob]);

    const userId = userRes.rows[0].id;

    const learnerRes = await pool.query(`
      INSERT INTO learners (user_id, start_date)
      VALUES ($1, NOW())
      RETURNING id
    `, [userId]);

    const learnerId = learnerRes.rows[0].id;

    if (packageId) {
      await pool.query(`
        INSERT INTO purchases (learner_id, package_id, status, created_at, extra_days)
        VALUES ($1, $2, 'active', NOW(), 0)
      `, [learnerId, packageId]);
    }

    res.status(201).json({ learnerId, userId });
  } catch (err) {
    console.error("Error learnerController.create: - learnerController.js:87", err);
    res.status(500).json({ message: "Server error" });
  }
}

// Cập nhật learner
export async function update(req, res) {
  const { id } = req.params; // learnerId
  const { name, email, phone, dob } = req.body;
  try {
    const userIdRes = await pool.query("SELECT user_id FROM learners WHERE id=$1", [id]);
    if (!userIdRes.rows[0]) return res.status(404).json({ message: "Learner not found" });
    const userId = userIdRes.rows[0].user_id;

    await pool.query(`
      UPDATE users SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        phone = COALESCE($3, phone),
        dob = COALESCE($4, dob),
        updated_at = NOW()
      WHERE id=$5
    `, [name, email, phone, dob, userId]);

    res.json({ message: "Updated" });
  } catch (err) {
    console.error("Error learnerController.update: - learnerController.js:113", err);
    res.status(500).json({ message: "Server error" });
  }
}

// Xóa learner
export async function remove(req, res) {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM learners WHERE id=$1", [id]);
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("Error learnerController.remove: - learnerController.js:125", err);
    res.status(500).json({ message: "Server error" });
  }
}

// Lấy gói gần nhất từ VIEW purchase_details
export async function getLatestPurchase(req, res) {
  const { id } = req.params; // learnerId
  try {
    const result = await pool.query(`
      SELECT *
      FROM purchase_details
      WHERE learner_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [id]);
    res.json({ purchase: result.rows[0] || null });
  } catch (err) {
    console.error("Error learnerController.getLatestPurchase: - learnerController.js:143", err);
    res.status(500).json({ message: "Server error" });
  }
}
