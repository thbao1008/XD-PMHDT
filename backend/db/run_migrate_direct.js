// Script để chạy migration trực tiếp
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../src/config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log("🔄 Chạy migration trực tiếp...");
    
    const sqlPath = path.join(__dirname, "migrate_scores_direct.sql");
    const sql = fs.readFileSync(sqlPath, "utf-8");
    
    const statements = sql
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith("--"));
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          const result = await pool.query(statement);
          console.log(`✅ Updated ${result.rowCount} rows: ${statement.substring(0, 50)}...`);
        } catch (err) {
          console.error(`❌ Error: ${err.message}`);
        }
      }
    }
    
    console.log("\n✅ Migration hoàn tất!");
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration error:", err);
    await pool.end();
    process.exit(1);
  }
}

runMigration();

