// Assistant AI Controller
import * as assistantAIService from "../services/assistantAIService.js";
import pool from "../config/db.js";

/**
 * Kiểm tra trạng thái AiESP
 */
export async function getAiESPStatus(req, res) {
  try {
    const { task_type } = req.query || {};
    const taskTypes = task_type ? [task_type] : ['conversation_ai', 'translation_check', 'speaking_practice'];
    
    const status = {};
    
    for (const tt of taskTypes) {
      // Lấy model mới nhất
      const modelResult = await pool.query(
        `SELECT accuracy_score, trained_at, model_state
         FROM assistant_ai_models
         WHERE task_type = $1
         ORDER BY trained_at DESC
         LIMIT 1`,
        [tt]
      );
      
      // Đếm training samples
      const sampleResult = await pool.query(
        `SELECT COUNT(*) as count
         FROM assistant_ai_training
         WHERE task_type = $1`,
        [tt]
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
        [tt]
      );
      
      const model = modelResult.rows[0];
      const accuracy = model && model.accuracy_score ? parseFloat(model.accuracy_score) : 0.0;
      const isReady = accuracy >= 0.85;
      const isActive = accuracy >= 0.5; // Active nếu accuracy >= 50%
      
      status[tt] = {
        accuracy: accuracy,
        accuracy_percent: (accuracy * 100).toFixed(2) + '%',
        trained_at: model && model.trained_at ? model.trained_at.toISOString() : null,
        training_samples: parseInt(sampleResult.rows[0]?.count || 0),
        new_samples: parseInt(newSampleResult.rows[0]?.count || 0),
        ready: isReady,
        active: isActive,
        status: isReady ? 'READY (Primary)' : isActive ? 'ACTIVE (Learning)' : 'INACTIVE (Not ready)',
        current_responder: isActive ? 'AiESP' : 'OpenRouter'
      };
    }
    
    res.json({
      success: true,
      status: status,
      summary: {
        total_task_types: taskTypes.length,
        ready_count: Object.values(status).filter(s => s.ready).length,
        active_count: Object.values(status).filter(s => s.active).length,
        inactive_count: Object.values(status).filter(s => !s.active).length
      }
    });
  } catch (err) {
    console.error("❌ getAiESPStatus error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
}

/**
 * Kiểm tra xem AiESP có sẵn sàng không
 */
export async function isAiESPReady(req, res) {
  try {
    const { task_type } = req.query || {};
    const taskType = task_type || 'conversation_ai';
    
    const ready = await assistantAIService.isAssistantAIReady(taskType);
    
    res.json({
      ready: ready,
      task_type: taskType,
      message: ready 
        ? `AiESP is ready for ${taskType} (accuracy >= 85%)`
        : `AiESP is not ready for ${taskType} (accuracy < 85%)`
    });
  } catch (err) {
    console.error("❌ isAiESPReady error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
}

/**
 * Kiểm tra trạng thái học tập (legacy - giữ để tương thích)
 */
export async function checkLearningStatus(req, res) {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM assistant_ai_training 
       WHERE task_type = 'translation_check'`
    );
    
    const totalSamples = parseInt(result.rows[0]?.count || 0);
    
    const latestModel = await pool.query(
      `SELECT accuracy_score, trained_at, model_state 
       FROM assistant_ai_models 
       WHERE task_type = 'translation_check'
       ORDER BY trained_at DESC 
       LIMIT 1`
    );
    
    let modelInfo = null;
    if (latestModel.rows.length > 0) {
      const model = latestModel.rows[0];
      modelInfo = {
        accuracy: parseFloat(model.accuracy_score || 0),
        accuracyPercent: (parseFloat(model.accuracy_score || 0) * 100).toFixed(1),
        trainedAt: model.trained_at,
        isReady: parseFloat(model.accuracy_score || 0) >= 0.85,
        hasModel: true
      };
    } else {
      modelInfo = {
        accuracy: 0,
        accuracyPercent: "0.0",
        trainedAt: null,
        isReady: false,
        hasModel: false
      };
    }
    
    res.json({
      success: true,
      totalSamples,
      model: modelInfo
    });
  } catch (err) {
    console.error("❌ checkLearningStatus error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
}

/**
 * Trigger training (legacy - giữ để tương thích)
 */
export async function triggerTraining(req, res) {
  try {
    const { task_type } = req.body || {};
    const taskType = task_type || 'translation_check';
    
    await assistantAIService.trainAssistantAI(taskType);
    
    res.json({
      success: true,
      message: `Training triggered for ${taskType}`
    });
  } catch (err) {
    console.error("❌ triggerTraining error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
}

/**
 * Check readiness (legacy - giữ để tương thích)
 */
export async function checkReadiness(req, res) {
  try {
    const { task_type } = req.query || {};
    const taskType = task_type || 'translation_check';
    
    const ready = await assistantAIService.isAssistantAIReady(taskType);
    
    res.json({
      ready: ready,
      task_type: taskType
    });
  } catch (err) {
    console.error("❌ checkReadiness error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
}

