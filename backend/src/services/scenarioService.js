// backend/src/services/scenarioService.js
import pool from "../config/db.js";
import * as aiService from "./aiService.js";
import { runWhisperX } from "../utils/whisperxRunner.js";
import { findPythonExecutable } from "../utils/whisperxRunner.js";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

/**
 * Lấy điểm trung bình của học viên để điều chỉnh độ khó scenario
 */
async function getLearnerAverageScore(learnerId) {
  if (!learnerId) return null;
  
  try {
    const result = await pool.query(
      `SELECT AVG(average_score) as avg_score
       FROM practice_history 
       WHERE learner_id = $1 
         AND practice_type IN ('speaking_practice', 'scenario')
         AND average_score IS NOT NULL`,
      [learnerId]
    );
    
    return result.rows[0]?.avg_score ? parseFloat(result.rows[0].avg_score) : null;
  } catch (err) {
    console.error("❌ Error getting learner average score:", err);
    return null;
  }
}

/**
 * Gọi Python trainer để lấy training data cho scenario
 */
async function getTrainingDataFromPython(trainingType, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const trainerPath = path.join(process.cwd(), "backend", "ai_models", "comprehensiveAITrainer.py");
      const pythonCmd = findPythonExecutable();
      
      // Tạo data object để gửi qua stdin
      const stdinData = { training_type: trainingType, ...options };
      
      const pythonProcess = spawn(pythonCmd, [trainerPath], {
        cwd: process.cwd(),
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error("❌ Python trainer error:", stderr);
          resolve(null); // Return null để fallback
          return;
        }
        
        try {
          // Extract JSON từ stdout
          const firstBrace = stdout.indexOf('{');
          const lastBrace = stdout.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1) {
            const jsonString = stdout.substring(firstBrace, lastBrace + 1);
            const result = JSON.parse(jsonString);
            resolve(result);
          } else {
            resolve(null);
          }
        } catch (err) {
          console.error("❌ Error parsing Python output:", err);
          resolve(null);
        }
      });
      
      pythonProcess.on('error', (err) => {
        console.error("❌ Error spawning Python process:", err);
        resolve(null);
      });
      
      // Gửi data qua stdin
      pythonProcess.stdin.write(JSON.stringify(stdinData));
      pythonProcess.stdin.end();
      
    } catch (err) {
      console.error("❌ Error calling Python trainer:", err);
      resolve(null);
    }
  });
}

/**
 * Tạo scenario ngẫu nhiên bằng AI dựa trên thành tích của học viên
 * Sử dụng AI training model để tạo scenario chất lượng cao
 */
export async function generateRandomScenario(learnerId) {
  try {
    const averageScore = await getLearnerAverageScore(learnerId);
    
    // Xác định độ khó dựa trên điểm trung bình
    let difficulty = "intermediate";
    let difficultyLevel = 2;
    if (averageScore === null || averageScore < 50) {
      difficulty = "beginner";
      difficultyLevel = 1;
    } else if (averageScore >= 80) {
      difficulty = "advanced";
      difficultyLevel = 3;
    }
    
    // Gọi Python trainer để lấy training data
    const trainingData = await getTrainingDataFromPython('scenario_generator', {
      learner_average_score: averageScore,
      difficulty: difficulty
    });
    
    // Nếu có training data, sử dụng nó; nếu không, fallback về direct call
    let systemPrompt;
    let model = "openai/gpt-4o";
    let temperature = 0.9;
    let maxTokens = 2000;
    
    if (trainingData && trainingData.system_prompt) {
      systemPrompt = trainingData.system_prompt;
      model = trainingData.model || model;
      temperature = trainingData.temperature || temperature;
      maxTokens = trainingData.max_tokens || maxTokens;
    } else {
      // Fallback: tạo prompt đơn giản
      systemPrompt = `Create a realistic English learning scenario for ${difficulty} level learners. Include title, description, context, task, completion_criteria, characters, vocabulary, and initial_message. Return JSON format.`;
    }
    
    const response = await aiService.callOpenRouter(
      [{ role: "user", content: systemPrompt }],
      {
        model: model,
        temperature: temperature,
        max_tokens: maxTokens
      }
    );
    
    const content = response.choices?.[0]?.message?.content || "{}";
    let scenarioData;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      scenarioData = JSON.parse(jsonStr);
    } catch (err) {
      console.error("❌ Error parsing AI scenario response:", err);
      // Fallback scenario
      scenarioData = {
        title: "Job Interview",
        description: "A job interview scenario",
        context: "You are entering a job interview room.",
        task: "Successfully complete the job interview",
        completion_criteria: "The interviewer says you are hired",
        characters: [{ name: "Interviewer", role: "Job Interviewer", personality: "Professional and friendly" }],
        vocabulary: [],
        initial_message: "Hello! Please have a seat."
      };
    }
    
    return {
      ...scenarioData,
      difficulty_level: difficultyLevel,
      is_ai_generated: true
    };
  } catch (err) {
    console.error("❌ Error generating random scenario:", err);
    throw err;
  }
}

