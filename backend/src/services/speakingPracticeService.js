<<<<<<< Current (Your changes)
// backend/src/services/speakingPracticeService.js
import pool from "../config/db.js";
import { runWhisperX } from "../utils/whisperxRunner.js";
import * as learnerAiService from "./learnerAiService.js";
import * as aiService from "./aiService.js";
import * as trainedAIService from "./trainedAIService.js";
import path from "path";
import fs from "fs";

// QUAN TRỌNG: Không còn hardcoded prompts
// Tất cả prompts được generate bởi AI trainer trong ai_models/comprehensiveAITrainer.py
// Training data nằm trong ai_models/promptSamples.json

/**
 * Tính thời gian dựa trên độ dài và độ phức tạp của text
 * Dựa trên tốc độ nói của người giỏi tiếng Anh: ~150-200 từ/phút
 * Thêm buffer 20% cho người học
 */
function calculateTimeLimit(text, level) {
  if (!text) return 30;
  
  // Đếm số từ
  const words = text.trim().split(/\s+/).length;
  
  // Tốc độ nói (từ/giây)
  // Level 1: 2 từ/giây (120 từ/phút) - chậm hơn
  // Level 2: 2.5 từ/giây (150 từ/phút) - trung bình
  // Level 3: 3 từ/giây (180 từ/phút) - nhanh hơn
  const wordsPerSecond = level === 1 ? 2 : level === 2 ? 2.5 : 3;
  
  // Thời gian cơ bản
  let baseTime = words / wordsPerSecond;
  
  // Thêm buffer 20% cho người học
  baseTime = baseTime * 1.2;
  
  // Thêm thời gian tối thiểu và tối đa
  const minTime = level === 1 ? 15 : level === 2 ? 25 : 35;
  const maxTime = level === 1 ? 45 : level === 2 ? 90 : 120;
  
  return Math.max(minTime, Math.min(maxTime, Math.ceil(baseTime)));
}

/**
 * Khởi tạo learning từ các nguồn (chạy một lần khi server start)
 */
export async function initializeAILearning() {
  try {
    // Kiểm tra xem đã học chưa
    const existing = await pool.query(
      `SELECT COUNT(*) as count FROM ai_learning_context LIMIT 1`
    );
    
    if (parseInt(existing.rows[0]?.count || 0) === 0) {
      console.log("🤖 Initializing AI learning from available sources...");
      await learnFromAvailableSources();
      console.log("✅ AI learning initialized");
    }
  } catch (err) {
    console.error("❌ Error initializing AI learning:", err);
  }
}

/**
 * Tạo session mới cho luyện nói
 */
export async function createPracticeSession(learnerId, level) {
  // Đảm bảo AI đã học từ các nguồn
  await initializeAILearning();
  
  const result = await pool.query(
    `INSERT INTO speaking_practice_sessions (learner_id, level, mode, status)
     VALUES ($1, $2, 'practice', 'active')
     RETURNING *`,
    [learnerId, level]
  );
  return result.rows[0];
}

/**
 * Tạo session mới cho Tell me your story
 */
export async function createStorySession(learnerId) {
  const result = await pool.query(
    `INSERT INTO speaking_practice_sessions (learner_id, level, mode, status)
     VALUES ($1, 1, 'story', 'active')
     RETURNING *`,
    [learnerId]
  );
  return result.rows[0];
}

/**
 * AI tự học từ các nguồn có sẵn (scenarios, topics, etc.)
 */
async function learnFromAvailableSources() {
  try {
    // Học từ scenarios
    const scenarios = await pool.query(
      `SELECT id, vocabulary, initial_prompt, difficulty_level 
       FROM speaking_scenarios 
       WHERE vocabulary IS NOT NULL 
       LIMIT 20`
    );

    for (const scenario of scenarios.rows) {
      if (scenario.vocabulary && scenario.initial_prompt) {
        // Lưu vào learning context
        try {
          // Đảm bảo vocabulary là JSON hợp lệ
          let vocabularyJson = scenario.vocabulary;
          
          // Nếu đã là object (từ JSONB), convert sang JSON string
          if (typeof vocabularyJson === 'object' && vocabularyJson !== null) {
            vocabularyJson = JSON.stringify(vocabularyJson);
          } else if (typeof vocabularyJson === 'string') {
            // Nếu là string, kiểm tra xem có phải JSON hợp lệ không
            try {
              JSON.parse(vocabularyJson);
              // Nếu parse được, giữ nguyên string
            } catch (e) {
              // Nếu không parse được, bỏ qua vocabulary
              vocabularyJson = null;
            }
          } else {
            vocabularyJson = null;
          }
          
          await pool.query(
            `INSERT INTO ai_learning_context (source_type, source_id, content, vocabulary, level)
             VALUES ('scenario', $1, $2, $3::jsonb, $4)
             ON CONFLICT (source_type, source_id, content) DO NOTHING`,
            [
              scenario.id || null,
              scenario.initial_prompt,
              vocabularyJson,
              scenario.difficulty_level || 1
            ]
          );
        } catch (err) {
          // Ignore duplicate errors và conflict errors
          if (!err.message.includes('duplicate') && 
              !err.message.includes('conflict') && 
              err.code !== '23505') {
            console.error("Error inserting learning context:", err.message);
          }
        }
      }
    }

    // QUAN TRỌNG: Không còn học từ hardcoded prompts
    // AI sẽ học từ promptSamples.json trong ai_models/comprehensiveAITrainer.py
    // và từ sampleTranscripts.json

    // Học từ sampleTranscripts.json nếu có
    try {
      const sampleTranscriptsPath = path.join(process.cwd(), "backend", "ai_models", "sampleTranscripts.json");
      if (fs.existsSync(sampleTranscriptsPath)) {
        const sampleData = JSON.parse(fs.readFileSync(sampleTranscriptsPath, "utf-8"));
        for (const item of sampleData) {
          if (item.topic && item.text) {
            const words = item.text.split(/\s+/).length;
            // Xác định level dựa trên độ dài
            const estimatedLevel = words <= 15 ? 1 : words <= 30 ? 2 : 3;
            
            try {
              await pool.query(
                `INSERT INTO ai_learning_context (source_type, source_id, content, level, metadata)
                 VALUES ('sample_transcripts', NULL, $1, $2, $3)
                 ON CONFLICT (source_type, source_id, content) DO NOTHING`,
                [
                  item.text,
                  estimatedLevel,
                  JSON.stringify({ topic: item.topic, word_count: words, source: 'sampleTranscripts' })
                ]
              );
            } catch (err) {
              // Ignore duplicate errors
              if (!err.message.includes('duplicate') && !err.message.includes('conflict')) {
                console.error("Error inserting sample transcript:", err);
              }
            }
          }
        }
        console.log(`✅ Loaded ${sampleData.length} sample transcripts into learning context`);
      }
    } catch (err) {
      console.error("❌ Error loading sampleTranscripts:", err);
    }
  } catch (err) {
    console.error("❌ Error learning from sources:", err);
  }
}

