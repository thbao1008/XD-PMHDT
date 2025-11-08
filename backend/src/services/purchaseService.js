// purchaseService.js
import pool from "../config/db.js";
import { getPurchasesByLearner, createPurchase } from "../models/purchaseModel.js";

// Tạo purchase ban đầu khi tạo learner
export async function createInitialPurchase(learnerId, packageId) {
  return await createPurchase({ learnerId, packageId, status: "active" });
}

// Gia hạn purchase
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

// Đổi gói purchase
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

export async function listPurchases(learnerId) {
  return await getPurchasesByLearner(learnerId);
}
