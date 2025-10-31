import pool from "../config/db.js";

// Lấy tất cả user
export async function getAllUsers() {
  const { rows } = await pool.query("SELECT * FROM users ORDER BY id ASC");
  return rows;
}

// Lấy user theo id
export async function findUserById(id) {
  const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  return rows[0];
}

// Lấy user theo email hoặc phone
export async function findUserByIdentifier(identifier) {
  const { rows } = await pool.query(
    "SELECT * FROM users WHERE email = $1 OR phone = $1 LIMIT 1",
    [identifier]
  );
  return rows[0];
}

// Tạo user mới
export async function createUserInDb({ name, email, phone, dob, role, password }) {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, phone, dob, role, password)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [name, email, phone, dob, role, password]
  );
  return rows[0];
}

// Update user (chỉ cho phép update một số field)
export async function updateUserInDb(id, updates) {
  const allowedFields = ["name", "email", "phone", "dob", "role", "password", "active"];
  const fields = Object.keys(updates).filter(f => allowedFields.includes(f));
  if (fields.length === 0) return null;

  const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(", ");
  const values = [id, ...fields.map(f => updates[f])];

  const { rows } = await pool.query(
    `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
    values
  );
  return rows[0];
}

// Xóa user
export async function deleteUserInDb(id) {
  const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [id]);
  return result.rowCount > 0;
}

// Toggle active
export async function toggleUserStatusInDb(id) {
  const { rows } = await pool.query(
    `UPDATE users SET active = NOT COALESCE(active, false)
     WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0];
}

// Cập nhật mật khẩu user theo email
export async function updateUserPassword(email, newPassword) {
  const { rows } = await pool.query(
    "UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING *",
    [newPassword, email]
  );
  return rows[0];
}
