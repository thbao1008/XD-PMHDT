import pool from "../config/db.js";

export async function getAllPurchases(req, res) {
  try {
    const { phone } = req.query; // lấy query param phone
    let result;
    if (phone) {
      result = await pool.query(
        "SELECT * FROM purchase_details WHERE learner_phone = $1 ORDER BY created_at DESC",
        [phone]
      );
    } else {
      result = await pool.query(
        "SELECT * FROM purchase_details ORDER BY created_at DESC"
      );
    }
    res.json({ purchases: result.rows }); 
  } catch (err) {
    console.error("Error getAllPurchases: - purchaseController.js:19", err);
    res.status(500).json({ message: "Server error" });
  }
}

// ===== Lấy đơn hàng theo learnerId =====
export async function listLearnerPurchases(req, res) {
  const { learnerId } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM purchase_details WHERE learner_id = $1 ORDER BY created_at DESC",
      [learnerId]
    );
    res.json({ purchases: result.rows });
  } catch (err) {
    console.error("Error listLearnerPurchases: - purchaseController.js:34", err);
    res.status(500).json({ message: "Server error" });
  }
}

// ===== Tạo purchase mới =====
export async function createNewPurchase(req, res) {
  const { learnerId, packageId } = req.body;
  try {
    // Lấy duration_days từ gói
    const pkg = await pool.query(
      "SELECT duration_days FROM packages WHERE id=$1",
      [packageId]
    );
    const duration = pkg.rows[0].duration_days;

    // Insert purchase với expired_at
    const result = await pool.query(
      `
      INSERT INTO purchases (learner_id, package_id, status, created_at, expired_at, extra_days)
      VALUES ($1, $2, 'active', NOW(), NOW() + $3 * INTERVAL '1 day', 0)
      RETURNING id
      `,
      [learnerId, packageId, duration]
    );

    const purchaseId = result.rows[0].id;
    const detail = await pool.query(
      "SELECT * FROM purchase_details WHERE purchase_id=$1",
      [purchaseId]
    );

    res.status(201).json({ purchase: detail.rows[0] });
  } catch (err) {
    console.error("Error createNewPurchase: - purchaseController.js:68", err);
    res.status(500).json({ message: "Server error" });
  }
}

// ===== Gia hạn =====
export async function renewPurchaseController(req, res) {
  const { id } = req.params;
  const { extraDays } = req.body;
  try {
    await pool.query(
      `
      UPDATE purchases
      SET renewed_at = NOW(),
          status = 'renewed',
          expired_at = expired_at + $2 * INTERVAL '1 day'
      WHERE id = $1
    `,
      [id, extraDays]
    );

    res.json({ message: "Gia hạn thành công" });
  } catch (err) {
    console.error("Error renew: - purchaseController.js:91", err);
    res.status(500).json({ message: "Server error" });
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
    const duration = pkg.rows[0].duration_days;

    await pool.query(
      `
      UPDATE purchases
      SET package_id = $1,
          changed_at = NOW(),
          status = 'changed',
          expired_at = NOW() + $2 * INTERVAL '1 day'
      WHERE id = $3
    `,
      [newPackageId, duration, id]
    );

    res.json({ message: "Đổi gói thành công" });
  } catch (err) {
    console.error("Error changePackage: - purchaseController.js:121", err);
    res.status(500).json({ message: "Server error" });
  }
}
