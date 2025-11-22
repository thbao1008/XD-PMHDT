// backend/src/services/storyService.js
import pool from "../config/db.js";
import { runWhisperX } from "../utils/whisperxRunner.js";
import * as aiService from "./aiService.js";
import * as trainedAIService from "./trainedAIService.js";
import * as learnerAiService from "./learnerAiService.js";
import path from "path";
import fs from "fs";

/**
 * Tạo session mới cho story mode
 */
export async function createStorySession(learnerId, userId) {
  // Nếu có user_id, lookup learner_id
  let actualLearnerId = learnerId;
  if (!actualLearnerId && userId) {
    const learnerRes = await pool.query(
      `SELECT id FROM learners WHERE user_id = $1`,
      [userId]
    );
    if (learnerRes.rows[0]) {
      actualLearnerId = learnerRes.rows[0].id;
    }
  }

  if (!actualLearnerId) {
    throw new Error("Invalid learner_id or user_id");
  }

  // Tạo session mới
  const result = await pool.query(
    `INSERT INTO story_sessions (learner_id, status, created_at)
     VALUES ($1, 'active', NOW())
     RETURNING *`,
    [actualLearnerId]
  );

  const session = result.rows[0];

  // Tạo initial message từ AI
  const initialMessage = await generateInitialStoryMessage();

  // Lưu initial message vào conversation
  await pool.query(
    `INSERT INTO story_conversations 
     (session_id, message_type, text_content, ai_response)
     VALUES ($1, 'ai', $2, $2)`,
    [session.id, initialMessage]
  );

  return {
    id: session.id,
    learner_id: session.learner_id,
    status: session.status,
    created_at: session.created_at,
    initial_message: initialMessage
  };
}

/**
 * Tạo initial message cho story session
 */
async function generateInitialStoryMessage() {
  const messages = [
    {
      role: "system",
      content: `You are a warm, empathetic friend starting a conversation. Greet the user warmly and invite them to share their story. Keep it short (1-2 sentences), warm, and inviting. Use simple English.`
    },
    {
      role: "user",
      content: "Start the conversation"
    }
  ];

  try {
    const response = await aiService.callOpenRouter(messages, {
      model: "openai/gpt-4o-mini",
      temperature: 0.9,
      max_tokens: 100
    });

    return response.choices?.[0]?.message?.content || 
           "Hello! I'm your friend. Please tell me your story by speaking into the microphone!";
  } catch (err) {
    // Log error with helpful context
    if (err.code === "API_KEY_MISSING" || err.code === "API_KEY_INVALID") {
      console.error("❌ OpenRouter API key issue. Please set OPENROUTER_API_KEY in .env file:", err.message);
    } else {
      console.error("❌ Error generating initial message:", err.message);
    }
    // Return fallback message
    return "Hello! I'm your friend. Please tell me your story by speaking into the microphone!";
  }
}

/**
 * Xử lý message trong story mode
 */
