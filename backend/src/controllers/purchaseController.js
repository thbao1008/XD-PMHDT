import pool from "../config/db.js";

// ===== Lấy tất cả purchases =====
export async function getAllPurchases(req, res) {
  try {
    const { phone } = req.query;
    let result;
    if (phone) {
      result = await pool.query(
        `SELECT * 
         FROM learner_package_view 
         WHERE phone = $1 
         ORDER BY created_at DESC`,
        [phone]
      );
    } else {
      result = await pool.query(
        `SELECT * 
         FROM learner_package_view 
         ORDER BY created_at DESC`
      );
    }
    res.json({ success: true, purchases: result.rows });
  } catch (err) {
    console.error("Error getAllPurchases: - purchaseController.js:25", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// ===== Lấy purchases theo learnerId =====
export async function listLearnerPurchases(req, res) {
  const { learnerId } = req.params;
  try {
    const result = await pool.query(
      `SELECT 
    p.id,
    pk.name AS package_name,
    p.created_at,
    p.status,
    GREATEST(
      pk.duration_days + COALESCE(p.extra_days, 0)
      - EXTRACT(DAY FROM (NOW() - p.created_at)),
      0
    ) AS remaining_days,
    u.name AS learner_name,
    u.phone AS learner_phone
FROM purchases p
JOIN packages pk ON p.package_id = pk.id
JOIN learners l ON p.learner_id = l.id
JOIN users u ON l.user_id = u.id
WHERE p.learner_id = $1
ORDER BY p.created_at DESC`,
      [learnerId]
    );
    res.json({ success: true, purchases: result.rows });
  } catch (err) {
    console.error("Error listLearnerPurchases: - purchaseController.js:57", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// ===== Tạo purchase mới =====
export async function createNewPurchase(req, res) {
  const { learnerId, packageId } = req.body;
  try {
    const pkg = await pool.query(
      "SELECT duration_days FROM packages WHERE id=$1",
      [packageId]
    );
    if (pkg.rows.length === 0) {
      return res.status(400).json({ success: false, message: "Package not found" });
    }
    const duration = pkg.rows[0].duration_days;

    const result = await pool.query(
      `INSERT INTO purchases (learner_id, package_id, status, created_at, expired_at, extra_days)
       VALUES ($1, $2, 'active', NOW(), NOW() + $3 * INTERVAL '1 day', 0)
       RETURNING id`,
      [learnerId, packageId, duration]
    );

    const purchaseId = result.rows[0].id;
    const detail = await pool.query(
      `SELECT * FROM learner_package_view WHERE purchase_id=$1`,
      [purchaseId]
    );

    res.status(201).json({ success: true, purchase: detail.rows[0] });
  } catch (err) {
    console.error("Error createNewPurchase: - purchaseController.js:90", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// ===== Gia hạn =====
export async function renewPurchaseController(req, res) {
  const { id } = req.params;
  const { extraDays } = req.body;
  try {
    await pool.query(
      `UPDATE purchases
       SET renewed_at = NOW(),
           status = 'renewed',
           expired_at = expired_at + $2 * INTERVAL '1 day'
       WHERE id = $1`,
      [id, extraDays]
    );

    const detail = await pool.query(
      `SELECT * FROM learner_package_view WHERE purchase_id=$1`,
      [id]
    );

    res.json({ success: true, purchase: detail.rows[0], message: "Gia hạn thành công" });
  } catch (err) {
    console.error("Error renewPurchaseController: - purchaseController.js:116", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// ===== Đổi gói =====
export async function changePackageController(req, res) {
  const { id } = req.params;
  const { newPackageId } = req.body;
  try {
    const pkg = await pool.query(
      "SELECT duration_days FROM packages WHERE id=$1",
      [newPackageId]
    );
    if (pkg.rows.length === 0) {
      return res.status(400).json({ success: false, message: "Package not found" });
    }
    const duration = pkg.rows[0].duration_days;

    await pool.query(
      `UPDATE purchases
       SET package_id = $1,
           changed_at = NOW(),
           status = 'changed',
           expired_at = NOW() + $2 * INTERVAL '1 day'
       WHERE id = $3`,
      [newPackageId, duration, id]
    );

    const detail = await pool.query(
      `SELECT * FROM learner_package_view WHERE purchase_id=$1`,
      [id]
    );

    res.json({ success: true, purchase: detail.rows[0], message: "Đổi gói thành công" });
  } catch (err) {
    console.error("Error changePackageController: - purchaseController.js:152", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}