/**
 * Lấy tất cả scenarios (bao gồm cả AI-generated)
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
 * Tạo scenario session (có thể tạo scenario ngẫu nhiên nếu scenarioId = null)
 */
export async function createSession(learnerId, scenarioId = null) {
  let actualScenarioId = scenarioId;
  
  // Nếu không có scenarioId, tạo scenario ngẫu nhiên bằng AI
  if (!actualScenarioId) {
    const generatedScenario = await generateRandomScenario(learnerId);
    
    // Lưu scenario vào database (tạm thời, có thể xóa sau khi session kết thúc)
    const scenarioResult = await pool.query(
      `INSERT INTO speaking_scenarios (
        title, description, task, character_name, character_role, 
        vocabulary, initial_prompt, completion_criteria, difficulty_level, is_ai_generated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
      RETURNING id`,
      [
        generatedScenario.title,
        generatedScenario.description,
        generatedScenario.task,
        generatedScenario.characters?.[0]?.name || "Assistant",
        generatedScenario.characters?.[0]?.role || "Assistant",
        JSON.stringify(generatedScenario.vocabulary || []),
        generatedScenario.initial_message || generatedScenario.context,
        generatedScenario.completion_criteria,
        generatedScenario.difficulty_level
      ]
    );
    actualScenarioId = scenarioResult.rows[0].id;
  }
  
  const result = await pool.query(
    `INSERT INTO scenario_sessions (learner_id, scenario_id, status, score, hints_used)
     VALUES ($1, $2, 'in_progress', 100, 0)
     RETURNING *`,
    [learnerId, actualScenarioId]
  );
  return result.rows[0];
}

/**
 * Lấy initial message và thông tin scenario (bao gồm context và vocabulary)
 */
export async function getInitialMessage(sessionId) {
  const result = await pool.query(
    `SELECT ss.*, sc.*
     FROM scenario_sessions ss
     JOIN speaking_scenarios sc ON ss.scenario_id = sc.id
     WHERE ss.id = $1`,
    [sessionId]
  );
  
  if (!result.rows[0]) {
    throw new Error("Session not found");
  }
  
  const row = result.rows[0];
  
  // Parse vocabulary từ JSONB
  let vocabulary = [];
  if (row.vocabulary) {
    try {
      vocabulary = typeof row.vocabulary === 'string' 
        ? JSON.parse(row.vocabulary) 
        : row.vocabulary;
    } catch (err) {
      console.error("❌ Error parsing vocabulary:", err);
      vocabulary = [];
    }
  }
  
  return {
    message: row.initial_prompt || "Hello! How can I help you?",
    context: row.description || row.initial_prompt || "",
    vocabulary: vocabulary,
    title: row.title,
    task: row.task,
    character_name: row.character_name,
    character_role: row.character_role
  };
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
    speaker: row.speaker,
    text_content: row.text_content,
    turn_number: row.turn_number
  }));
  
  // Đánh giá độ hiệu quả của câu trả lời learner trước khi chuyển tiếp
  const scenarioContext = {
    title: session.title,
    description: session.description,
    task: session.task,
    completion_criteria: session.completion_criteria,
    characters: [{
      name: session.character_name || "Assistant",
      role: session.character_role || "assistant",
      personality: "Friendly and helpful"
    }]
  };
  
  // Gọi AI training model để đánh giá độ hiệu quả
  const evaluationTraining = await getTrainingDataFromPython('scenario_evaluation', {
    learner_response: transcriptText,
    scenario_context: scenarioContext,
    conversation_history: conversationHistory
  });
  
  let canContinue = true;
  if (evaluationTraining && evaluationTraining.system_prompt) {
    try {
      const evalResponse = await aiService.callOpenRouter(
        [{ role: "user", content: evaluationTraining.system_prompt }],
        {
          model: evaluationTraining.model || "openai/gpt-4o-mini",
          temperature: evaluationTraining.temperature || 0.3,
          max_tokens: evaluationTraining.max_tokens || 150
        }
      );
      
      const evalContent = evalResponse.choices?.[0]?.message?.content || "{}";
      const evalResult = JSON.parse(evalContent);
      canContinue = evalResult.can_continue === true && evalResult.is_effective === true;
      
      // Nếu không hiệu quả, trả về message yêu cầu làm rõ
      if (!canContinue) {
        return {
          message: evalResult.reason || "I didn't quite understand. Could you please say that again or provide more details?",
          task_completed: false,
          can_continue: false,
          needs_clarification: true
        };
      }
    } catch (err) {
      console.error("❌ Error evaluating learner response:", err);
      // Nếu lỗi, cho phép tiếp tục
      canContinue = true;
    }
  }
  
  // Nếu câu trả lời hiệu quả, tạo AI response sử dụng training model
  const conversationTraining = await getTrainingDataFromPython('scenario_conversation', {
    scenario_context: scenarioContext,
    conversation_history: conversationHistory,
    learner_response: transcriptText
  });
  
  let messages;
  let model = "openai/gpt-4o-mini";
  let temperature = 0.8;
  let maxTokens = 200;
  
  if (conversationTraining && conversationTraining.messages) {
    messages = conversationTraining.messages;
    model = conversationTraining.model || model;
    temperature = conversationTraining.temperature || temperature;
    maxTokens = conversationTraining.max_tokens || maxTokens;
  } else {
    // Fallback: tạo messages đơn giản
    const conversationHistoryForAI = conversationHistory.map(row => ({
      role: row.speaker === "learner" ? "user" : "assistant",
      content: row.text_content
    }));
    
    messages = [
      { 
        role: "system", 
        content: `You are ${session.character_name || "a helpful assistant"} in this scenario: ${session.title}. Respond naturally in English. Keep responses concise (1-2 sentences).` 
      },
      ...conversationHistoryForAI,
      { role: "user", content: transcriptText }
    ];
  }
  
  const aiResponse = await aiService.callOpenRouter(messages, {
    model: model,
    temperature: temperature,
    max_tokens: maxTokens
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
    task_completed: taskCompleted,
    can_continue: canContinue
  };
}

