import fs from "fs";
import bcrypt from "bcryptjs";
import pool from "../src/config/db.js";

export async function seedAdmins() {
  const data = fs.readFileSync("./seed/admins.json", "utf-8");
  const admins = JSON.parse(data);

  for (const admin of admins) {
    const exists = await pool.query("SELECT * FROM users WHERE email = $1", [admin.email]);
    if (exists.rows.length === 0) {
      const hashed = await bcrypt.hash(admin.password, 10);
      await pool.query(
        `INSERT INTO users (name, email, phone, password, dob, role, active)
         VALUES ($1, $2, $3, $4, $5, 'admin', true)`,
        [admin.name, admin.email, admin.phone, hashed, admin.dob]
      );
      console.log(`✅ Seeded admin: ${admin.email} - seedAdminsFromFile.js:18`);
    } else {
      console.log(`ℹ️ Admin already exists: ${admin.email} - seedAdminsFromFile.js:20`);
    }
  }
}
