import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import pool from "../config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function seedAdmins(closePool = false) {
  try {
    const adminsPath = path.join(__dirname, "admins.json");
    const data = fs.readFileSync(adminsPath, "utf-8");
    const admins = JSON.parse(data);

    for (const admin of admins) {
      const hashed = await bcrypt.hash(admin.password, 10);

      await pool.query(
  `
  INSERT INTO public.users (name, email, phone, password, dob, role, status)
  VALUES ($1, $2, $3, $4, $5, 'admin', 'active')
  ON CONFLICT (email) DO UPDATE
  SET name = EXCLUDED.name,
      phone = EXCLUDED.phone,
      password = EXCLUDED.password,
      dob = EXCLUDED.dob,
      role = 'admin',
      status = 'active',
      updated_at = CURRENT_TIMESTAMP
  `,
  [admin.name, admin.email, admin.phone || null, hashed, admin.dob || null]
);


      console.log(`✅ Seeded/Updated admin: ${admin.email} - seedAdminsFromFile.js:36`);
    }
  } catch (err) {
    console.error("❌ Seed admin error: - seedAdminsFromFile.js:39", err);
  } finally {
    if (closePool) {
      await pool.end();
    }
  }
}

// Nếu chạy trực tiếp
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAdmins(true).then(() => process.exit(0));
}