/**
 * Tạo gợi ý cho learner khi họ không biết phải nói gì
 * Mỗi lần dùng gợi ý sẽ trừ 15 điểm
 */
export async function getHint(sessionId) {
  try {
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
    
    // Lấy conversation history
    const historyResult = await pool.query(
      `SELECT speaker, text_content, turn_number
       FROM scenario_conversations
       WHERE session_id = $1
       ORDER BY turn_number
       LIMIT 10`,
      [sessionId]
    );
    
    const conversationHistory = historyResult.rows.map(row => ({
      speaker: row.speaker,
      text_content: row.text_content,
      turn_number: row.turn_number
    }));
    
    const scenarioContext = {
      title: session.title,
      description: session.description,
      task: session.task,
      completion_criteria: session.completion_criteria,
      characters: [{
        name: session.character_name || "Assistant",
        role: session.character_role || "assistant"
      }]
    };
    
    // Gọi AI training model để tạo gợi ý
    const hintTraining = await getTrainingDataFromPython('scenario_hint', {
      scenario_context: scenarioContext,
      conversation_history: conversationHistory,
      current_situation: "Learner needs to respond but doesn't know what to say"
    });
    
    let systemPrompt;
    let model = "openai/gpt-4o-mini";
    let temperature = 0.7;
    let maxTokens = 300;
    
    if (hintTraining && hintTraining.system_prompt) {
      systemPrompt = hintTraining.system_prompt;
      model = hintTraining.model || model;
      temperature = hintTraining.temperature || temperature;
      maxTokens = hintTraining.max_tokens || maxTokens;
    } else {
      // Fallback
      systemPrompt = `Create a helpful hint for the learner in this scenario: ${session.title}. Provide an English response they could say and Vietnamese translation. Return JSON format with hint_english and hint_vietnamese.`;
    }
    
    const response = await aiService.callOpenRouter(
      [{ role: "user", content: systemPrompt }],
      {
        model: model,
        temperature: temperature,
        max_tokens: maxTokens
      }
    );
    
    const content = response.choices?.[0]?.message?.content || "{}";
    let hintData;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      hintData = JSON.parse(jsonStr);
    } catch (err) {
      console.error("❌ Error parsing hint response:", err);
      hintData = {
        hint_english: "I'm here to help. What would you like to say?",
        hint_vietnamese: "Tôi ở đây để giúp bạn. Bạn muốn nói gì?",
        context: "General helpful response"
      };
    }
    
    // Trừ 15 điểm mỗi lần dùng gợi ý
    const currentScore = parseFloat(session.score || 100);
    const newScore = Math.max(0, currentScore - 15);
    const hintsUsed = parseInt(session.hints_used || 0) + 1;
    
    await pool.query(
      `UPDATE scenario_sessions 
       SET score = $1, hints_used = $2
       WHERE id = $3`,
      [newScore, hintsUsed, sessionId]
    );
    
    return {
      hint_english: hintData.hint_english || hintData.hintEnglish || "",
      hint_vietnamese: hintData.hint_vietnamese || hintData.hintVietnamese || "",
      context: hintData.context || "",
      current_score: newScore,
      hints_used: hintsUsed
    };
  } catch (err) {
    console.error("❌ Error getting hint:", err);
    throw err;
  }
}

