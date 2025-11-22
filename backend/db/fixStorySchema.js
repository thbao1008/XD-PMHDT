// Quick fix script for story_schema
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../src/config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixStorySchema() {
  try {
    const sqlPath = path.join(__dirname, "fix_story_schema.sql");
    const sql = fs.readFileSync(sqlPath, "utf-8");
    
    console.log("🔄 Fixing story_schema...");
    
    // Split và execute từng statement
    const statements = sql
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith("--"));
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.query(statement);
          console.log(`✅ Executed: ${statement.substring(0, 60).replace(/\n/g, ' ')}...`);
        } catch (err) {
          console.error(`❌ Error: ${err.message}`);
          // Continue anyway
        }
      }
    }
    
    console.log("✅ Story schema fixed!");
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    await pool.end();
    process.exit(1);
  }
}

fixStorySchema();

