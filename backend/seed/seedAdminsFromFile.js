import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import pool from "../src/config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureSchema() {
  try {
    // Check if users table exists
    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!checkResult.rows[0].exists) {
      console.log("📄 Users table not found, initializing schema...");
      
      // Run init.sql
      const initSqlPath = path.join(__dirname, "../db/init.sql");
      if (fs.existsSync(initSqlPath)) {
        const initSql = fs.readFileSync(initSqlPath, "utf-8");
        await pool.query(initSql);
        console.log("✅ Users table created");
      }
      
      // Fix constraint to allow admin role
      try {
        await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
        await pool.query(`ALTER TABLE users ADD CONSTRAINT users_role_check 
          CHECK (role IN ('learner', 'mentor', 'admin'))`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS dob DATE`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);
        console.log("✅ Users table constraints updated");
      } catch (err) {
        // Ignore if already exists
        if (err.code !== "42P07" && err.code !== "42704") {
          throw err;
        }
      }
    }
  } catch (err) {
    console.error("⚠️  Error checking schema:", err.message);
    // Continue anyway, might already exist
  }
}

export async function seedAdmins(closePool = false) {
  try {
    // Ensure schema exists before seeding
    await ensureSchema();
    
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

// Nếu chạy trực tiếp (check if this file is the main module)
const filePath = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] && filePath === process.argv[1].replace(/\\/g, '/');

if (isMainModule) {
  seedAdmins(true)
    .then(() => {
      console.log("✅ Seed admin completed!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Seed admin failed:", err);
      process.exit(1);
    });
}
