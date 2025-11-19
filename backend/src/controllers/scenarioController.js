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
 * Tạo scenario session
 */
export async function createScenarioSession(req, res) {
  try {
    const { scenario_id } = req.body;
    let learner_id = req.user?.learner_id || req.body.learner_id;
    const user_id = req.user?.id || req.body.user_id;

    if (!learner_id && user_id) {
      // Lookup learner_id from user_id
      const pool = (await import("../config/db.js")).default;
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

