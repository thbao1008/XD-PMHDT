// backend/src/services/scenarioService.js
import pool from "../config/db.js";
import * as aiService from "./aiService.js";
import { runWhisperX } from "../utils/whisperxRunner.js";
import path from "path";
import fs from "fs";

/**
 * Lấy tất cả scenarios
 */
export async function getAllScenarios() {
  const result = await pool.query(
    `SELECT 
      id, 
      title, 
      description, 
      task, 
      character_name, 
      character_role, 
      vocabulary, 
      initial_prompt, 
      completion_criteria, 
      difficulty_level
     FROM speaking_scenarios 
     ORDER BY difficulty_level, id`
  );
  return result.rows.map(row => ({
    ...row,
    vocabulary: typeof row.vocabulary === 'string' ? JSON.parse(row.vocabulary) : row.vocabulary
  }));
}

/**
 * Tạo scenario session
 */
export async function createSession(learnerId, scenarioId) {
  const result = await pool.query(
    `INSERT INTO scenario_sessions (learner_id, scenario_id, status)
     VALUES ($1, $2, 'in_progress')
     RETURNING *`,
    [learnerId, scenarioId]
  );
  return result.rows[0];
}

/**
 * Lấy initial message từ scenario
 */
export async function getInitialMessage(sessionId) {
  const result = await pool.query(
    `SELECT s.initial_prompt, sc.title, sc.character_name
     FROM scenario_sessions ss
     JOIN speaking_scenarios sc ON ss.scenario_id = sc.id
     WHERE ss.id = $1`,
    [sessionId]
  );
  
  if (!result.rows[0]) {
    throw new Error("Session not found");
  }
  
  return result.rows[0].initial_prompt || "Hello! How can I help you?";
}

/**
 * Xử lý message từ learner
 */
export async function processMessage(sessionId, text, audioFile) {
  // Lấy thông tin session và scenario
  const sessionResult = await pool.query(
    `SELECT ss.*, sc.*
     FROM scenario_sessions ss
     JOIN speaking_scenarios sc ON ss.scenario_id = sc.id
     WHERE ss.id = $1`,
    [sessionId]
  );
  
  if (!sessionResult.rows[0]) {
    throw new Error("Session not found");
  }
  
  const session = sessionResult.rows[0];
  
  // Transcribe audio nếu có
  let transcriptText = text || "";
  if (audioFile) {
    const localPath = path.join(process.cwd(), audioFile.path);
    try {
      const { json: transcriptJson } = await runWhisperX(localPath, {
        model: "base",
        computeType: "float32"
      });
      transcriptText = transcriptJson.text || 
        (transcriptJson.segments || []).map(s => s.text || "").join(" ");
    } catch (err) {
      console.error("❌ Transcription error:", err);
    }
  }
  
  // Lưu learner message
  const turnResult = await pool.query(
    `SELECT COALESCE(MAX(turn_number), 0) + 1 as next_turn
     FROM scenario_conversations
     WHERE session_id = $1`,
    [sessionId]
  );
  const nextTurn = turnResult.rows[0].next_turn;
  
  await pool.query(
    `INSERT INTO scenario_conversations (session_id, speaker, text_content, audio_url, turn_number)
     VALUES ($1, 'learner', $2, $3, $4)`,
    [sessionId, transcriptText, audioFile ? `/uploads/${audioFile.filename}` : null, nextTurn]
  );
  
  // Lấy conversation history
  const historyResult = await pool.query(
    `SELECT speaker, text_content, turn_number
     FROM scenario_conversations
     WHERE session_id = $1
     ORDER BY turn_number
     LIMIT 20`,
    [sessionId]
  );
  
  const conversationHistory = historyResult.rows.map(row => ({
    role: row.speaker === "learner" ? "user" : "assistant",
    content: row.text_content
  }));
  
  // Tạo AI response
  const systemPrompt = `You are ${session.character_name || "a helpful assistant"} in this scenario: ${session.title}.

Scenario description: ${session.description}
Your task: ${session.task}
Your role: ${session.character_role || "assistant"}

Respond naturally in English. Keep responses concise (1-2 sentences). Guide the learner to complete the task: ${session.task}.

Completion criteria: ${session.completion_criteria}`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory
  ];
  
  const aiResponse = await aiService.callOpenRouter(messages, {
    model: "openai/gpt-4o-mini",
    temperature: 0.8
  });
  
  const aiMessage = aiResponse.choices?.[0]?.message?.content || "I understand.";
  
  // Lưu AI response
  await pool.query(
    `INSERT INTO scenario_conversations (session_id, speaker, text_content, turn_number)
     VALUES ($1, 'ai', $2, $3)`,
    [sessionId, aiMessage, nextTurn + 1]
  );
  
  // Kiểm tra xem task đã hoàn thành chưa
  const checkPrompt = `Check if the learner has completed the task: "${session.task}".

Conversation history:
${conversationHistory.map(m => `${m.role}: ${m.content}`).join("\n")}

Respond with ONLY "YES" or "NO".`;
  
  const checkResponse = await aiService.callOpenRouter(
    [{ role: "user", content: checkPrompt }],
    { model: "openai/gpt-4o-mini", temperature: 0.3 }
  );
  
  const taskCompleted = checkResponse.choices?.[0]?.message?.content?.trim().toUpperCase() === "YES";
  
  if (taskCompleted) {
    await pool.query(
      `UPDATE scenario_sessions 
       SET status = 'completed', completed_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [sessionId]
    );
  }
  
  return {
    message: aiMessage,
    task_completed: taskCompleted
  };
}

