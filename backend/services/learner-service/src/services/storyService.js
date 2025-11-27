// Learner Service - Story Service
import pool from "../config/db.js";
import { runWhisperX } from "../utils/whisperxRunner.js";
// TODO: Replace with API calls to AI Service
// import * as aiService from "./aiService.js";
// import * as trainedAIService from "./trainedAIService.js";
// import * as learnerAiService from "./learnerAiService.js";
import * as aiServiceClient from "../utils/aiServiceClient.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

/**
 * Tìm project root (đi lên từ learner-service/src/services đến root)
 */
function getProjectRoot() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  // __dirname = backend/services/learner-service/src/services
  // Đi lên 4 cấp: services -> src -> learner-service -> services -> backend
  // .. -> src
  // .. -> learner-service
  // .. -> services
  // .. -> backend ✅
  const backendDir = path.resolve(__dirname, "..", "..", "..", "..");
  
  // Debug: Log để đảm bảo path đúng
  console.log("🔍 getProjectRoot() called from storyService.js:", {
    __dirname: __dirname,
    backendDir: backendDir,
    uploadsDir: path.join(backendDir, "uploads"),
    uploadsExists: fs.existsSync(path.join(backendDir, "uploads"))
  });
  
  return backendDir;
}

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

  // Lấy thông tin user để truyền vào AI context
  const userRes = await pool.query(
    `SELECT u.name, u.email, u.dob, u.role 
     FROM users u
     JOIN learners l ON u.id = l.user_id
     WHERE l.id = $1`,
    [actualLearnerId]
  );
  const userInfo = userRes.rows[0] || {};

  // Tạo session mới
  const result = await pool.query(
    `INSERT INTO story_sessions (learner_id, status, created_at)
     VALUES ($1, 'active', NOW())
     RETURNING *`,
    [actualLearnerId]
  );

  const session = result.rows[0];

  // Tạo initial message từ AI, truyền user info để AI chào bằng tên
  const initialMessage = await generateInitialStoryMessage(userInfo);

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
 * @param {Object} userInfo - Thông tin người dùng {name, email, dob, role}
 */
