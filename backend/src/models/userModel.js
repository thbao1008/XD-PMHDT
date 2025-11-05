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

// Lấy user theo email
export async function findUserByEmail(email) {
  const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return rows[0];
}

// Lấy user theo phone
export async function findUserByPhone(phone) {
  const { rows } = await pool.query("SELECT * FROM users WHERE phone = $1", [phone]);
  return rows[0];
}

// Lấy user theo email/phone/id
export async function findUserByIdentifier(identifier) {
  if (!identifier) return null;

  // Nếu là email
  if (typeof identifier === "string" && /\S+@\S+\.\S+/.test(identifier)) {
    return await findUserByEmail(identifier.toLowerCase());
  }

  // Nếu là số điện thoại (VN: 10 số, bắt đầu bằng 0)
  if (typeof identifier === "string" && /^0\d{9}$/.test(identifier)) {
    return await findUserByPhone(identifier);
  }

  // Nếu là id số
  const idNum = Number(identifier);
  if (!Number.isNaN(idNum)) {
    return await findUserById(idNum);
  }

  return null;
}

// Tạo user mới
export async function createUserInDb({ name, email, phone, dob, role, password, status, package_id }) {
  const q = `
    INSERT INTO users (name, email, phone, dob, role, password, status, package_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *`;
  const values = [name, email, phone, dob, role, password, status || "active", package_id || null];
  const { rows } = await pool.query(q, values);
  console.log("Insert values: - userModel.js:58", values);
  return rows[0];
}

// Update user (general)
export async function updateUserInDb(id, updates) {
  const allowedFields = ["name", "email", "phone", "dob", "role", "password", "status", "package_id"];
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

// Toggle active/banned
export async function toggleUserStatusInDb(id) {
  const { rows } = await pool.query(
    `UPDATE users
     SET status = CASE WHEN status = 'active' THEN 'banned' ELSE 'active' END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0];
}

// Cập nhật mật khẩu theo email
export async function updateUserPasswordByEmail(email, hashedPassword) {
  const { rows } = await pool.query(
    "UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING *",
    [hashedPassword, email]
  );
  return rows[0];
}

// Cập nhật mật khẩu theo id
export async function updateUserPasswordById(id, hashedPassword) {
  const { rows } = await pool.query(
    "UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
    [hashedPassword, id]
  );
  return rows[0];
}
