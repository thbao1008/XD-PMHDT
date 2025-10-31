import bcrypt from "bcryptjs";
import pool from "./db.js";

export async function seedAdmin() {
  try {
    const email = "ntb10084@gmail.com";   // email cố định bạn muốn
    const phone = "0123456789";           // số điện thoại mặc định
    const password = "aesp";              // mật khẩu mặc định

    // Kiểm tra xem admin đã tồn tại chưa
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE email = $1 OR phone = $2 LIMIT 1",
      [email, phone]
    );

    if (rows.length === 0) {
      const hashed = await bcrypt.hash(password, 10);
      await pool.query(
        `INSERT INTO users (name, email, phone, dob, role, password, active)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        ["Super Admin", email, phone, "2000-01-01", "admin", hashed, true]
      );
      console.log("✅ Default admin created: - seedAdmin.js:23", email);
    } else {
      console.log("ℹ️ Admin đã tồn tại: - seedAdmin.js:25", rows[0].email);
    }
  } catch (err) {
    console.error("❌ seedAdmin error: - seedAdmin.js:28", err);
  }
}
