import pool from "../config/db.js";

export async function createUser(req, res) {
  const { name, email, password, phone, dob, role, packageId } = req.body;

  try {
    // Tạo user
    const userResult = await pool.query(
      "INSERT INTO users (name, email, password, phone, dob, role) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
      [name, email, password, phone, dob, role]
    );
    const user = userResult.rows[0];

    // Nếu là Learner và có packageId thì tạo purchase
    if (role.toUpperCase() === "LEARNER" && packageId) {
      await pool.query(
        "INSERT INTO purchases (user_id, package_id, status, created_at) VALUES ($1,$2,$3,NOW())",
        [user.id, packageId, "completed"]
      );
    }

    res.status(201).json({ user });
  } catch (err) {
    console.error("❌ Lỗi tạo user: - packageModel.js:24", err);
    res.status(500).json({ error: "DB error" });
  }
}

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
export async function createPackage({ name, price, original_price, duration_days }) {
  const result = await pool.query(
    `INSERT INTO packages (name, price, original_price, duration_days) 
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [name, price, original_price, duration_days]
  );
  return result.rows[0];
}

export async function updatePackage(id, { name, price, original_price, duration_days }) {
  const result = await pool.query(
    `UPDATE packages 
     SET name=$1, price=$2, original_price=$3, duration_days=$4, updated_at=NOW()
     WHERE id=$5 RETURNING *`,
    [name, price, original_price, duration_days, id]
  );
  return result.rows[0];
}

export async function deletePackage(id) {
  await pool.query("DELETE FROM packages WHERE id=$1", [id]);
}

