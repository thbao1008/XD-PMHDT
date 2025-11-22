import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../src/config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log("🔄 Running migration to create post_views table...");

    const sql = fs.readFileSync(
      path.join(__dirname, "post_views_schema.sql"),
      "utf8"
    );

    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");

    console.log("✅ Post views table migration successful!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Post views table migration error:", err);
    throw err;
  } finally {
    client.release();
  }
}

runMigration().catch((err) => {
  console.error("Unhandled migration error:", err);
  process.exit(1);
});

