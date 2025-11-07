import pool from "../config/db.js";

// ================== Lấy tất cả đơn hàng ==================
export async function listPurchases(req, res) {
  try {
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
    res.json({ purchases: result.rows });
  } catch (err) {
    console.error("❌ Lỗi listPurchases: - purchaseController.js:18", err);
    res.status(500).json({ message: "Server error" });
  }
}

// ================== Lấy đơn hàng theo userId ==================
export async function listUserPurchases(req, res) {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      `SELECT p.id, p.user_id, p.package_id, p.status, p.created_at,
              pk.name AS package_name, pk.duration_days,
              GREATEST(pk.duration_days - EXTRACT(DAY FROM (NOW() - p.created_at)), 0) AS remaining_days
       FROM purchases p
       JOIN packages pk ON p.package_id = pk.id
       WHERE p.user_id=$1
       ORDER BY p.created_at DESC`,
      [userId]
    );
    res.json({ purchases: result.rows });
  } catch (err) {
    console.error("❌ Lỗi listUserPurchases: - purchaseController.js:39", err);
    res.status(500).json({ message: "Server error" });
  }
}

// ================== Tạo purchase mới ==================
export async function createNewPurchase(req, res) {
  const { userId, packageId } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO purchases (user_id, package_id, status, created_at) VALUES ($1,$2,'completed',NOW()) RETURNING *",
      [userId, packageId]
    );
    res.status(201).json({ purchase: result.rows[0] });
  } catch (err) {
    console.error("❌ Lỗi createNewPurchase: - purchaseController.js:54", err);
    res.status(500).json({ message: "Server error" });
  }
}

// ================== Gia hạn ==================
export async function renewPurchaseController(req, res) {
  const { id } = req.params;
  const { extraDays } = req.body; // số ngày gia hạn thêm
  try {
    await pool.query(
      "UPDATE purchases SET renewed_at=NOW(), status='renewed' WHERE id=$1",
      [id]
    );
    res.json({ message: "Gia hạn thành công" });
  } catch (err) {
    console.error("❌ Lỗi renew: - purchaseController.js:70", err);
    res.status(500).json({ message: "Server error" });
  }
}

// ================== Đổi gói ==================
export async function changePackageController(req, res) {
  const { id } = req.params;
  const { newPackageId } = req.body;
  try {
    await pool.query(
      "UPDATE purchases SET package_id=$1, changed_at=NOW(), status='changed' WHERE id=$2",
      [newPackageId, id]
    );
    res.json({ message: "Đổi gói thành công" });
  } catch (err) {
    console.error("❌ Lỗi changePackage: - purchaseController.js:86", err);
    res.status(500).json({ message: "Server error" });
  }
}
