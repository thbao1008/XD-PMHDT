// Script để kiểm tra điểm sau migration
import pool from "../src/config/db.js";

async function checkScores() {
  try {
    console.log("📊 Kiểm tra điểm sau migration:\n");
    
    // Kiểm tra speaking_practice_rounds
    const rounds = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN score > 0 AND score <= 10 THEN 1 END) as need_update,
        COUNT(CASE WHEN score > 10 AND score <= 100 THEN 1 END) as updated,
        COUNT(CASE WHEN score = 0 THEN 1 END) as zero_scores,
        MIN(score) as min_score,
        MAX(score) as max_score,
        AVG(score) as avg_score
      FROM speaking_practice_rounds
    `);
    
    console.log("speaking_practice_rounds:", rounds.rows[0]);
    
    // Kiểm tra practice_history
    const history = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN average_score > 0 AND average_score <= 10 THEN 1 END) as need_update,
        COUNT(CASE WHEN average_score > 10 AND average_score <= 100 THEN 1 END) as updated,
        MIN(average_score) as min_score,
        MAX(average_score) as max_score,
        AVG(average_score) as avg_score
      FROM practice_history
    `);
    
    console.log("practice_history:", history.rows[0]);
    
    // Kiểm tra quick_evaluations
    const quick = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN score > 0 AND score <= 10 THEN 1 END) as need_update,
        COUNT(CASE WHEN score > 10 AND score <= 100 THEN 1 END) as updated,
        MIN(score) as min_score,
        MAX(score) as max_score,
        AVG(score) as avg_score
      FROM quick_evaluations
    `);
    
    console.log("quick_evaluations:", quick.rows[0]);
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    await pool.end();
    process.exit(1);
  }
}

checkScores();