/**
 * Chấm điểm cuối cùng cho scenario
 * Dựa trên: độ hợp lý, khả năng phản xạ, phát âm, và số lần dùng gợi ý
 */
export async function evaluateFinalScore(sessionId, pronunciationScore = null) {
  try {
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
    
    // Lấy toàn bộ conversation history
    const historyResult = await pool.query(
      `SELECT speaker, text_content, turn_number
       FROM scenario_conversations
       WHERE session_id = $1
       ORDER BY turn_number`,
      [sessionId]
    );
    
    const conversationHistory = historyResult.rows.map(row => ({
      speaker: row.speaker,
      text_content: row.text_content,
      turn_number: row.turn_number
    }));
    
    const scenarioContext = {
      title: session.title,
      description: session.description,
      task: session.task,
      completion_criteria: session.completion_criteria,
      characters: [{
        name: session.character_name || "Assistant",
        role: session.character_role || "assistant"
      }]
    };
    
    const hintsUsed = parseInt(session.hints_used || 0);
    
    // Gọi AI training model để chấm điểm
    const scoringTraining = await getTrainingDataFromPython('scenario_scoring', {
      scenario_context: scenarioContext,
      conversation_history: conversationHistory,
      hints_used: hintsUsed,
      pronunciation_score: pronunciationScore
    });
    
    let systemPrompt;
    let model = "openai/gpt-4o";
    let temperature = 0.5;
    let maxTokens = 500;
    
    if (scoringTraining && scoringTraining.system_prompt) {
      systemPrompt = scoringTraining.system_prompt;
      model = scoringTraining.model || model;
      temperature = scoringTraining.temperature || temperature;
      maxTokens = scoringTraining.max_tokens || maxTokens;
    } else {
      // Fallback
      systemPrompt = `Evaluate the learner's performance in this scenario. Return JSON with reasonableness_score, reflex_score, pronunciation_score, independence_score, base_score, hints_penalty, final_score, and feedback.`;
    }
    
    const response = await aiService.callOpenRouter(
      [{ role: "user", content: systemPrompt }],
      {
        model: model,
        temperature: temperature,
        max_tokens: maxTokens
      }
    );
    
    const content = response.choices?.[0]?.message?.content || "{}";
    let scoreData;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      scoreData = JSON.parse(jsonStr);
    } catch (err) {
      console.error("❌ Error parsing score response:", err);
      // Fallback scoring
      scoreData = {
        reasonableness_score: 30,
        reflex_score: 20,
        pronunciation_score: pronunciationScore ? Math.round(pronunciationScore / 5) : 15,
        independence_score: Math.max(0, 10 - (hintsUsed * 2)),
        base_score: 75,
        hints_penalty: hintsUsed * 15,
        final_score: Math.max(0, 75 - (hintsUsed * 15)),
        feedback: "Good effort! Keep practicing to improve your conversation skills."
      };
    }
    
    const finalScore = Math.max(0, Math.min(100, scoreData.final_score || 0));
    
    // Cập nhật session với điểm cuối cùng
    await pool.query(
      `UPDATE scenario_sessions 
       SET score = $1, final_score = $2, scoring_details = $3
       WHERE id = $4`,
      [finalScore, finalScore, JSON.stringify(scoreData), sessionId]
    );
    
    // Lưu vào practice_history
    await pool.query(
      `INSERT INTO practice_history (
        learner_id, practice_type, average_score, total_score, 
        practice_date, duration_minutes
      ) VALUES ($1, 'scenario', $2, $2, NOW(), EXTRACT(EPOCH FROM (NOW() - (SELECT created_at FROM scenario_sessions WHERE id = $3))) / 60)
      ON CONFLICT DO NOTHING`,
      [session.learner_id, finalScore, sessionId]
    );
    
    return {
      reasonableness_score: scoreData.reasonableness_score || 0,
      reflex_score: scoreData.reflex_score || 0,
      pronunciation_score: scoreData.pronunciation_score || 0,
      independence_score: scoreData.independence_score || 0,
      base_score: scoreData.base_score || 0,
      hints_penalty: scoreData.hints_penalty || 0,
      final_score: finalScore,
      feedback: scoreData.feedback || "",
      hints_used: hintsUsed
    };
  } catch (err) {
    console.error("❌ Error evaluating final score:", err);
    throw err;
  }
}

