/**
 * Kiểm tra AI nào đang hoạt động - AiESP hay OpenRouter
 */

import pool from "../src/config/db.js";

async function checkCurrentAI() {
  try {
    console.log("\n🤖 KIỂM TRA AI ĐANG HOẠT ĐỘNG\n");
    console.log("=" .repeat(60));
    
    const taskTypes = ['conversation_ai', 'translation_check', 'speaking_practice'];
    
    for (const taskType of taskTypes) {
      console.log(`\n📋 Task Type: ${taskType.toUpperCase()}`);
      console.log("-".repeat(60));
      
      // Lấy model mới nhất
      const modelResult = await pool.query(
        `SELECT accuracy_score, trained_at, model_state
         FROM assistant_ai_models
         WHERE task_type = $1
         ORDER BY trained_at DESC
         LIMIT 1`,
        [taskType]
      );
      
      // Đếm training samples
      const sampleResult = await pool.query(
        `SELECT COUNT(*) as count
         FROM assistant_ai_training
         WHERE task_type = $1`,
        [taskType]
      );
      
      // Đếm samples mới (chưa train)
      const newSampleResult = await pool.query(
        `SELECT COUNT(*) as count
         FROM assistant_ai_training
         WHERE task_type = $1
         AND created_at > (
           SELECT COALESCE(MAX(trained_at), '1970-01-01')
           FROM assistant_ai_models
           WHERE task_type = $1
         )`,
        [taskType]
      );
      
      const model = modelResult.rows[0];
      const accuracy = model && model.accuracy_score ? parseFloat(model.accuracy_score) : 0.0;
      const isReady = accuracy >= 0.85;
      const isActive = accuracy >= 0.5; // Active nếu accuracy >= 50%
      const trainingSamples = parseInt(sampleResult.rows[0]?.count || 0);
      const newSamples = parseInt(newSampleResult.rows[0]?.count || 0);
      
      console.log(`   Accuracy: ${(accuracy * 100).toFixed(2)}%`);
      console.log(`   Training Samples: ${trainingSamples}`);
      console.log(`   New Samples (chưa train): ${newSamples}`);
      
      if (model && model.trained_at) {
        console.log(`   Trained At: ${model.trained_at.toISOString()}`);
      } else {
        console.log(`   Trained At: Chưa train`);
      }
      
      console.log(`\n   Status: ${isReady ? '✅ READY (Primary)' : isActive ? '🟡 ACTIVE (Learning)' : '🔴 INACTIVE (Not ready)'}`);
      console.log(`   Current Responder: ${isActive ? '🤖 AiESP' : '🌐 OpenRouter'}`);
      
      if (taskType === 'conversation_ai') {
        console.log(`\n   💡 Trong "Tell Me Your Story":`);
        if (isActive) {
          console.log(`      → AiESP đang trả lời (accuracy >= 50%)`);
          if (isReady) {
            console.log(`      → AiESP là primary responder (accuracy >= 85%)`);
          } else {
            console.log(`      → AiESP đang học, OpenRouter hỗ trợ training`);
          }
        } else {
          console.log(`      → OpenRouter đang trả lời (AiESP chưa sẵn sàng)`);
        }
      }
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("\n📊 TÓM TẮT:");
    
    // Tổng hợp
    let readyCount = 0;
    let activeCount = 0;
    let inactiveCount = 0;
    
    for (const taskType of taskTypes) {
      const modelResult = await pool.query(
        `SELECT accuracy_score FROM assistant_ai_models
         WHERE task_type = $1
         ORDER BY trained_at DESC
         LIMIT 1`,
        [taskType]
      );
      
      const model = modelResult.rows[0];
      const accuracy = model && model.accuracy_score ? parseFloat(model.accuracy_score) : 0.0;
      const isReady = accuracy >= 0.85;
      const isActive = accuracy >= 0.5;
      
      if (isReady) readyCount++;
      else if (isActive) activeCount++;
      else inactiveCount++;
    }
    
    console.log(`   ✅ Ready (>= 85%): ${readyCount}`);
    console.log(`   🟡 Active (>= 50%): ${activeCount}`);
    console.log(`   🔴 Inactive (< 50%): ${inactiveCount}`);
    
    console.log("\n");
    
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await pool.end();
  }
}

checkCurrentAI();

