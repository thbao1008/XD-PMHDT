import pool from "../config/db.js";

// Lấy tất cả gói học
export async function getAllPackages() {
  const result = await pool.query("SELECT * FROM packages ORDER BY id DESC");
  return result.rows;
}

// Lấy gói học theo id
export async function getPackageById(id) {
  const result = await pool.query(
    "SELECT id, name, price, original_price, duration_days FROM packages WHERE id=$1",
    [id]
  );
  return result.rows[0];
}

// Tạo gói học mới
export async function createPackage({ name, price, original_price, duration_days, description }) {
  const result = await pool.query(
    `INSERT INTO packages (name, price, original_price, duration_days, description, created_at, updated_at) 
     VALUES ($1,$2,$3,$4,$5,NOW(),NOW()) RETURNING *`,
    [name, price, original_price, duration_days, description || null]
  );
  return result.rows[0];
}

export async function updatePackage(id, { name, price, original_price, duration_days, description }) {
  const result = await pool.query(
    `UPDATE packages 
     SET name=COALESCE($1, name), 
         price=COALESCE($2, price), 
         original_price=COALESCE($3, original_price), 
         duration_days=COALESCE($4, duration_days),
         description=COALESCE($5, description),
         updated_at=NOW()
     WHERE id=$6 RETURNING *`,
    [name, price, original_price, duration_days, description, id]
  );
  return result.rows[0];
}

export async function deletePackage(id) {
  await pool.query("DELETE FROM packages WHERE id=$1", [id]);
}