async function generateInitialStoryMessage(userInfo = {}) {
  const userName = userInfo.name || "bạn";
  const userRole = userInfo.role === 'learner' ? "học viên" : userInfo.role;
  const userDob = userInfo.dob ? new Date(userInfo.dob).toLocaleDateString('vi-VN') : "không rõ";
  
  // Tạo câu chào thông minh dựa trên thông tin user (CHỈ TIẾNG ANH)
  const personalizedGreeting = userInfo.name 
    ? `Hello ${userName}! I'm so happy to meet you. Please tell me your story by speaking into the microphone!`
    : "Hello! I'm your friend. Please tell me your story by speaking into the microphone!";

  const messages = [
    {
      role: "system",
      content: `You are a warm, empathetic friend starting a conversation with a user. 

USER INFORMATION:
- Name: ${userName}
- Role: ${userRole}
- Date of Birth: ${userDob}

IMPORTANT INSTRUCTIONS:
1. ALWAYS greet the user by their name if you have it (${userInfo.name ? `use "${userName}"` : "no name available"})
2. Be warm, genuine, and emotionally present
3. Use natural, everyday language with real emotion
4. Keep it short (1-2 sentences), warm, and inviting
5. If the user's name is available, use it naturally in your greeting
6. CRITICAL: You MUST speak ONLY in English. Do NOT use Vietnamese or any other language. This is an English speaking practice session.
7. Invite them to share their story by speaking into the microphone in English

Generate a personalized greeting in English that makes the user feel welcomed and valued.`
    },
    {
      role: "user",
      content: "Start the conversation with a warm greeting"
    }
  ];

  try {
    const response = await aiServiceClient.callOpenRouter(messages, {
      model: "openai/gpt-4o-mini",
      temperature: 0.9,
      max_tokens: 150
    });

    const aiGreeting = response.choices?.[0]?.message?.content?.trim();
    
    // Nếu AI trả về câu chào hợp lệ, dùng nó
    if (aiGreeting && aiGreeting.length > 10) {
      return aiGreeting;
    }
    
    // Fallback về câu chào đã tạo sẵn
    return personalizedGreeting;
  } catch (err) {
    // Log error with helpful context
    if (err.code === "API_KEY_MISSING" || err.code === "API_KEY_INVALID") {
      console.error("❌ OpenRouter API key issue. Please set OPENROUTER_API_KEY in .env file:", err.message);
    } else if (err.message?.includes("404")) {
      console.warn("⚠️ AI Service not available (404). Using fallback greeting.");
    } else {
      console.error("❌ Error generating initial message:", err.message);
    }
    // Return personalized fallback message
    return personalizedGreeting;
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
    const backendDir = getProjectRoot();
    const localPath = audioUrl.startsWith("/uploads/")
      ? path.join(backendDir, audioUrl)
      : audioUrl;

    console.log("🎤 Starting transcription:", {
      audioUrl: audioUrl,
      backendDir: backendDir,
      localPath: localPath,
      fileExists: fs.existsSync(localPath),
      fileSize: fs.existsSync(localPath) ? fs.statSync(localPath).size : 0,
      audioUrlStartsWithUploads: audioUrl.startsWith("/uploads/")
    });

    if (fs.existsSync(localPath)) {
      try {
        console.log("🔄 Running WhisperX transcription...");
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
        
        console.log("✅ Transcription completed:", {
          hasTranscript: !!transcript,
          transcriptText: transcriptText?.substring(0, 100) || "empty",
          transcriptLength: transcriptText?.length || 0,
          segmentsCount: transcript?.segments?.length || 0
        });
      } catch (err) {
        console.error("❌ Story transcription error:", err);
        console.error("❌ Transcription error details:", {
          message: err.message,
          stack: err.stack
        });
      }
    } else {
      console.error("❌ Audio file not found at path:", localPath);
    }
  } else {
    console.log("⚠️ No audioUrl provided, skipping transcription");
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

  // Lấy thông tin user từ session để AI có context
  const sessionInfo = await pool.query(
    `SELECT ss.learner_id, l.user_id, u.name, u.email, u.dob, u.role
     FROM story_sessions ss
     LEFT JOIN learners l ON ss.learner_id = l.id
     LEFT JOIN users u ON l.user_id = u.id
     WHERE ss.id = $1`,
    [sessionId]
  );

  const userInfo = sessionInfo.rows[0] || null;

  // Tạo AI response với tone đồng cảm, truyền cảm, có thông tin user
  const aiResponse = await generateStoryResponse(userMessage, history.rows.reverse(), userInfo);

  // Lưu user message - đảm bảo tất cả giá trị null là thực sự null, không phải string "null"
  console.log("💾 Saving user message to database:", {
    sessionId,
    hasText: !!text,
    hasAudioUrl: !!audioUrl,
    audioUrl: audioUrl,
    hasTranscript: !!transcript
  });

  const insertResult = await pool.query(
    `INSERT INTO story_conversations 
     (session_id, message_type, text_content, audio_url, transcript, ai_response)
     VALUES ($1, 'user', $2, $3, $4, $5)
     RETURNING id, audio_url, transcript`,
    [
      sessionId, // Integer
      text && text !== "null" ? text : null,
      audioUrl && audioUrl !== "null" ? audioUrl : null,
      transcript ? JSON.stringify(transcript) : null,
      null // User message không có ai_response
    ]
  );

  const savedMessage = insertResult.rows[0];
  
  // PostgreSQL JSONB có thể trả về object hoặc string, cần xử lý cả 2 trường hợp
  let transcriptObj = null;
  if (savedMessage.transcript) {
    if (typeof savedMessage.transcript === 'string') {
      try {
        transcriptObj = JSON.parse(savedMessage.transcript);
      } catch (e) {
        console.warn("⚠️ Failed to parse transcript string:", e);
        transcriptObj = null;
      }
    } else if (typeof savedMessage.transcript === 'object') {
      transcriptObj = savedMessage.transcript; // Đã là object rồi
    }
  }
  
  console.log("✅ User message saved to database:", {
    messageId: savedMessage.id,
    audioUrl: savedMessage.audio_url,
    hasTranscript: !!savedMessage.transcript,
    transcriptType: typeof savedMessage.transcript,
    transcriptLength: transcriptObj?.text?.length || 0
  });
  
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
async function generateStoryResponse(userMessage, history, userInfo = null) {
  // TODO: Replace with API calls to AI Service
  // 1. OPENROUTER LÀ NHÂN TỐ PHẢN HỒI CHÍNH (primary responder)
  const openRouterResponse = await generateStoryResponseFallback(userMessage, history, userInfo);
  
  // 2. LƯU OpenRouter RESPONSE ĐỂ AiESP HỌC (async, không block response)
  // AiESP sẽ lắng nghe và học từ mọi response của OpenRouter
  // Gọi qua API Gateway (async, non-blocking)
  fetch(`http://localhost:${process.env.API_GATEWAY_PORT || 4000}/api/ai/assistant/learn-conversation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userMessage,
      history,
      openRouterResponse,
      userInfo: userInfo ? {
        name: userInfo.name,
        email: userInfo.email,
        dob: userInfo.dob,
        role: userInfo.role
      } : null
    })
  }).catch(err => {
    console.warn("⚠️ Failed to save learning data:", err);
  });
  
  // 3. Gọi AiESP song song để xem nó có thể phản hồi không (không block)
  // Nếu AiESP đã học tốt, có thể dùng trong tương lai
  // Gọi qua API Gateway (async, non-blocking)
  fetch(`http://localhost:${process.env.API_GATEWAY_PORT || 4000}/api/ai/assistant/conversation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: userMessage,
      history,
      userInfo: userInfo ? {
        name: userInfo.name,
        email: userInfo.email,
        dob: userInfo.dob,
        role: userInfo.role
      } : null
    })
  })
    .then(res => res.json())
    .then(aiESPResponse => {
      if (aiESPResponse && aiESPResponse.response && aiESPResponse.response.trim().length > 0) {
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
async function generateStoryResponseFallback(userMessage, history, userInfo = null) {
  // Kiểm tra OpenRouter API key trước
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("❌ OPENROUTER_API_KEY is not set in .env file");
    return "I'm sorry, but I'm having trouble connecting right now. Please check the API configuration.";
  }
  
  // Tạo user context string nếu có thông tin user
  let userContext = '';
  if (userInfo) {
    const userDetails = [];
    if (userInfo.name) userDetails.push(`Name: ${userInfo.name}`);
    if (userInfo.dob) {
      const age = new Date().getFullYear() - new Date(userInfo.dob).getFullYear();
      userDetails.push(`Age: approximately ${age} years old`);
    }
    if (userInfo.role) userDetails.push(`Role: ${userInfo.role}`);
    if (userDetails.length > 0) {
      userContext = `\n\nUSER CONTEXT (use this to personalize your responses naturally):\n${userDetails.join('\n')}\nUse this information to make the conversation more personal and relevant, but don't mention it directly unless it's natural.`;
    }
  }
  
  // Tạo prompt ngắn gọn nhưng đầy đủ để phản hồi nhanh
  const systemPrompt = `You're a real friend—warm, genuine, and emotionally present. Speak like a HUMAN, not a robot. Use natural, everyday language with real emotion.${userContext}

CRITICAL LANGUAGE RULE:
- You MUST speak ONLY in English. This is an English speaking practice session.
- Do NOT use Vietnamese, Chinese, or any other language. Only English.
- Even if the user speaks Vietnamese, you respond in English to help them practice.

CORE PRINCIPLES:
- Talk like you're texting a close friend—casual, real, heartfelt
- Feel WITH them, not just about them
- Use natural human expressions: "Oh no...", "That's rough", "I get it", "Aw, that's amazing!"
- Vary your language—don't repeat the same phrases
- Be spontaneous—let your words flow naturally
- Keep it SHORT (1-3 sentences max) for quick, natural responses
- ALWAYS respond in English only

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
    const response = await aiServiceClient.callOpenRouter(
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
      const backendDir = getProjectRoot();
      const pythonScript = path.join(backendDir, 'ai_models', 'comprehensiveAITrainer.py');
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

