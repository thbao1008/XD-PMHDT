import pool from "../config/db.js";

// Lấy tất cả đơn hàng
export async function getAllPurchases() {
  const result = await pool.query(
    `SELECT p.id, p.user_id, p.package_id, p.status, p.created_at,
            u.name AS user_name, u.phone AS user_phone,
            pk.name AS package_name, pk.duration_days,
            GREATEST(pk.duration_days - EXTRACT(DAY FROM (NOW() - p.created_at)), 0) AS remaining_days
     FROM purchases p
     JOIN users u ON p.user_id = u.id
     JOIN packages pk ON p.package_id = pk.id
     ORDER BY p.created_at DESC`
  );
  return result.rows;
}

// Lấy đơn hàng theo user_id
export async function getPurchasesByUser(userId) {
  const result = await pool.query(
    `SELECT p.id, p.package_id, p.status, p.created_at,
            pk.name AS package_name, pk.duration_days
     FROM purchases p
     JOIN packages pk ON p.package_id = pk.id
     WHERE p.user_id=$1
     ORDER BY p.created_at DESC`,
    [userId]
  );
  return result.rows;
}

// Tạo đơn hàng mới
export async function createPurchase({ userId, packageId, status = "completed" }) {
  const result = await pool.query(
    "INSERT INTO purchases (user_id, package_id, status, created_at) VALUES ($1,$2,$3,NOW()) RETURNING *",
    [userId, packageId, status]
  );
  return result.rows[0];
}
