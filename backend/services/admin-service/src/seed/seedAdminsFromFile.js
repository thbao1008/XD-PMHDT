import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import pool from "../config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function seedAdmins(closePool = false) {
  try {
    // Check if users table exists first
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      ) as exists;
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log("⚠️  Users table does not exist. Please run: docker-compose run --rm init-db");
      console.log("   Seed will be skipped. Admin service will start but login will fail until table exists.");
      return; // Exit early, don't throw error
    }
    
    const adminsPath = path.join(__dirname, "admins.json");
    if (!fs.existsSync(adminsPath)) {
      console.log("⚠️  admins.json not found, skipping seed");
      return;
    }
    
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

      console.log(`✅ Seeded/Updated admin: ${admin.email}`);
    }
    
    console.log("✅ Admin seed completed successfully");
  } catch (err) {
    // Don't throw - just log error, service should continue
    console.error("❌ Seed admin error:", err.message);
    if (err.code === '42P01') {
      console.error("   → Users table does not exist. Run: docker-compose run --rm init-db");
    }
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