// Danh sách topics phong phú từ nhiều nguồn
const TOPIC_THEMES = {
  1: [
    "Self-introduction", "Family", "Daily routine", "Food", "Colors", "Numbers", 
    "Weather", "Pets", "School", "Friends", "Hobbies", "Sports", "Shopping",
    "Transportation", "Home", "Clothing", "Body parts", "Time", "Days of week"
  ],
  2: [
    "Travel", "Work", "Education", "Music", "Movies", "Books", "Technology",
    "Health", "Culture", "Future plans", "Dreams", "Art", "Photography",
    "Cooking", "Fitness", "Relationships", "Career", "Language learning",
    "Entertainment", "Social media", "Environment", "Holidays", "Festivals"
  ],
  3: [
    "Artificial Intelligence", "Climate change", "Globalization", "Philosophy",
    "Psychology", "Economics", "Politics", "Science", "Research", "Innovation",
    "Sustainability", "Ethics", "Society", "History", "Literature", "Mathematics",
    "Physics", "Chemistry", "Biology", "Astronomy", "Cybersecurity", "Data science",
    "Machine learning", "AI ethics", "Public health", "Mental health", "Nutrition"
  ]
};

/**
 * Lấy topics và prompts đã dùng trong session để tránh lặp lại
 */
async function getUsedTopicsInSession(sessionId, level) {
  try {
    if (!sessionId) return { topics: [], prompts: [] };
    
    const usedRounds = await pool.query(
      `SELECT spr.prompt, agp.topic 
       FROM speaking_practice_rounds spr
       LEFT JOIN ai_generated_prompts agp ON spr.prompt = agp.prompt_text
       WHERE spr.session_id = $1
       ORDER BY spr.round_number DESC
       LIMIT 10`,
      [sessionId]
    );
    
    const topics = usedRounds.rows.map(r => r.topic).filter(Boolean);
    const prompts = usedRounds.rows.map(r => r.prompt).filter(Boolean);
    
    return { topics, prompts };
  } catch (err) {
    console.error("Error getting used topics:", err);
    return { topics: [], prompts: [] };
  }
}

/**
 * Gọi Python continuous learning engine để phân tích và cá nhân hóa
 */
async function getPersonalizationContext(learnerId, sessionId) {
  try {
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);
    
    const enginePath = path.join(process.cwd(), "backend", "ai_models", "continuousLearningEngine.py");
    
    // Lấy dữ liệu session để phân tích
    const rounds = await pool.query(
      `SELECT score, prompt, time_taken, analysis 
       FROM speaking_practice_rounds 
       WHERE session_id = $1 AND score > 0
       ORDER BY round_number`,
      [sessionId]
    );
    
    if (rounds.rows.length === 0) {
      return null;
    }
    
    // Chuẩn bị data cho continuous learning
    const sessionData = {
      scores: rounds.rows.map(r => parseFloat(r.score) || 0),
      topics: rounds.rows.map(r => {
        try {
          const analysis = typeof r.analysis === 'string' ? JSON.parse(r.analysis) : r.analysis;
          return analysis?.topic || 'general';
        } catch {
          return 'general';
        }
      }),
      durations: rounds.rows.map(r => parseInt(r.time_taken) || 0),
      strengths: rounds.rows.map(r => {
        try {
          const analysis = typeof r.analysis === 'string' ? JSON.parse(r.analysis) : r.analysis;
          return analysis?.strengths || [];
        } catch {
          return [];
        }
      }),
      improvements: rounds.rows.map(r => {
        try {
          const analysis = typeof r.analysis === 'string' ? JSON.parse(r.analysis) : r.analysis;
          return analysis?.improvements || [];
        } catch {
          return [];
        }
      })
    };
    
    const sessionDataJson = JSON.stringify(sessionData).replace(/"/g, '\\"');
    const command = `python "${enginePath}" analyze ${learnerId} "${sessionDataJson}"`;
    
    const { stdout } = await execAsync(command);
    const result = JSON.parse(stdout);
    
    // Lấy personalization context từ kết quả
    const personalization = result.personalization_context || {};
    const analysis = result.analysis || {};
    
    // Tạo personalization context từ analysis
    return {
      recommended_level: analysis.adaptive_strategy?.recommended_level || personalization.recommended_level,
      preferred_topics: analysis.strength_areas?.top_strengths || personalization.preferred_topics || [],
      focus_areas: analysis.improvement_areas?.priority_improvements || personalization.focus_areas || [],
      learning_style: analysis.adaptive_strategy?.learning_style || personalization.learning_style || 'balanced',
      pace: analysis.adaptive_strategy?.pace_adjustment || personalization.pace || 'normal'
    };
  } catch (err) {
    console.error("❌ Error getting personalization context:", err);
    return null;
  }
}

