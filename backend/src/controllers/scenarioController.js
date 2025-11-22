// backend/src/controllers/scenarioController.js
import * as scenarioService from "../services/scenarioService.js";

/**
 * Lấy danh sách scenarios
 */
export async function getScenarios(req, res) {
  try {
    const scenarios = await scenarioService.getAllScenarios();
    res.json({ scenarios });
  } catch (err) {
    console.error("❌ getScenarios error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

/**
 * Lấy scenario session đang dở dang của học viên
 */
export async function getIncompleteScenarioSession(req, res) {
  try {
    const { learner_id, user_id } = req.query;
    const pool = (await import("../config/db.js")).default;

    // Nếu có user_id, lookup learner_id
    let actualLearnerId = learner_id;
    if (!actualLearnerId && user_id) {
      const learnerRes = await pool.query(
        `SELECT id FROM learners WHERE user_id = $1`,
        [user_id]
      );
      if (learnerRes.rows[0]) {
        actualLearnerId = learnerRes.rows[0].id;
      }
    }

    if (!actualLearnerId) {
      return res.status(400).json({ message: "learner_id or user_id is required" });
    }

    const result = await pool.query(
      `SELECT id, created_at, status, scenario_id
       FROM scenario_sessions 
       WHERE learner_id = $1 
         AND status = 'in_progress'
         AND completed_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [actualLearnerId]
    );

    if (result.rows.length === 0) {
      return res.json({ incomplete_session: null });
    }

    const session = result.rows[0];
    res.json({
      incomplete_session: {
        session_id: session.id,
        scenario_id: session.scenario_id,
        created_at: session.created_at
      }
    });
  } catch (err) {
    console.error("❌ getIncompleteScenarioSession error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
}

/**
 * Tạo scenario session
 */
export async function createScenarioSession(req, res) {
  try {
    const { scenario_id } = req.body;
    let learner_id = req.user?.learner_id || req.body.learner_id;
    const user_id = req.user?.id || req.body.user_id;
    const pool = (await import("../config/db.js")).default;

    if (!learner_id && user_id) {
      // Lookup learner_id from user_id
      const result = await pool.query(
        `SELECT id FROM learners WHERE user_id = $1`,
        [user_id]
      );
      if (result.rows[0]) {
        learner_id = result.rows[0].id;
      }
    }

    if (!learner_id) {
      return res.status(400).json({ message: "learner_id is required" });
    }

    // Kiểm tra xem có session đang dở dang không
    const existingSession = await pool.query(
      `SELECT id FROM scenario_sessions 
       WHERE learner_id = $1 
         AND status = 'in_progress'
         AND completed_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [learner_id]
    );

    if (existingSession.rows.length > 0) {
      return res.status(400).json({ 
        message: "Bạn đang có một bài luyện giao tiếp chưa hoàn thành. Vui lòng hoàn thành bài đó trước khi bắt đầu bài mới.",
        incomplete_session: {
          session_id: existingSession.rows[0].id
        }
      });
    }

    const session = await scenarioService.createSession(learner_id, scenario_id);
    res.json({ session_id: session.id });
  } catch (err) {
    console.error("❌ createScenarioSession error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
}

/**
 * Bắt đầu conversation
 */
export async function startConversation(req, res) {
  try {
    const { sessionId } = req.params;
    const message = await scenarioService.getInitialMessage(sessionId);
    res.json({ message });
  } catch (err) {
    console.error("❌ startConversation error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
}

/**
 * Gửi message trong conversation
 */
export async function sendMessage(req, res) {
  try {
    const { sessionId } = req.params;
    const text = req.body.text;
    const audioFile = req.file;

    const result = await scenarioService.processMessage(sessionId, text, audioFile);
    res.json(result);
  } catch (err) {
    console.error("❌ sendMessage error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
}

/**
 * Lấy gợi ý cho learner (trừ 15 điểm mỗi lần dùng)
 */
export async function getHint(req, res) {
  try {
    const { sessionId } = req.params;
    const hint = await scenarioService.getHint(sessionId);
    res.json(hint);
  } catch (err) {
    console.error("❌ getHint error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
}

/**
 * Chấm điểm cuối cùng cho scenario
 */
export async function evaluateFinalScore(req, res) {
  try {
    const { sessionId } = req.params;
    const { pronunciation_score } = req.body;
    
    const score = await scenarioService.evaluateFinalScore(sessionId, pronunciation_score);
    res.json(score);
  } catch (err) {
    console.error("❌ evaluateFinalScore error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
}

