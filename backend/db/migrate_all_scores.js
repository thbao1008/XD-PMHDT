// Migration tất cả điểm từ thang 10 sang thang 100
import pool from "../src/config/db.js";

async function migrateAllScores() {
  try {
    console.log("🔄 Bắt đầu migration tất cả điểm...\n");
    
    // 1. speaking_practice_rounds
    const rounds = await pool.query(`
      UPDATE speaking_practice_rounds
      SET score = score * 10
      WHERE score > 0 AND score <= 10
    `);
    console.log(`✅ speaking_practice_rounds: Updated ${rounds.rowCount} rows`);
    
    // Update analysis JSON
    const roundsWithAnalysis = await pool.query(`
      UPDATE speaking_practice_rounds
      SET analysis = jsonb_set(
        jsonb_set(
          COALESCE(analysis::jsonb, '{}'::jsonb),
          '{speaking_score}',
          to_jsonb((analysis::jsonb->>'speaking_score')::numeric * 10)
        ),
        '{vocabulary_score}',
        to_jsonb(
          CASE 
            WHEN (analysis::jsonb->>'vocabulary_score')::numeric > 0 AND (analysis::jsonb->>'vocabulary_score')::numeric <= 10
            THEN (analysis::jsonb->>'vocabulary_score')::numeric * 10
            ELSE COALESCE((analysis::jsonb->>'vocabulary_score')::numeric, 0)
          END
        )
      )
      WHERE analysis IS NOT NULL 
        AND analysis::text != 'null'
        AND (analysis::jsonb->>'speaking_score')::numeric > 0 
        AND (analysis::jsonb->>'speaking_score')::numeric <= 10
    `);
    console.log(`✅ speaking_practice_rounds analysis: Updated ${roundsWithAnalysis.rowCount} rows`);
    
    // 2. practice_history
    const history = await pool.query(`
      UPDATE practice_history
      SET 
        total_score = CASE WHEN total_score > 0 AND total_score <= 10 THEN total_score * 10 ELSE total_score END,
        average_score = CASE WHEN average_score > 0 AND average_score <= 10 THEN average_score * 10 ELSE average_score END
      WHERE (total_score > 0 AND total_score <= 10) OR (average_score > 0 AND average_score <= 10)
    `);
    console.log(`✅ practice_history: Updated ${history.rowCount} rows`);
    
    // 3. quick_evaluations
    const quick = await pool.query(`
      UPDATE quick_evaluations
      SET score = score * 10
      WHERE score > 0 AND score <= 10
    `);
    console.log(`✅ quick_evaluations: Updated ${quick.rowCount} rows`);
    
    // 4. learner_progress
    const progress = await pool.query(`
      UPDATE learner_progress
      SET 
        total_score = CASE WHEN total_score > 0 AND total_score <= 10 THEN total_score * 10 ELSE total_score END,
        average_score = CASE WHEN average_score > 0 AND average_score <= 10 THEN average_score * 10 ELSE average_score END
      WHERE (total_score > 0 AND total_score <= 10) OR (average_score > 0 AND average_score <= 10)
    `);
    console.log(`✅ learner_progress: Updated ${progress.rowCount} rows`);
    
    // 5. ai_reports
    const aiReports = await pool.query(`
      UPDATE ai_reports
      SET 
        overall_score = CASE WHEN overall_score > 0 AND overall_score <= 10 THEN overall_score * 10 ELSE overall_score END,
        pronunciation_score = CASE WHEN pronunciation_score > 0 AND pronunciation_score <= 10 THEN pronunciation_score * 10 ELSE pronunciation_score END,
        fluency_score = CASE WHEN fluency_score > 0 AND fluency_score <= 10 THEN fluency_score * 10 ELSE fluency_score END
      WHERE (overall_score > 0 AND overall_score <= 10) 
         OR (pronunciation_score > 0 AND pronunciation_score <= 10)
         OR (fluency_score > 0 AND fluency_score <= 10)
    `);
    console.log(`✅ ai_reports: Updated ${aiReports.rowCount} rows`);
    
    // 6. feedbacks
    const feedbacks = await pool.query(`
      UPDATE feedbacks
      SET 
        final_score = CASE WHEN final_score > 0 AND final_score <= 10 THEN final_score * 10 ELSE final_score END,
        pronunciation_score = CASE WHEN pronunciation_score > 0 AND pronunciation_score <= 10 THEN pronunciation_score * 10 ELSE pronunciation_score END,
        fluency_score = CASE WHEN fluency_score > 0 AND fluency_score <= 10 THEN fluency_score * 10 ELSE fluency_score END
      WHERE (final_score > 0 AND final_score <= 10) 
         OR (pronunciation_score > 0 AND pronunciation_score <= 10)
         OR (fluency_score > 0 AND fluency_score <= 10)
    `);
    console.log(`✅ feedbacks: Updated ${feedbacks.rowCount} rows`);
    
    console.log("\n✅ Migration hoàn tất!");
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration error:", err);
    await pool.end();
    process.exit(1);
  }
}

migrateAllScores();

