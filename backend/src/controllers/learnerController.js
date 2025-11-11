import pool from "../config/db.js";
import { getPurchasesByLearner } from "../models/purchaseModel.js";

// Lấy danh sách learners kèm đơn hàng mới nhất
export async function getAll(req, res) {
  try {
    const result = await pool.query(`
      SELECT l.id AS learner_id,
             u.id AS user_id,
             u.name, u.email, u.phone, u.dob,
             l.mentor_id,
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
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT l.id AS learner_id, l.mentor_id, u.*
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
  const { id } = req.params;
  try {
    const purchases = await getPurchasesByLearner(id);
    res.json({ purchases });
  } catch (err) {
    console.error("Error learnerController.getPurchases: - learnerController.js:53", err);
    res.status(500).json({ message: "Server error" });
  }
}

// Tạo learner mới (mentor sẽ được trigger tự động gán)
export async function create(req, res) {
  const { name, email, phone, dob, packageId } = req.body;
  try {
    // 1. Tạo user
    const userRes = await pool.query(`
      INSERT INTO users (name, email, phone, dob, role, status, created_at)
      VALUES ($1,$2,$3,$4,'learner','active',NOW())
      RETURNING id
    `, [name, email, phone, dob]);
    const userId = userRes.rows[0].id;

    // 2. Tạo learner (mentor_id để NULL, trigger sẽ tự động xử lý)
    const learnerRes = await pool.query(`
      INSERT INTO learners (user_id, mentor_id, start_date)
      VALUES ($1, NULL, NOW())
      RETURNING id, mentor_id
    `, [userId]);
    const learnerId = learnerRes.rows[0].id;
    const mentorId = learnerRes.rows[0].mentor_id; // trigger đã gán

    // 3. Nếu có package thì tạo purchase
    if (packageId) {
      await pool.query(`
        INSERT INTO purchases (learner_id, package_id, status, created_at, extra_days)
        VALUES ($1, $2, 'active', NOW(), 0)
      `, [learnerId, packageId]);
    }

    res.status(201).json({ learnerId, userId, mentorId });
  } catch (err) {
    console.error("Error learnerController.create: - learnerController.js:89", err);
    res.status(500).json({ message: "Server error" });
  }
}

// Cập nhật learner (chỉ thông tin user)
export async function update(req, res) {
  const { id } = req.params;
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
    console.error("Error learnerController.update: - learnerController.js:115", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function reassignMentor(req, res) {
  const { id } = req.params; // learnerId
  try {
    const learnerRes = await pool.query("SELECT id FROM learners WHERE id=$1", [id]);
    if (!learnerRes.rows[0]) {
      return res.status(404).json({ message: "Learner not found" });
    }

    // Set mentor_id = NULL → trigger sẽ tự động gán lại
    await pool.query("UPDATE learners SET mentor_id=NULL WHERE id=$1", [id]);

    // Query lại để lấy mentor_id sau khi trigger chạy
    const updatedRes = await pool.query("SELECT mentor_id FROM learners WHERE id=$1", [id]);

    res.json({
      message: "Mentor reassigned automatically by trigger",
      learnerId: id,
      mentorId: updatedRes.rows[0].mentor_id
    });
  } catch (err) {
    console.error("Error learnerController.reassignMentor: - learnerController.js:140", err);
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
    console.error("Error learnerController.remove: - learnerController.js:153", err);
    res.status(500).json({ message: "Server error" });
  }
}

// Lấy gói gần nhất
export async function getLatestPurchase(req, res) {
  const { id } = req.params;
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
    console.error("Error learnerController.getLatestPurchase: - learnerController.js:171", err);
    res.status(500).json({ message: "Server error" });
  }
}
// Cập nhật ghi chú cho learner
export async function updateLearnerNote(req, res) {
  const { learnerId } = req.params;
  const { note } = req.body;
  try {
    const result = await pool.query(
      "UPDATE learners SET note=$1, updated_at=NOW() WHERE id=$2 RETURNING *",
      [note, learnerId]
    );
    res.json({ success: true, learner: result.rows[0] });
  } catch (err) {
    console.error("Error updateLearnerNote:  mentorController.js - learnerController.js:186", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// Mentor gửi report
export async function createReport(req, res) {
  const { mentor_id, learner_id, content } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO reports (mentor_id, learner_id, content, status, created_at, updated_at)
       VALUES ($1,$2,$3,'pending',NOW(),NOW())
       RETURNING *`,
      [mentor_id, learner_id, content]
    );
    res.status(201).json({ success: true, report: result.rows[0] });
  } catch (err) {
    console.error("Error createReport:  mentorController.js - learnerController.js:203", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}