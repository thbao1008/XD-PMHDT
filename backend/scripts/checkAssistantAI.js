/**
 * Script để kiểm tra trạng thái học tập của AI phụ trợ
 * Usage: node backend/scripts/checkAssistantAI.js
 */

import pool from "../src/config/db.js";

async function checkAssistantAI() {
  try {
    console.log("🔍 Đang kiểm tra trạng thái AI phụ trợ...\n");
    
    // Kiểm tra bảng có tồn tại không
    try {
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'assistant_ai_training'
        )
      `);
      
      if (!tableCheck.rows[0].exists) {
        console.log("❌ Bảng assistant_ai_training chưa tồn tại!");
        console.log("💡 Chạy migration: npm run migrate:assistant\n");
        await pool.end();
        return;
      }
    } catch (err) {
      console.error("❌ Lỗi kiểm tra bảng:", err.message);
      await pool.end();
      return;
    }
    
    // Đếm số lượng training data
    const trainingCount = await pool.query(
      `SELECT COUNT(*) as count FROM assistant_ai_training 
       WHERE task_type = 'translation_check'`
    );
    
    const totalSamples = parseInt(trainingCount.rows[0]?.count || 0);
    console.log(`📊 Tổng số training samples: ${totalSamples}`);
    
    if (totalSamples === 0) {
      console.log("⚠️  Chưa có training data nào!");
      console.log("💡 AI phụ trợ sẽ bắt đầu học khi có người dùng nhập translation.\n");
    } else {
      const nextTrainingAt = Math.ceil(totalSamples / 50) * 50;
      const samplesUntilNext = nextTrainingAt - totalSamples;
      console.log(`📈 Sẽ train lại khi đạt ${nextTrainingAt} samples (còn ${samplesUntilNext} samples)`);
    }
    
    // Lấy model mới nhất
    const latestModel = await pool.query(
      `SELECT accuracy_score, trained_at, model_state 
       FROM assistant_ai_models 
       WHERE task_type = 'translation_check'
       ORDER BY trained_at DESC 
       LIMIT 1`
    );
    
    if (latestModel.rows.length > 0) {
      const model = latestModel.rows[0];
      const accuracy = parseFloat(model.accuracy_score || 0);
      const accuracyPercent = (accuracy * 100).toFixed(1);
      const isReady = accuracy >= 0.85;
      
      console.log(`\n🤖 Model mới nhất:`);
      console.log(`   - Accuracy: ${accuracyPercent}%`);
      console.log(`   - Trained at: ${model.trained_at}`);
      console.log(`   - Status: ${isReady ? '✅ Sẵn sàng' : '⏳ Đang học'}`);
      
      if (isReady) {
        console.log(`\n🎉 AI phụ trợ đã đủ thông minh để thay thế OpenRouter!`);
      } else {
        console.log(`\n📚 AI phụ trợ cần đạt 85% accuracy để sẵn sàng.`);
        console.log(`   Hiện tại: ${accuracyPercent}%`);
      }
    } else {
      console.log(`\n⚠️  Chưa có model nào được train.`);
      if (totalSamples >= 10) {
        console.log(`💡 Có ${totalSamples} samples, có thể train thủ công.`);
      } else {
        console.log(`💡 Cần ít nhất 10 samples để train.`);
      }
    }
    
    // Lấy một vài training samples gần nhất
    const recentSamples = await pool.query(
      `SELECT input_data, expected_output, created_at 
       FROM assistant_ai_training 
       WHERE task_type = 'translation_check'
       ORDER BY created_at DESC 
       LIMIT 3`
    );
    
    if (recentSamples.rows.length > 0) {
      console.log(`\n📝 Training samples gần nhất:`);
      recentSamples.rows.forEach((row, idx) => {
        const input = typeof row.input_data === 'string' 
          ? JSON.parse(row.input_data) 
          : row.input_data;
        console.log(`   ${idx + 1}. ${input.english_text?.substring(0, 50)}... (${row.created_at})`);
      });
    }
    
    console.log("\n✅ Kiểm tra hoàn tất!\n");
    
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
    if (err.code === '42P01') {
      console.log("💡 Chạy migration: npm run migrate:assistant");
    }
  } finally {
    await pool.end();
  }
}

checkAssistantAI();

