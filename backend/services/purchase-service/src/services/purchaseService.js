import pool from "../config/db.js";

export async function getAllPurchases(phone = null) {
  if (phone && phone.trim()) {
    const result = await pool.query(
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
    return result.rows;
  } else {
    const result = await pool.query(
      `SELECT * 
       FROM learner_package_view 
       ORDER BY created_at DESC`
    );
    return result.rows;
  }
}

export async function listLearnerPurchases(learnerId) {
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
      p.status AS purchase_status,
      (
        COALESCE(
          p.expiry_date,
          p.created_at + (COALESCE(pkg.duration_days, 0) * INTERVAL '1 day')
        )
        + (COALESCE(p.extra_days, 0) * INTERVAL '1 day')
      ) AS expiry_date,
      CASE
        WHEN p.id IS NULL THEN NULL
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
      END AS days_left,
      p.extra_days
    FROM learners l
    JOIN users u ON l.user_id = u.id
    LEFT JOIN purchases p ON l.id = p.learner_id
    LEFT JOIN packages pkg ON p.package_id = pkg.id
    WHERE l.id = $1
    ORDER BY p.created_at DESC`,
    [learnerId]
  );
  return result.rows;
}

export async function createNewPurchase({ learnerId, packageId, status = "active" }) {
  const sql = `
    INSERT INTO purchases (learner_id, package_id, status, created_at)
    VALUES ($1, $2, $3, NOW())
    RETURNING *
  `;
  const result = await pool.query(sql, [learnerId, packageId, status]);
  return result.rows[0];
}

export async function renewPurchase(purchaseId, extraDays) {
  const result = await pool.query("SELECT * FROM purchases WHERE id = $1", [purchaseId]);
  const purchase = result.rows[0];
  if (!purchase) throw new Error("Purchase not found");

  await pool.query(
    "UPDATE purchases SET status='renewed', renewed_at=NOW(), extra_days = COALESCE(extra_days, 0) + $1 WHERE id=$2",
    [extraDays, purchaseId]
  );

  return { success: true };
}

export async function changePackage(purchaseId, newPackageId) {
  const result = await pool.query("SELECT * FROM purchases WHERE id = $1", [purchaseId]);
  const purchase = result.rows[0];
  if (!purchase) throw new Error("Purchase not found");

  await pool.query(
    "UPDATE purchases SET status='changed', changed_at=NOW(), package_id=$1 WHERE id=$2",
    [newPackageId, purchaseId]
  );

  return { success: true };
}