export async function processStoryMessage(sessionId, text, audioUrl) {
  // Validate sessionId là integer
  if (!sessionId || typeof sessionId !== 'number' || isNaN(sessionId)) {
    throw new Error("Invalid sessionId: must be a valid integer");
  }

  let transcript = null;
  let transcriptText = "";

  // Nếu có audio, transcribe
  if (audioUrl) {
    const localPath = audioUrl.startsWith("/uploads/")
      ? path.join(process.cwd(), audioUrl)
      : audioUrl;

    if (fs.existsSync(localPath)) {
      try {
        const { json: transcriptJson } = await runWhisperX(localPath, {
          model: "base",
          computeType: "float32"
        });
        transcript = transcriptJson;
        transcriptText =
          transcript.text ||
          (transcript.segments || [])
            .map((s) => s.text || "")
            .join(" ");
      } catch (err) {
        console.error("❌ Story transcription error:", err);
      }
    }
  }

  const userMessage = text || transcriptText;

  // Lấy conversation history
  const history = await pool.query(
    `SELECT * FROM story_conversations 
     WHERE session_id = $1 
     ORDER BY created_at DESC 
     LIMIT 10`,
    [sessionId]
  );

  // Tạo AI response với tone đồng cảm, truyền cảm
  const aiResponse = await generateStoryResponse(userMessage, history.rows.reverse());

  // Lưu user message - đảm bảo tất cả giá trị null là thực sự null, không phải string "null"
  await pool.query(
    `INSERT INTO story_conversations 
     (session_id, message_type, text_content, audio_url, transcript, ai_response)
     VALUES ($1, 'user', $2, $3, $4, $5)`,
    [
      sessionId, // Integer
      text && text !== "null" ? text : null,
      audioUrl && audioUrl !== "null" ? audioUrl : null,
      transcript ? JSON.stringify(transcript) : null,
      null // User message không có ai_response
    ]
  );
  
  // Lưu AI response như một message riêng
  if (aiResponse) {
    await pool.query(
      `INSERT INTO story_conversations 
       (session_id, message_type, text_content, ai_response)
       VALUES ($1, 'ai', $2, $2)`,
      [sessionId, aiResponse]
    );
  }

  return {
    response: aiResponse,
    transcript: transcriptText,
    transcriptJson: transcript ? transcript : null // Trả về full transcript JSON với words
  };
}

/**
 * Tạo AI response cho story mode - OpenRouter là nhân tố chính, AiESP học tập
 * AiESP sẽ tiếp tục học từ mọi response của OpenRouter để có sự phán đoán logic tốt hơn
 */
async function generateStoryResponse(userMessage, history) {
  // Import assistantAIService
  const assistantAIService = await import('./assistantAIService.js');
  
  // 1. OPENROUTER LÀ NHÂN TỐ PHẢN HỒI CHÍNH (primary responder)
  const openRouterResponse = await generateStoryResponseFallback(userMessage, history);
  
  // 2. LƯU OpenRouter RESPONSE ĐỂ AiESP HỌC (async, không block response)
  // AiESP sẽ lắng nghe và học từ mọi response của OpenRouter
  assistantAIService.learnFromOpenRouterConversation(
    userMessage,
    history,
    openRouterResponse
  ).catch(err => {
    console.warn("⚠️ Failed to save learning data:", err);
  });
  
  // 3. Gọi AiESP song song để xem nó có thể phản hồi không (không block)
  // Nếu AiESP đã học tốt, có thể dùng trong tương lai
  assistantAIService.generateConversationResponse(userMessage, history)
    .then(aiESPResponse => {
      if (aiESPResponse && aiESPResponse.trim().length > 0) {
        // Log để monitoring - AiESP đang học và có thể phản hồi
        console.log(`📚 AiESP đang học và có thể phản hồi (accuracy sẽ được cải thiện)`);
      }
    })
    .catch(err => {
      // Không cần xử lý, AiESP đang học
    });
  
  return openRouterResponse;
}

/**
 * Fallback cho story response - AI nói truyền cảm, đồng cảm, TỰ NHIÊN NHƯ CON NGƯỜI
 */
