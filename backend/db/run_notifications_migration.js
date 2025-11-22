// backend/db/run_notifications_migration.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../src/config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log("🔄 Running notifications migration...");

    const sql = fs.readFileSync(
      path.join(__dirname, "notifications_schema.sql"),
      "utf8"
    );

    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");

    console.log("✅ Notifications migration successful!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Notifications migration error:", err);
    throw err;
  } finally {
    client.release();
  }
}

runMigration()
  .then(() => {
    console.log("✅ Migration completed successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  });

