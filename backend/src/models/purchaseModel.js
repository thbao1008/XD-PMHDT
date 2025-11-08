// purchaseModel.js
import pool from "../config/db.js";

// Lấy tất cả đơn hàng
export async function getAllPurchases() {
  const result = await pool.query(`
    SELECT
      p.id,
      p.learner_id,
      p.package_id,
      p.status,
      p.created_at,
      u.name AS learner_name,
      u.phone AS learner_phone,
      pk.name AS package_name,
      pk.duration_days,
      GREATEST(
        pk.duration_days + COALESCE(p.extra_days, 0)
        - EXTRACT(DAY FROM (NOW() - p.created_at)),
        0
      ) AS remaining_days
    FROM purchases p
    JOIN learners l ON p.learner_id = l.id
    JOIN users u ON l.user_id = u.id
    JOIN packages pk ON p.package_id = pk.id
    ORDER BY p.created_at DESC
  `);
  return result.rows;
}

// Lấy đơn hàng theo learner_id
export async function getPurchasesByLearner(learnerId) {
  const result = await pool.query(
    `
    SELECT
      p.id,
      p.package_id,
      p.status,
      p.created_at,
      pk.name AS package_name,
      pk.duration_days,
      GREATEST(
        pk.duration_days + COALESCE(p.extra_days, 0)
        - EXTRACT(DAY FROM (NOW() - p.created_at)),
        0
      ) AS remaining_days
    FROM purchases p
    JOIN packages pk ON p.package_id = pk.id
    WHERE p.learner_id = $1
    ORDER BY p.created_at DESC
  `,
    [learnerId]
  );
  return result.rows;
}

// Tạo đơn hàng mới
export async function createPurchase({ learnerId, packageId, status = "active" }) {
  const result = await pool.query(
    `
    INSERT INTO purchases (learner_id, package_id, status, created_at, extra_days)
    VALUES ($1, $2, $3, NOW(), 0)
    RETURNING *
  `,
    [learnerId, packageId, status]
  );
  return result.rows[0];
}
