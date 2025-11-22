// Script để chạy migration cập nhật điểm từ thang 10 sang thang 100
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../src/config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log("🔄 Bắt đầu migration: Cập nhật điểm từ thang 10 sang thang 100...");
    
    const sqlPath = path.join(__dirname, "migrate_scores_to_100.sql");
    const sql = fs.readFileSync(sqlPath, "utf-8");
    
    // Split và execute từng statement
    const statements = sql
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith("--") && !s.startsWith("BEGIN") && !s.startsWith("COMMIT"));
    
    await pool.query("BEGIN");
    
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
    
    await pool.query("COMMIT");
    
    // Chạy query kiểm tra
    console.log("\n📊 Kết quả migration:");
    const checkResult = await pool.query(`
      SELECT 
        'speaking_practice_rounds' as table_name,
        COUNT(*) as total_rows,
        COUNT(CASE WHEN score <= 10 THEN 1 END) as rows_with_old_scale
      FROM speaking_practice_rounds
      UNION ALL
      SELECT 
        'practice_history',
        COUNT(*),
        COUNT(CASE WHEN average_score <= 10 THEN 1 END)
      FROM practice_history
      UNION ALL
      SELECT 
        'quick_evaluations',
        COUNT(*),
        COUNT(CASE WHEN score <= 10 THEN 1 END)
      FROM quick_evaluations
      UNION ALL
      SELECT 
        'ai_reports',
        COUNT(*),
        COUNT(CASE WHEN overall_score <= 10 THEN 1 END)
      FROM ai_reports
      UNION ALL
      SELECT 
        'feedbacks',
        COUNT(*),
        COUNT(CASE WHEN final_score <= 10 THEN 1 END)
      FROM feedbacks
    `);
    
    console.table(checkResult.rows);
    
    console.log("\n✅ Migration hoàn tất!");
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration error:", err);
    await pool.query("ROLLBACK").catch(() => {});
    await pool.end();
    process.exit(1);
  }
}

runMigration();