async function generateStoryResponseFallback(userMessage, history) {
  // Kiểm tra OpenRouter API key trước
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("❌ OPENROUTER_API_KEY is not set in .env file");
    return "I'm sorry, but I'm having trouble connecting right now. Please check the API configuration.";
  }
  // Tạo prompt ngắn gọn nhưng đầy đủ để phản hồi nhanh
  const systemPrompt = `You're a real friend—warm, genuine, and emotionally present. Speak like a HUMAN, not a robot. Use natural, everyday language with real emotion.

CORE PRINCIPLES:
- Talk like you're texting a close friend—casual, real, heartfelt
- Feel WITH them, not just about them
- Use natural human expressions: "Oh no...", "That's rough", "I get it", "Aw, that's amazing!"
- Vary your language—don't repeat the same phrases
- Be spontaneous—let your words flow naturally
- Keep it SHORT (1-3 sentences max) for quick, natural responses

NATURAL HUMAN LANGUAGE EXAMPLES:
- Instead of "I understand your feelings" → "I totally get that" or "That makes so much sense"
- Instead of "That must be difficult" → "That's really tough" or "Oh man, that's hard"
- Instead of "I'm here for you" → "I'm right here with you" or "You're not alone in this"
- Use contractions: "I'm", "you're", "that's", "it's" (more natural)
- Use casual connectors: "like", "you know", "I mean" (sparingly, naturally)
- Express real reactions: "Wow!", "Oh no!", "That's awesome!", "Seriously?"

EMOTIONAL VARIETY (Don't be repetitive):
- Sadness: "Oh no... that's really hard", "I'm so sorry you're going through this", "That sounds really painful"
- Anxiety: "I know that feeling", "That's totally understandable", "It's okay to feel nervous"
- Joy: "That's amazing!", "I'm so happy for you!", "That's incredible!"
- Confusion: "That's a lot to process", "I can see why that's confusing", "That makes sense"

RESPONSE STYLE:
- 1-3 sentences MAX (for speed and naturalness)
- Start with emotional acknowledgment
- Ask ONE simple, open question if needed
- Use natural pauses: "..." when thinking
- Be genuine—don't overthink it

${history.length > 0 ? `Previous: ${history.slice(-1).map((h) => 
  `User: ${h.text_content || "[Audio]"} | You: ${h.ai_response || ""}`
).join("\n")}` : ''}

User: "${userMessage}"

Respond in 1-2 sentences. Be natural, warm, HUMAN.`;

  try {
    const response = await aiService.callOpenRouter(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      { 
        model: "openai/gpt-4o-mini", // Fast model
        temperature: 0.95, // Higher for natural variation
        max_tokens: 100, // Rất ngắn để phản hồi nhanh (1-2 câu)
        stream: false // Không stream để đợi response nhanh hơn
      }
    );

    let aiResponse = response.choices?.[0]?.message?.content || "I understand... Thank you for sharing. How are you feeling about this?";
    
    // Đảm bảo response là tiếng Anh và tự nhiên, ấm áp
    if (!aiResponse || aiResponse.trim().length === 0) {
      aiResponse = "I'm here to listen... Please continue.";
    }
    
    // Clean up response - remove any markdown or extra formatting
    aiResponse = aiResponse.trim();
    
    return aiResponse;
  } catch (err) {
    // Log error with helpful context
    if (err.code === "API_KEY_MISSING" || err.code === "API_KEY_INVALID") {
      console.error("❌ OpenRouter API key issue. Please set OPENROUTER_API_KEY in .env file:", err.message);
    } else {
      console.error("❌ Error generating story response:", err.message);
    }
    // Return fallback response
    return "I understand... Thank you for sharing with me. How are you feeling about this?";
  }
}

/**
 * Helper function để gọi Python trainer
 */
async function getTrainingDataFromPython(trainingType, options = {}) {
  try {
    const { spawn } = await import('child_process');
    const { promisify } = await import('util');
    
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(process.cwd(), 'backend', 'ai_models', 'comprehensiveAITrainer.py');
      const args = [pythonScript, trainingType, JSON.stringify(options)];
      
      const python = spawn('python', args, {
        cwd: process.cwd(),
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });
      
      let stdout = '';
      let stderr = '';
      
      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      python.on('close', (code) => {
        if (code !== 0) {
          console.error(`Python trainer exited with code ${code}:`, stderr);
          resolve(null);
          return;
        }
        
        try {
          // Extract JSON from stdout (có thể có debug messages)
          const jsonMatch = stdout.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            resolve(result);
          } else {
            resolve(null);
          }
        } catch (err) {
          console.error("❌ Error parsing Python trainer output:", err);
          resolve(null);
        }
      });
    });
  } catch (err) {
    console.error("❌ Error calling Python trainer:", err);
    return null;
  }
}

