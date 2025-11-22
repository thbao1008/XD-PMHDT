// Test migration - kiểm tra và update trực tiếp
import pool from "../src/config/db.js";

async function testMigration() {
  try {
    // Kiểm tra một vài rows
    const testRounds = await pool.query(`
      SELECT id, score, analysis::jsonb->>'speaking_score' as speaking_score
      FROM speaking_practice_rounds
      WHERE score > 0 AND score <= 10
      LIMIT 5
    `);
    
    console.log("Sample rows cần update:", testRounds.rows);
    
    // Update trực tiếp
    const result = await pool.query(`
      UPDATE speaking_practice_rounds
      SET score = score * 10
      WHERE score > 0 AND score <= 10
      RETURNING id, score
    `);
    
    console.log("\nUpdated rows:", result.rows);
    console.log(`Total updated: ${result.rowCount}`);
    
    // Kiểm tra lại
    const after = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN score > 0 AND score <= 10 THEN 1 END) as still_need_update,
        COUNT(CASE WHEN score > 10 AND score <= 100 THEN 1 END) as updated,
        MIN(score) as min,
        MAX(score) as max
      FROM speaking_practice_rounds
    `);
    
    console.log("\nSau khi update:", after.rows[0]);
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    await pool.end();
    process.exit(1);
  }
}

testMigration();

