import pool from "../config/db.js";

export async function getAllPackages() {
  const sql = `SELECT * FROM packages ORDER BY price ASC`;
  const result = await pool.query(sql);
  return result.rows;
}

export async function getPackageById(id) {
  const sql = `SELECT * FROM packages WHERE id = $1`;
  const result = await pool.query(sql, [id]);
  return result.rows[0];
}

export async function createPackage(data) {
  const { name, description, price, original_price, duration_days } = data;
  const sql = `
    INSERT INTO packages (name, description, price, original_price, duration_days, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    RETURNING *
  `;
  const result = await pool.query(sql, [name, description, price, original_price, duration_days]);
  return result.rows[0];
}

export async function updatePackage(id, data) {
  const { name, description, price, original_price, duration_days } = data;
  const sql = `
    UPDATE packages
    SET name = COALESCE($1, name),
        description = COALESCE($2, description),
        price = COALESCE($3, price),
        original_price = COALESCE($4, original_price),
        duration_days = COALESCE($5, duration_days),
        updated_at = NOW()
    WHERE id = $6
    RETURNING *
  `;
  const result = await pool.query(sql, [name, description, price, original_price, duration_days, id]);
  return result.rows[0];
}

export async function deletePackage(id) {
  const sql = `DELETE FROM packages WHERE id = $1 RETURNING *`;
  const result = await pool.query(sql, [id]);
  return result.rows[0];
}

