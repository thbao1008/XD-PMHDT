/**
 * Script để chạy SQL migrations
 * Usage: node backend/db/runMigration.js <schema_file.sql>
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../src/config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration(schemaFile) {
  try {
    // Schema file có thể là tên file hoặc đường dẫn đầy đủ
    const schemaPath = schemaFile.startsWith('/') || schemaFile.includes('\\')
      ? schemaFile
      : path.join(__dirname, schemaFile);
    
    if (!fs.existsSync(schemaPath)) {
      console.error(`❌ Schema file not found: ${schemaPath}`);
      process.exit(1);
    }
    
    const sql = fs.readFileSync(schemaPath, "utf-8");
    
    console.log(`🔄 Running migration: ${schemaFile}...`);
    
    // Split SQL by semicolons and execute each statement
    // Xử lý multi-line statements và comments
    const statements = sql
      .split(";")
      .map(s => s.trim())
      .filter(s => {
        // Loại bỏ empty và pure comments
        const lines = s.split('\n').map(l => l.trim());
        return s.length > 0 && !lines.every(l => l === '' || l.startsWith('--'));
      });
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.query(statement);
          console.log(`✅ Executed: ${statement.substring(0, 50).replace(/\n/g, ' ')}...`);
        } catch (err) {
          // Ignore "already exists" errors
          if (err.message.includes("already exists") || err.code === "42P07" || err.code === "42P16") {
            console.log(`⚠️  Already exists: ${statement.substring(0, 50).replace(/\n/g, ' ')}...`);
          } else if (err.code === "42P01" && statement.toUpperCase().includes("INDEX")) {
            // Index cần table tồn tại, có thể table chưa được tạo
            console.log(`⚠️  Index creation skipped (table may not exist yet): ${statement.substring(0, 50).replace(/\n/g, ' ')}...`);
          } else {
            throw err;
          }
        }
      }
    }
    
    console.log(`✅ Migration completed: ${schemaFile}`);
    await pool.end();
  } catch (err) {
    console.error(`❌ Migration error:`, err);
    process.exit(1);
  }
}

// Run migration từ command line
const schemaFile = process.argv[2];
if (!schemaFile) {
  console.error("Usage: node backend/db/runMigration.js <schema_file.sql>");
  console.error("Example: node backend/db/runMigration.js dictionary_cache_schema.sql");
  process.exit(1);
}

runMigration(schemaFile);