/**
 * Gọi Python comprehensive trainer để tạo training data thông minh
 */
async function getTrainingDataFromPython(trainingType, options = {}) {
  return new Promise(async (resolve) => {
    try {
      const { spawn } = await import("child_process");
      const trainerPath = path.join(process.cwd(), "backend", "ai_models", "comprehensiveAITrainer.py");
      
      // Tạo data object để gửi qua stdin
      let stdinData = { training_type: trainingType };
      
      if (trainingType === 'prompt_generator') {
        // Lấy topics và challenges từ database
        const topics = await pool.query(`SELECT id, title, description, level FROM topics ORDER BY RANDOM() LIMIT 20`);
        const challenges = await pool.query(`SELECT id, title, description, level, topic_id, type FROM challenges ORDER BY RANDOM() LIMIT 20`);
        
        const topicsJson = JSON.stringify(topics.rows);
        const challengesJson = JSON.stringify(challenges.rows);
        
        // Lấy personalization context nếu có learnerId
        let personalizationContext = null;
        if (options.learnerId && options.sessionId) {
          personalizationContext = await getPersonalizationContext(options.learnerId, options.sessionId);
        }
        
        stdinData = {
          training_type: 'prompt_generator',
          level: options.level || 2,
          used_topics: options.usedTopics || [],
          used_prompts: options.usedPrompts || [],
          topics_json: topicsJson,
          challenges_json: challengesJson,
          learner_id: options.learnerId || null,
          personalization_context: personalizationContext
        };
      } else if (trainingType === 'conversation_ai') {
        stdinData = {
          training_type: 'conversation_ai',
          topic: options.topic || null,
          history: options.history || []
        };
      } else if (trainingType === 'quick_analysis') {
        stdinData = {
          training_type: 'quick_analysis',
          transcript: options.transcript || "",
          expected: options.expected || null,
          level: options.level || 2
        };
      }
      
<<<<<<< Current (Your changes)
      // Spawn Python process với stdin
      const pythonProcess = spawn('python', [trainerPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
=======
      // Spawn Python process với stdin và set UTF-8 encoding
      const pythonProcess = spawn('python', [trainerPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8'
        }
>>>>>>> Incoming (Background Agent changes)
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
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (err) {
          console.error("❌ Error parsing Python output:", err);
          console.error("Python stdout:", stdout);
          resolve(null); // Return null để fallback
        }
      });
      
      pythonProcess.on('error', (err) => {
        console.error("❌ Error spawning Python process:", err);
        resolve(null); // Return null để fallback
      });
      
      // Gửi data qua stdin
      pythonProcess.stdin.write(JSON.stringify(stdinData));
      pythonProcess.stdin.end();
      
    } catch (err) {
      console.error("❌ Error calling Python trainer:", err);
      resolve(null); // Return null để fallback
    }
  });
}

/**
 * AI tự tạo prompt mới sử dụng Python trainer (đơn giản hóa)
 */
async function generateAIPrompt(level, roundNumber, learnerId = null, sessionId = null) {
  try {
    // Lấy topics và prompts đã dùng trong session để tránh lặp lại
    const { topics: usedTopics, prompts: usedPrompts } = await getUsedTopicsInSession(sessionId, level);
    
    // Lấy personalization context từ continuous learning engine
    let personalizationContext = null;
    if (learnerId && sessionId) {
      personalizationContext = await getPersonalizationContext(learnerId, sessionId);
    }
    
    // Lấy topics và challenges từ database với randomization TRƯỚC khi gọi trainer
    const topics = await pool.query(`SELECT id, title, description, level FROM topics ORDER BY RANDOM() LIMIT 20`);
    const challenges = await pool.query(`SELECT id, title, description, level, topic_id, type FROM challenges ORDER BY RANDOM() LIMIT 20`);
    
    // Gọi OpenRouter với training data từ Python qua trainedAIService
    // trainedAIService sẽ tự động gọi Python trainer với topics/challenges
    const response = await trainedAIService.callTrainedAI(
      'prompt_generator',
      {
        level,
        usedTopics,
        usedPrompts,
        learnerId,
        sessionId,
        topicsJson: JSON.stringify(topics.rows),
        challengesJson: JSON.stringify(challenges.rows),
        personalizationContext
      },
      null, // Messages sẽ được tạo tự động với randomization
      { 
        model: 'openai/gpt-4o-mini', 
        temperature: 1.1, // Temperature cao để đảm bảo đa dạng
        max_tokens: 250 
      }
    );
    
    // Nếu response fail, fallback
    if (!response || !response.choices || !response.choices[0]) {
      console.warn("⚠️ AI response failed, using fallback");
      return await generateAIPromptFallback(level, usedTopics, usedPrompts);
    }

    const content = response.choices?.[0]?.message?.content || "{}";
    let result;
    try {
      result = JSON.parse(content);
    } catch (e) {
      // Nếu không phải JSON, extract
      const promptMatch = content.match(/"suggested_prompt":\s*"([^"]+)"/);
      const topicMatch = content.match(/"topic":\s*"([^"]+)"/);
      result = {
        topic: topicMatch ? topicMatch[1] : usedTopics[0] || "general",
        suggested_prompt: promptMatch ? promptMatch[1] : content.trim().replace(/^["']|["']$/g, ""),
        description: ""
      };
    }

    // Sử dụng suggested_prompt hoặc tạo prompt từ topic
    const finalPrompt = result.suggested_prompt || result.prompt || 
      `Let's talk about ${result.topic || 'something interesting'}.`;

    if (!finalPrompt) {
      throw new Error("Failed to generate prompt");
    }

    // Lưu prompt đã generate vào database
    const wordCount = finalPrompt.split(/\s+/).length;
    const difficultyScore = level === 1 ? 0.3 : level === 2 ? 0.6 : 0.9;

    await pool.query(
      `INSERT INTO ai_generated_prompts 
       (level, prompt_text, topic, word_count, difficulty_score, usage_count)
       VALUES ($1, $2, $3, $4, $5, 1)
       ON CONFLICT (prompt_text) DO UPDATE 
       SET usage_count = ai_generated_prompts.usage_count + 1, 
           last_used_at = NOW(),
           updated_at = NOW()`,
      [
        level,
        finalPrompt,
        result.topic || "general",
        wordCount,
        difficultyScore
      ]
    );

    return finalPrompt;
  } catch (err) {
    console.error("❌ Error generating AI prompt:", err);
    // Fallback về prompts cũ nếu AI fail
    // Fallback: Generate simple prompt with AI
    const fallbackPrompt = `Generate a simple English speaking practice sentence for level ${level} learners. Return only the sentence, no explanation.`;
    try {
      const response = await aiService.callOpenRouter(
        [{ role: "user", content: fallbackPrompt }],
        { model: "openai/gpt-4o-mini", temperature: 1.0, max_tokens: 100 }
      );
      const content = response.choices?.[0]?.message?.content || "";
      return content.trim().replace(/^["']|["']$/g, "") || `Let's practice speaking English. This is level ${level}.`;
    } catch (fallbackErr) {
      const ultimateFallback = {
        1: "Hello, my name is Anna. I am from Vietnam.",
        2: "I enjoy learning English because it helps me communicate with people from different countries.",
        3: "The advancement of technology has significantly transformed how we learn and interact with information in the modern world."
      };
      return ultimateFallback[level] || ultimateFallback[1];
    }
  }
}

/**
 * Fallback method nếu Python trainer không hoạt động (đơn giản hóa)
 */
async function generateAIPromptFallback(level, usedTopics = [], usedPrompts = []) {
  // Đơn giản hóa: chỉ tạo prompt ngắn gọn với AI
  const availableTopics = TOPIC_THEMES[level] || TOPIC_THEMES[1];
  const unusedTopics = availableTopics.filter(t => !usedTopics.includes(t));
  const selectedTopics = unusedTopics.length > 0 
    ? unusedTopics.sort(() => Math.random() - 0.5).slice(0, 3)
    : availableTopics.sort(() => Math.random() - 0.5).slice(0, 3);
  
  const simplePrompt = `Generate a NEW speaking practice sentence for level ${level} English learners.
- Length: ${level === 1 ? '5-15' : level === 2 ? '15-30' : '30-60'} words
- Topic: ${selectedTopics.join(' or ')}
- Avoid: ${usedPrompts.slice(0, 3).join(', ') || 'none'}
- Natural, conversational English

Return JSON: {"prompt": "sentence", "topic": "topic name", "word_count": number}`;

  const response = await aiService.callOpenRouter(
    [{ role: "user", content: simplePrompt }],
    { model: "openai/gpt-4o-mini", temperature: 0.95, max_tokens: 200 }
  );

  const content = response.choices?.[0]?.message?.content || "{}";
  let result;
  try {
    result = JSON.parse(content);
  } catch (e) {
    result = {
      prompt: content.trim().replace(/^["']|["']$/g, ""),
      topic: selectedTopics[0] || "general",
      word_count: content.split(/\s+/).length
    };
  }

  // Nếu vẫn fail, tạo prompt đơn giản nhất
  if (!result.prompt) {
    const levelPrompts = {
      1: "Hello, my name is Anna. I am from Vietnam.",
      2: "I enjoy learning English because it helps me communicate with people from different countries.",
      3: "The advancement of technology has significantly transformed how we learn and interact with information in the modern world."
    };
    return levelPrompts[level] || levelPrompts[1];
  }
  
  return result.prompt;
}

/**
 * Lấy prompt cho vòng nói (ưu tiên AI-generated, đa dạng hóa)
 * QUAN TRỌNG: Luôn tạo prompt MỚI, không reuse prompts đã dùng trong session
 */
export async function getPromptForRound(level, roundNumber, learnerId = null, sessionId = null) {
  try {
    console.log(`🎯 getPromptForRound called: level=${level}, round=${roundNumber}, sessionId=${sessionId}`);
    
    // Lấy topics và prompts đã dùng trong session
    const { topics: usedTopics, prompts: usedPrompts } = await getUsedTopicsInSession(sessionId, level);
    console.log(`📋 Used in session: ${usedPrompts.length} prompts, ${usedTopics.length} topics`);
    
    // QUAN TRỌNG: Luôn generate prompt MỚI thay vì lấy từ database
    // Điều này đảm bảo mỗi round có prompt khác nhau
    console.log(`🔄 Generating NEW prompt for round ${roundNumber}...`);
    const newPrompt = await generateAIPrompt(level, roundNumber, learnerId, sessionId);
    
    // Kiểm tra xem prompt mới có trùng với prompts đã dùng không
    if (usedPrompts.includes(newPrompt)) {
      console.warn(`⚠️ Generated prompt matches used prompt, generating again...`);
      // Generate lại nếu trùng
      const retryPrompt = await generateAIPrompt(level, roundNumber, learnerId, sessionId);
      return retryPrompt;
    }
    
    console.log(`✅ Generated new prompt: "${newPrompt.substring(0, 50)}..."`);
    return newPrompt;
    
    /* OLD LOGIC - Commented out để luôn generate mới
    // Thử lấy từ AI-generated prompts với ưu tiên topics chưa dùng và prompts chưa dùng
    let aiPrompt;
    if (usedPrompts.length > 0) {
      // Nếu có prompts đã dùng, loại bỏ chúng
      aiPrompt = await pool.query(
        `SELECT prompt_text, topic FROM ai_generated_prompts 
         WHERE level = $1 
         AND prompt_text NOT IN (${usedPrompts.map((_, i) => `$${i + 2}`).join(", ")})
         ${usedTopics.length > 0 
           ? `AND (topic NOT IN (${usedTopics.map((_, i) => `$${usedPrompts.length + i + 2}`).join(", ")}) OR topic IS NULL)`
           : ""}
         ORDER BY 
           ${usedTopics.length > 0 
             ? `CASE WHEN topic NOT IN (${usedTopics.map((_, i) => `$${usedPrompts.length + i + 2}`).join(", ")}) THEN 0 ELSE 1 END, `
             : ""}
           usage_count ASC, 
           RANDOM()
         LIMIT 1`,
        [level, ...usedPrompts, ...usedTopics]
      );
    } else if (usedTopics.length > 0) {
      // Chỉ có topics đã dùng
      aiPrompt = await pool.query(
        `SELECT prompt_text, topic FROM ai_generated_prompts 
         WHERE level = $1 
         AND (topic NOT IN (${usedTopics.map((_, i) => `$${i + 2}`).join(", ")}) OR topic IS NULL)
         ORDER BY 
           CASE WHEN topic NOT IN (${usedTopics.map((_, i) => `$${i + 2}`).join(", ")}) THEN 0 ELSE 1 END,
           usage_count ASC, 
           RANDOM()
         LIMIT 1`,
        [level, ...usedTopics]
      );
    } else {
      // Chưa có gì được dùng
      aiPrompt = await pool.query(
        `SELECT prompt_text, topic FROM ai_generated_prompts 
         WHERE level = $1 
         ORDER BY usage_count ASC, RANDOM()
         LIMIT 1`,
        [level]
      );
    }

    // Nếu không tìm thấy prompt với topic mới, tìm bất kỳ
    let selectedPrompt = aiPrompt.rows[0];
    if (!selectedPrompt) {
      const anyPrompt = await pool.query(
        `SELECT prompt_text, topic FROM ai_generated_prompts 
         WHERE level = $1 
         ORDER BY usage_count ASC, RANDOM() 
         LIMIT 1`,
        [level]
      );
      selectedPrompt = anyPrompt.rows[0];
    }

    if (selectedPrompt) {
      // Update usage
      await pool.query(
        `UPDATE ai_generated_prompts 
         SET usage_count = usage_count + 1, last_used_at = NOW()
         WHERE prompt_text = $1`,
        [selectedPrompt.prompt_text]
      );
      return selectedPrompt.prompt_text;
    }

    // Nếu chưa có, generate mới với đa dạng hóa
    return await generateAIPrompt(level, roundNumber, learnerId, sessionId);
    */
  } catch (err) {
    console.error("❌ Error getting prompt:", err);
    // Fallback cuối cùng: tạo prompt đơn giản với AI trực tiếp
    try {
      const fallbackPrompt = `Generate a simple English speaking practice sentence for level ${level} learners. Return only the sentence, no explanation.`;
      const response = await aiService.callOpenRouter(
        [{ role: "user", content: fallbackPrompt }],
        { model: "openai/gpt-4o-mini", temperature: 1.0, max_tokens: 100 }
      );
      const content = response.choices?.[0]?.message?.content || "";
      return content.trim().replace(/^["']|["']$/g, "") || `Let's practice speaking English. This is level ${level}.`;
    } catch (fallbackErr) {
      console.error("❌ Fallback prompt generation failed:", fallbackErr);
      // Ultimate fallback - simple prompts
      const ultimateFallback = {
        1: "Hello, my name is Anna. I am from Vietnam.",
        2: "I enjoy learning English because it helps me communicate with people from different countries.",
        3: "The advancement of technology has significantly transformed how we learn and interact with information in the modern world."
      };
      return ultimateFallback[level] || ultimateFallback[1];
    }
  }
}

/**
 * Lấy time limit cho level và prompt
 */
export function getTimeLimit(level, prompt = "") {
  return calculateTimeLimit(prompt, level);
}

/**
 * Lưu vòng nói (lưu ngay, xử lý ở background)
 */
export async function saveRound(sessionId, roundNumber, audioUrl, timeTaken, promptText = null) {
  const session = await pool.query(
    `SELECT level, learner_id FROM speaking_practice_sessions WHERE id = $1`,
    [sessionId]
  );

  if (!session.rows[0]) {
    throw new Error("Session not found");
  }

  const level = session.rows[0].level;
  const learnerId = session.rows[0].learner_id;
  
  // QUAN TRỌNG: Nếu promptText được truyền từ frontend, dùng nó. Nếu không, fetch mới
  let prompt = promptText;
  if (!prompt) {
    // Fetch prompt mới với sessionId để track used prompts
    prompt = await getPromptForRound(level, roundNumber, learnerId, sessionId);
  }

  // Lưu vào database ngay (chưa có transcript và analysis)
  const result = await pool.query(
    `INSERT INTO speaking_practice_rounds 
     (session_id, round_number, prompt, audio_url, transcript, time_taken, score, analysis)
     VALUES ($1, $2, $3, $4, NULL, $5, 0, NULL)
     RETURNING *`,
    [
      sessionId,
      roundNumber,
      prompt,
      audioUrl,
      timeTaken
    ]
  );

  const roundId = result.rows[0].id;

  // Enqueue job để xử lý transcription và analysis ở background
  try {
    const { enqueue } = await import("../utils/queue.js");
    await enqueue("processSpeakingRound", {
      roundId,
      sessionId,
      audioUrl,
      prompt,
      level,
      time_taken: timeTaken
    });
  } catch (err) {
    console.error("❌ Error enqueueing processing job:", err);
    // Nếu không có queue, xử lý ngay (fallback)
    processRoundInBackground(roundId, audioUrl, prompt, level).catch(err => {
      console.error("❌ Background processing error:", err);
    });
  }

  return result.rows[0];
}

/**
 * Xử lý round ở background (transcription + AI analysis)
 */
async function processRoundInBackground(roundId, audioUrl, prompt, level) {
  const localPath = audioUrl.startsWith("/uploads/")
    ? path.join(process.cwd(), audioUrl)
    : audioUrl;

  let transcript = null;
  if (fs.existsSync(localPath)) {
    try {
      const { json: transcriptJson } = await runWhisperX(localPath, {
        model: "base",
        computeType: "float32"
      });
      transcript = transcriptJson;
    } catch (err) {
      console.error("❌ Transcription error:", err);
      return;
    }
  }

  // Analyze với AI
  let analysis = null;
  let score = 0;
  let feedback = "";
  let errors = [];
  let correctedText = "";

  if (transcript) {
    const transcriptText =
      transcript.text ||
      (transcript.segments || [])
        .map((s) => s.text || "")
        .join(" ");

    try {
      analysis = await analyzePronunciation(transcriptText, prompt, level);
      score = analysis.score || 0;
      feedback = analysis.feedback || "";
      errors = analysis.errors || [];
      correctedText = analysis.corrected_text || "";
    } catch (err) {
      console.error("❌ AI analysis error:", err);
      feedback = "Không thể phân tích. Vui lòng thử lại.";
    }
  }

  // Cập nhật database với kết quả
  await pool.query(
    `UPDATE speaking_practice_rounds 
     SET transcript = $1, score = $2, analysis = $3
     WHERE id = $4`,
    [
      JSON.stringify(transcript),
      score,
      JSON.stringify({
        feedback,
        errors,
        corrected_text: correctedText,
        score
      }),
      roundId
    ]
  );
}

/**
 * Phân tích phát âm với AI sử dụng Python trainer (quick analysis)
 */
async function analyzePronunciation(transcript, expectedText, level, roundId = null, sessionId = null, learnerId = null) {
  try {
    // Gọi Python trainer để tạo quick analysis training
    const trainingData = await getTrainingDataFromPython('quick_analysis', {
      transcript,
      expected: expectedText,
      level
    });
    
    // Nếu Python trainer fail, dùng fallback
    if (!trainingData || !trainingData.system_prompt) {
      return await analyzePronunciationFallback(transcript, expectedText, level);
    }
    
    // Gọi OpenRouter với training data từ Python qua trainedAIService
    const messages = [
      { role: 'user', content: 'Analyze now. Return JSON only.' }
    ];
    
    const response = await trainedAIService.callTrainedAI(
      'quick_analysis',
      {
        transcript,
        expected: expectedText,
        level
      },
      messages,
      { model: 'openai/gpt-4o-mini', temperature: 0.5, max_tokens: 200 }
    );

    const content = response.choices?.[0]?.message?.content || "{}";
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      return await analyzePronunciationFallback(transcript, expectedText, level);
    }
    
    // Lưu quick evaluation vào database
    if (roundId && learnerId) {
      await pool.query(
        `INSERT INTO quick_evaluations 
         (round_id, session_id, learner_id, score, feedback, strengths, improvements)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          roundId,
          sessionId,
          learnerId,
          parsed.score || 5,
          parsed.feedback || "",
          JSON.stringify(parsed.strengths || []),
          JSON.stringify(parsed.improvements || [])
        ]
      );
    }
    
    return {
      score: parsed.score || 5,
      feedback: parsed.feedback || "Good effort!",
      errors: [],
      corrected_text: expectedText,
      strengths: parsed.strengths || [],
      improvements: parsed.improvements || []
    };
  } catch (err) {
    console.error("❌ AI analysis error:", err);
    return await analyzePronunciationFallback(transcript, expectedText, level);
  }
}

/**
 * Fallback cho pronunciation analysis
 */
async function analyzePronunciationFallback(transcript, expectedText, level) {
  const prompt = `Quick analysis. Expected: "${expectedText}". Spoken: "${transcript}". 
Return JSON: {"score": 0-10, "feedback": "brief", "strengths": ["s1"], "improvements": ["i1"]}`;

  try {
    const response = await aiService.callOpenRouter(
      [{ role: "user", content: prompt }],
      { model: "openai/gpt-4o-mini", temperature: 0.5, max_tokens: 200 }
    );

    const content = response.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    return {
      score: parsed.score || 5,
      feedback: parsed.feedback || "Good effort!",
      errors: [],
      corrected_text: expectedText,
      strengths: parsed.strengths || [],
      improvements: parsed.improvements || []
    };
  } catch (err) {
    return {
      score: 5,
      feedback: "Không thể phân tích chi tiết.",
      errors: [],
      corrected_text: expectedText,
      strengths: [],
      improvements: []
    };
  }
}

/**
 * Phân tích tất cả các vòng và tạo tổng kết
 */
export async function analyzeAllRoundsAndSummary(sessionId) {
  // Lấy tất cả các rounds chưa được phân tích
  const rounds = await pool.query(
    `SELECT * FROM speaking_practice_rounds 
     WHERE session_id = $1 
     ORDER BY round_number`,
    [sessionId]
  );

  if (rounds.rows.length === 0) {
    throw new Error("No rounds found");
  }

  // Lấy level từ session
  const session = await pool.query(
    `SELECT level FROM speaking_practice_sessions WHERE id = $1`,
    [sessionId]
  );
  const level = session.rows[0]?.level || 1;

  // Phân tích từng round chưa được phân tích (xử lý song song để nhanh hơn)
  const roundsToProcess = rounds.rows.filter(r => {
    if (r.analysis && r.score > 0) return false;
    if (!r.audio_url) return false;
    const localPath = r.audio_url.startsWith("/uploads/")
      ? path.join(process.cwd(), r.audio_url)
      : r.audio_url;
    return fs.existsSync(localPath);
  });

  // Xử lý song song tối đa 3 rounds cùng lúc để tăng tốc
  const processRound = async (round) => {
    const audioUrl = round.audio_url;
    const localPath = audioUrl.startsWith("/uploads/")
      ? path.join(process.cwd(), audioUrl)
      : audioUrl;

    // Transcribe
    let transcript = null;
    try {
      const { json: transcriptJson } = await runWhisperX(localPath, {
        model: "base",
        computeType: "float32"
      });
      transcript = transcriptJson;
    } catch (err) {
      console.error(`❌ Transcription error for round ${round.round_number}:`, err);
      return;
    }

    // Analyze với AI
    let analysis = null;
    let score = 0;
    let feedback = "";
    let errors = [];
    let correctedText = "";

    if (transcript) {
      const transcriptText =
        transcript.text ||
        (transcript.segments || [])
          .map((s) => s.text || "")
          .join(" ");

      try {
        // Lấy learner_id từ session
        const sessionInfo = await pool.query(
          `SELECT learner_id FROM speaking_practice_sessions WHERE id = $1`,
          [sessionId]
        );
        const learnerId = sessionInfo.rows[0]?.learner_id;
        
        // Sử dụng quick analysis với Python trainer
        analysis = await analyzePronunciation(
          transcriptText, 
          round.prompt, 
          level,
          round.id, // roundId
          sessionId,
          learnerId
        );
        score = analysis.score || 0;
        feedback = analysis.feedback || "";
        errors = analysis.errors || [];
        correctedText = analysis.corrected_text || "";
      } catch (err) {
        console.error(`❌ AI analysis error for round ${round.round_number}:`, err);
        feedback = "Không thể phân tích. Vui lòng thử lại.";
      }
    }

    // Cập nhật database với kết quả
    await pool.query(
      `UPDATE speaking_practice_rounds 
       SET transcript = $1, score = $2, analysis = $3
       WHERE id = $4`,
      [
        JSON.stringify(transcript),
        score,
        JSON.stringify({
          feedback,
          errors,
          corrected_text: correctedText,
          score
        }),
        round.id
      ]
    );
  };

  // Xử lý song song với batch size = 3
  const batchSize = 3;
  for (let i = 0; i < roundsToProcess.length; i += batchSize) {
    const batch = roundsToProcess.slice(i, i + batchSize);
    await Promise.all(batch.map(round => processRound(round)));
  }

  // Sau khi phân tích xong, tạo summary
  return await generateSummary(sessionId);
}

/**
 * Tạo tổng kết sau 10 vòng
 */
export async function generateSummary(sessionId) {
  const rounds = await pool.query(
    `SELECT * FROM speaking_practice_rounds 
     WHERE session_id = $1 
     ORDER BY round_number`,
    [sessionId]
  );

  if (rounds.rows.length === 0) {
    throw new Error("No rounds found");
  }

  const totalScore = rounds.rows.reduce((sum, r) => sum + (parseFloat(r.score) || 0), 0);
  const averageScore = totalScore / rounds.rows.length;

  // Tạo tổng kết với AI (tối ưu cho tốc độ)
  const summaryPrompt = `Summary: ${rounds.rows.length} rounds, avg ${averageScore.toFixed(1)}/10.
Scores: ${rounds.rows.map((r, i) => `R${i+1}:${r.score}`).join(" ")}.

Return JSON only:
{"overall_feedback": "brief", "common_mistakes": ["m1"], "strengths": ["s1"], "improvements": ["i1"], "encouragement": "brief"}`;

  let summaryData = {
    overall_feedback: "Good effort! Keep practicing.",
    common_mistakes: [],
    strengths: [],
    improvements: [],
    encouragement: "You're making progress!"
  };

  try {
    const response = await aiService.callOpenRouter(
      [{ role: "user", content: summaryPrompt }],
      { 
        model: "openai/gpt-4o-mini", 
        temperature: 0.5, // Giảm temperature
        max_tokens: 400 // Giảm max_tokens
      }
    );

    const content = response.choices?.[0]?.message?.content || "{}";
    summaryData = JSON.parse(content);
  } catch (err) {
    console.error("❌ Summary generation error:", err);
  }

  // Update session
  await pool.query(
    `UPDATE speaking_practice_sessions 
     SET status = 'completed',
         total_score = $1,
         average_score = $2,
         summary = $3,
         completed_at = NOW()
     WHERE id = $4`,
    [totalScore, averageScore, JSON.stringify(summaryData), sessionId]
  );

  // Lưu vào practice_history để tracking tiến độ
  const sessionInfo = await pool.query(
    `SELECT learner_id, level, created_at, completed_at 
     FROM speaking_practice_sessions 
     WHERE id = $1`,
    [sessionId]
  );
  
  if (sessionInfo.rows[0]) {
    const session = sessionInfo.rows[0];
    const duration = session.completed_at && session.created_at
      ? Math.round((new Date(session.completed_at) - new Date(session.created_at)) / 60000)
      : null;
    
    // Lấy strengths và improvements từ quick evaluations
    const evaluations = await pool.query(
      `SELECT strengths, improvements FROM quick_evaluations 
       WHERE session_id = $1`,
      [sessionId]
    );
    
    const allStrengths = [];
    const allImprovements = [];
    evaluations.rows.forEach(e => {
      if (e.strengths) {
        try {
          const s = typeof e.strengths === 'string' ? JSON.parse(e.strengths) : e.strengths;
          if (Array.isArray(s)) allStrengths.push(...s);
        } catch {}
      }
      if (e.improvements) {
        try {
          const i = typeof e.improvements === 'string' ? JSON.parse(e.improvements) : e.improvements;
          if (Array.isArray(i)) allImprovements.push(...i);
        } catch {}
      }
    });
    
    // Lưu practice history
    await pool.query(
      `INSERT INTO practice_history 
       (learner_id, session_id, practice_type, level, total_score, average_score, 
        evaluation, strengths, improvements, duration_minutes)
       VALUES ($1, $2, 'speaking_practice', $3, $4, $5, $6, $7, $8, $9)`,
      [
        session.learner_id,
        sessionId,
        session.level,
        totalScore,
        averageScore,
        summaryData.overall_feedback || "Good practice session!",
        JSON.stringify([...new Set(allStrengths)].slice(0, 3)),
        JSON.stringify([...new Set(allImprovements)].slice(0, 3)),
        duration
      ]
    );
  }

  return {
    total_score: totalScore,
    average_score: averageScore,
    ...summaryData
  };
}

/**
 * Xử lý message trong story mode
 */
export async function processStoryMessage(sessionId, text, audioUrl) {
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

  // Tạo AI response với tone đồng cảm, an ủi
  const aiResponse = await generateStoryResponse(userMessage, history.rows.reverse());

  // Lưu messages
  await pool.query(
    `INSERT INTO story_conversations 
     (session_id, message_type, text_content, audio_url, transcript, ai_response)
     VALUES ($1, 'user', $2, $3, $4, $5)`,
    [
      sessionId,
      text || null,
      audioUrl || null,
      transcript ? JSON.stringify(transcript) : null,
      aiResponse
    ]
  );

  return aiResponse;
}

/**
 * Tạo AI response cho story mode sử dụng Python trainer (trò chuyện live như Gemini)
 */
async function generateStoryResponse(userMessage, history) {
  try {
    // Gọi Python trainer để tạo conversation AI training
    const trainingData = await getTrainingDataFromPython('conversation_ai', {
      topic: null, // Không có topic cố định, để conversation tự nhiên
      history: history.map(h => ({
        speaker: 'user',
        text_content: h.text_content || "[Audio]",
        ai_response: h.ai_response || ""
      }))
    });
    
    // Nếu Python trainer fail, dùng fallback
    if (!trainingData || !trainingData.system_prompt) {
      return await generateStoryResponseFallback(userMessage, history);
    }
    
    // Gọi OpenRouter với training data từ Python qua trainedAIService
    const messages = [
      { role: 'user', content: userMessage }
    ];
    
    const response = await trainedAIService.callTrainedAI(
      'conversation_ai',
      {
        topic: null,
        history: history.map(h => ({
          speaker: 'user',
          text_content: h.text_content || "[Audio]",
          ai_response: h.ai_response || ""
        }))
      },
      messages,
      { model: "openai/gpt-4o-mini", temperature: 0.9, max_tokens: 300 }
    );

    return response.choices?.[0]?.message?.content || "I'm here to listen. Please continue.";
  } catch (err) {
    console.error("❌ Story response error:", err);
    return generateStoryResponseFallback(userMessage, history);
  }
}

/**
 * Fallback cho story response
 */
async function generateStoryResponseFallback(userMessage, history) {
  const systemPrompt = `You are a compassionate AI companion. Be warm, empathetic, and natural like Google Gemini's live conversation.

Previous context:
${history.slice(-3).map((h) => 
  `User: ${h.text_content || "[Audio]"} | AI: ${h.ai_response || ""}`
).join("\n")}

User: "${userMessage}"

Respond naturally and empathetically.`;

  try {
    const response = await aiService.callOpenRouter(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      { model: "openai/gpt-4o-mini", temperature: 0.9 }
    );

    return response.choices?.[0]?.message?.content || "I'm here to listen. Please continue.";
  } catch (err) {
    return "I understand. Thank you for sharing with me. How are you feeling about this?";
  }
}
=======
v? s?a merge conflict
>>>>>>> Incoming (Background Agent changes)

