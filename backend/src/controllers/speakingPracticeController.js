// backend/src/controllers/speakingPracticeController.js
import * as speakingPracticeService from "../services/speakingPracticeService.js";
import pool from "../config/db.js";
import path from "path";
import fs from "fs";

/**
 * Tạo session mới cho luyện nói
 */
export async function createPracticeSession(req, res) {
  try {
    const { learner_id, user_id, level } = req.body;

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

    if (!actualLearnerId || !level || ![1, 2, 3].includes(level)) {
      return res.status(400).json({ 
        message: "Invalid learner_id or level",
        debug: { learner_id: actualLearnerId, level, user_id }
      });
    }

    const session = await speakingPracticeService.createPracticeSession(
      actualLearnerId,
      level
    );

    res.json({
      session_id: session.id,
      level: session.level,
      status: session.status
    });
  } catch (err) {
    console.error("❌ createPracticeSession error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
}

/**
 * Lấy prompt cho vòng nói
 */
export async function getPrompt(req, res) {
  try {
    const { sessionId } = req.params;
    const { round, level } = req.query;

    const roundNumber = parseInt(round) || 1;
    const sessionLevel = parseInt(level) || 1;

    const prompt = speakingPracticeService.getPromptForRound(
      sessionLevel,
      roundNumber
    );
    // Tính time limit dựa trên prompt
    const timeLimit = speakingPracticeService.getTimeLimit(sessionLevel, prompt);

    res.json({
      prompt,
      time_limit: timeLimit,
      round: roundNumber
    });
  } catch (err) {
    console.error("❌ getPrompt error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

/**
 * Lưu vòng nói (trả về ngay, xử lý ở background)
 */
export async function saveRound(req, res) {
  try {
    const { sessionId } = req.params;
    const { round_number, time_taken } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "No audio file provided" });
    }

    const audioUrl = `/uploads/${req.file.filename}`;

    // Lưu ngay, xử lý ở background
    const round = await speakingPracticeService.saveRound(
      sessionId,
      parseInt(round_number),
      audioUrl,
      parseInt(time_taken)
    );

    // Trả về ngay, không đợi analysis
    res.json({
      round_id: round.id,
      status: "processing", // Đang xử lý ở background
      message: "Audio đã được lưu. Đang xử lý phân tích..."
    });
  } catch (err) {
    console.error("❌ saveRound error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
}

/**
 * Lấy analysis của một round
 */
export async function getRoundAnalysis(req, res) {
  try {
    const { sessionId, roundId } = req.params;

    const pool = (await import("../config/db.js")).default;
    const result = await pool.query(
      `SELECT * FROM speaking_practice_rounds 
       WHERE id = $1 AND session_id = $2`,
      [roundId, sessionId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: "Round not found" });
    }

    const round = result.rows[0];
    const analysis = round.analysis
      ? typeof round.analysis === "string"
        ? JSON.parse(round.analysis)
        : round.analysis
      : null;

    res.json({
      round_id: round.id,
      score: round.score,
      analysis: analysis,
      feedback: analysis?.feedback || "",
      errors: analysis?.errors || [],
      corrected_text: analysis?.corrected_text || "",
      time_taken: round.time_taken
    });
  } catch (err) {
    console.error("❌ getRoundAnalysis error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
}

/**
 * Kiểm tra translation của học viên
 */
export async function checkTranslation(req, res) {
  try {
    const { sessionId, roundId } = req.params;
    const { translation } = req.body;

    if (!translation) {
      return res.status(400).json({ message: "Translation is required" });
    }

    // Lấy prompt từ round
    const pool = (await import("../config/db.js")).default;
    const roundRes = await pool.query(
      `SELECT prompt FROM speaking_practice_rounds WHERE id = $1 AND session_id = $2`,
      [roundId, sessionId]
    );

    if (!roundRes.rows[0]) {
      return res.status(404).json({ message: "Round not found" });
    }

    const prompt = roundRes.rows[0].prompt;

    // Dùng AI để kiểm tra translation
    const aiService = await import("../services/aiService.js");
    const checkPrompt = `You are an English teacher. Check if the Vietnamese translation is correct for this English text.

English text: "${prompt}"
Student's Vietnamese translation: "${translation}"

Respond in JSON format:
{
  "correct": <true/false>,
  "feedback": "<feedback on the translation, in Vietnamese>",
  "suggested_translation": "<suggested correct translation if wrong>"
}`;

    const response = await aiService.default.callOpenRouter(
      [{ role: "user", content: checkPrompt }],
      { model: "openai/gpt-4o-mini", temperature: 0.7 }
    );

    const content = response.choices?.[0]?.message?.content || "{}";
    const result = JSON.parse(content);

    // Lưu translation vào round
    await pool.query(
      `UPDATE speaking_practice_rounds 
       SET translation = $1
       WHERE id = $2`,
      [translation, roundId]
    );

    res.json(result);
  } catch (err) {
    console.error("❌ checkTranslation error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
}

/**
 * Lấy tổng kết sau 10 vòng
 */
export async function getSummary(req, res) {
  try {
    const { sessionId } = req.params;

    const summary = await speakingPracticeService.generateSummary(sessionId);

    res.json(summary);
  } catch (err) {
    console.error("❌ getSummary error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
}

/**
 * Tạo session cho Tell me your story
 */
export async function createStorySession(req, res) {
  try {
    const { learner_id, user_id } = req.body;

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
      return res.status(400).json({ message: "Invalid learner_id or user_id" });
    }

    const session = await speakingPracticeService.createStorySession(actualLearnerId);

    res.json({
      session_id: session.id,
      initial_message:
        "Xin chào! Tôi là AI của bạn. Hãy kể cho tôi nghe câu chuyện của bạn. Bạn có thể nói hoặc gõ tin nhắn. Tôi sẽ lắng nghe và chia sẻ cùng bạn."
    });
  } catch (err) {
    console.error("❌ createStorySession error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
}

/**
 * Xử lý message trong story mode
 */
export async function processStoryMessage(req, res) {
  try {
    const { session_id, text } = req.body;
    let audioUrl = null;

    if (req.file) {
      audioUrl = `/uploads/${req.file.filename}`;
    }

    if (!text && !audioUrl) {
      return res.status(400).json({ message: "No text or audio provided" });
    }

    const response = await speakingPracticeService.processStoryMessage(
      session_id,
      text || null,
      audioUrl
    );

    res.json({ response });
  } catch (err) {
    console.error("❌ processStoryMessage error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
}

