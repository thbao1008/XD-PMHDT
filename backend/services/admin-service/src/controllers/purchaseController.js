import pool from "../config/db.js";

// ===== Lấy tất cả purchases =====
export async function getAllPurchases(req, res) {
  try {
    const { phone } = req.query;
    let result;
    if (phone && phone.trim()) {
      // Tìm kiếm gần khớp (fuzzy search) - tìm số điện thoại chứa chuỗi tìm kiếm
      result = await pool.query(
        `SELECT * 
         FROM learner_package_view 
         WHERE phone LIKE $1 
         ORDER BY 
           CASE 
             WHEN phone = $2 THEN 1
             WHEN phone LIKE $3 THEN 2
             ELSE 3
           END,
           created_at DESC`,
        [`%${phone}%`, phone, `${phone}%`]
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
    // Lấy trực tiếp từ bảng purchases và join với packages, learners
    // QUAN TRỌNG: purchase_status phải lấy từ bảng purchases, không phải package status
    // Purchase là đại diện cho gói đã đăng ký và gói đã hết hạn - rất quan trọng
    const result = await pool.query(
      `SELECT 
   l.id AS learner_id,
   u.name AS learner_name,
   u.email,
   u.phone,
   pkg.id AS package_id,
   pkg.name AS package_name,
   p.id AS purchase_id,
   p.created_at,
   p.status AS purchase_status,  -- status từ bảng purchases (active, expired, paused)
   (
     COALESCE(
       p.expiry_date,
       p.created_at + (COALESCE(pkg.duration_days, 0) * INTERVAL '1 day')
     )
     + (COALESCE(p.extra_days, 0) * INTERVAL '1 day')
   ) AS expiry_date,
   CASE
     WHEN p.id IS NULL THEN NULL  -- chưa có purchase
     WHEN (p.status = 'paused'::purchase_status OR u.status = 'banned') THEN NULL
     WHEN (p.status = 'expired'::purchase_status) THEN 0
     WHEN (
       COALESCE(
         p.expiry_date,
         p.created_at + (COALESCE(pkg.duration_days, 0) * INTERVAL '1 day')
       )
       + (COALESCE(p.extra_days, 0) * INTERVAL '1 day')
     ) < NOW() THEN 0
     ELSE GREATEST(
       0, 
       EXTRACT(
         DAY FROM (
           (
             COALESCE(
               p.expiry_date,
               p.created_at + (COALESCE(pkg.duration_days, 0) * INTERVAL '1 day')
             )
             + (COALESCE(p.extra_days, 0) * INTERVAL '1 day')
           ) - NOW()
         )
       )
     )
   END AS days_left
 FROM learners l
 JOIN users u ON l.user_id = u.id
 LEFT JOIN purchases p ON p.learner_id = l.id
 LEFT JOIN packages pkg ON p.package_id = pkg.id
 WHERE l.id = $1
 ORDER BY p.created_at DESC NULLS LAST, p.id DESC NULLS LAST`,
      [learnerId]
    );

    res.json({ success: true, purchases: result.rows });
  } catch (err) {
    console.error("Error listLearnerPurchases: - purchaseController.js:56", err);
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

// ===== Gia hạn ===== (Tạo purchase mới với cùng package)
export async function renewPurchaseController(req, res) {
  const { id } = req.params;
  try {
    // Lấy thông tin purchase cũ
    const oldPurchase = await pool.query(
      `SELECT learner_id, package_id, duration_days 
       FROM purchases p
       JOIN packages pk ON p.package_id = pk.id
       WHERE p.id = $1`,
      [id]
    );

    if (oldPurchase.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Purchase not found" });
    }

    const { learner_id, package_id, duration_days } = oldPurchase.rows[0];

    // Tạo purchase mới với cùng package
    const result = await pool.query(
      `INSERT INTO purchases (learner_id, package_id, status, created_at, expired_at, extra_days)
       VALUES ($1, $2, 'active', NOW(), NOW() + $3 * INTERVAL '1 day', 0)
       RETURNING id`,
      [learner_id, package_id, duration_days]
    );

    const newPurchaseId = result.rows[0].id;
    const detail = await pool.query(
      `SELECT * FROM learner_package_view WHERE purchase_id=$1`,
      [newPurchaseId]
    );

    res.json({ success: true, purchase: detail.rows[0], message: "Gia hạn thành công" });
  } catch (err) {
    console.error("Error renewPurchaseController: - purchaseController.js:116", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// ===== Đổi gói ===== (Tạo purchase mới với package mới)
export async function changePackageController(req, res) {
  const { learnerId, newPackageId } = req.body;
  try {
    // Lấy thông tin package mới
    const pkg = await pool.query(
      "SELECT duration_days FROM packages WHERE id=$1",
      [newPackageId]
    );
    if (pkg.rows.length === 0) {
      return res.status(400).json({ success: false, message: "Package not found" });
    }
    const duration = pkg.rows[0].duration_days;

    // Tạo purchase mới với package mới
    const result = await pool.query(
      `INSERT INTO purchases (learner_id, package_id, status, created_at, expired_at, extra_days)
       VALUES ($1, $2, 'active', NOW(), NOW() + $3 * INTERVAL '1 day', 0)
       RETURNING id`,
      [learnerId, newPackageId, duration]
    );

    const newPurchaseId = result.rows[0].id;
    const detail = await pool.query(
      `SELECT * FROM learner_package_view WHERE purchase_id=$1`,
      [newPurchaseId]
    );

    res.json({ success: true, purchase: detail.rows[0], message: "Đổi gói thành công" });
  } catch (err) {
    console.error("Error changePackageController: - purchaseController.js:152", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}
