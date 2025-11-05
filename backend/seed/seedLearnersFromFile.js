import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import pool from "../src/config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function seedLearners(closePool = false) {
  try {
    const learnersPath = path.join(__dirname, "learners.json");
    const data = fs.readFileSync(learnersPath, "utf-8");
    const learners = JSON.parse(data);

    for (const learner of learners) {
      const hashed = await bcrypt.hash(learner.password, 10);

      await pool.query(
        `
        INSERT INTO users (name, email, phone, password, dob, role, status)
        VALUES ($1, $2, $3, $4, $5, 'learner', 'active')
        ON CONFLICT (email) DO UPDATE
        SET name = EXCLUDED.name,
            phone = EXCLUDED.phone,
            password = EXCLUDED.password,
            dob = EXCLUDED.dob,
            role = 'learner',
            status = 'active',
            updated_at = CURRENT_TIMESTAMP
        `,
        [learner.name, learner.email, learner.phone || null, hashed, learner.dob || null]
      );

      console.log(`✅ Seeded/Updated learner: ${learner.email}`);
    }
  } catch (err) {
    console.error("❌ Seed learner error:", err);
  } finally {
    if (closePool) await pool.end();
  }
}

// Nếu chạy trực tiếp
if (import.meta.url === `file://${process.argv[1]}`) {
  seedLearners(true).then(() => process.exit(0));
}
