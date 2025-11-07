import {
  getPurchasesByUser,
  createPurchase
} from "../models/purchaseModel.js";
import pool from "../config/db.js";

export async function createInitialPurchase(userId, packageId) {
  // tạo purchase khi tạo learner
  return await createPurchase({ userId, packageId, status: "completed" });
}

export async function renewPurchase(purchaseId, extraDays) {
  // kiểm tra purchase đã hết hạn chưa
  const result = await pool.query("SELECT * FROM purchases WHERE id=$1", [purchaseId]);
  const purchase = result.rows[0];
  if (!purchase) throw new Error("Purchase not found");

  // cập nhật trạng thái
  await pool.query(
    "UPDATE purchases SET status='renewed', renewed_at=NOW() WHERE id=$1",
    [purchaseId]
  );

  // cộng thêm ngày cho user
  await pool.query(
    "UPDATE users SET package_duration_days = package_duration_days + $1 WHERE id=$2",
    [extraDays, purchase.user_id]
  );

  return { success: true };
}

export async function changePackage(purchaseId, newPackageId) {
  const result = await pool.query("SELECT * FROM purchases WHERE id=$1", [purchaseId]);
  const purchase = result.rows[0];
  if (!purchase) throw new Error("Purchase not found");

  // chỉ cho phép đổi khi hết hạn
  // (ví dụ check remaining_days <= 0)

  await pool.query(
    "UPDATE purchases SET status='changed', changed_at=NOW(), package_id=$1 WHERE id=$2",
    [newPackageId, purchaseId]
  );

  const pkg = await pool.query("SELECT duration_days FROM packages WHERE id=$1", [newPackageId]);

  await pool.query(
    "UPDATE users SET package_id=$1, package_duration_days=$2, package_start=NOW() WHERE id=$3",
    [newPackageId, pkg.rows[0].duration_days, purchase.user_id]
  );

  return { success: true };
}
