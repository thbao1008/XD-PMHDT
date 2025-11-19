// backend/src/services/speakingPracticeService.js
import pool from "../config/db.js";
import { runWhisperX } from "../utils/whisperxRunner.js";
import * as learnerAiService from "./learnerAiService.js";
import * as aiService from "./aiService.js";
import path from "path";
import fs from "fs";

// Prompts cho từng level
const PROMPTS_BY_LEVEL = {
  1: [
    "Hello, my name is John. I am a student.",
    "I like to read books. Books are interesting.",
    "Today is Monday. It is a sunny day.",
    "I have a cat. My cat is very cute.",
    "I go to school every day. School is fun.",
    "I eat breakfast at 7 AM. Breakfast is important.",
    "My favorite color is blue. Blue is beautiful.",
    "I play soccer on weekends. Soccer is my hobby.",
    "I live in a big city. The city is busy.",
    "I study English every day. English is useful."
  ],
  2: [
    "I enjoy reading books in my free time because they help me learn new things and expand my vocabulary.",
    "Last weekend, I visited my grandmother who lives in a small village near the mountains.",
    "Learning a new language can be challenging, but it opens up many opportunities for communication and understanding different cultures.",
    "My favorite hobby is photography because it allows me to capture beautiful moments and express my creativity.",
    "I believe that regular exercise is essential for maintaining good health and a positive mindset.",
    "Technology has changed the way we communicate, making it easier to connect with people around the world.",
    "I enjoy cooking traditional dishes from my country, which helps me stay connected to my cultural heritage.",
    "Traveling to new places broadens my perspective and helps me appreciate the diversity of our world.",
    "I find that listening to music helps me relax and focus when I'm studying or working.",
    "Education is the key to personal growth and success in both professional and personal life."
  ],
  3: [
    "The rapid advancement of artificial intelligence and machine learning technologies has revolutionized various industries, from healthcare to finance, enabling more efficient data processing and decision-making capabilities that were previously unimaginable.",
    "Climate change represents one of the most pressing challenges of our time, requiring immediate and coordinated global action to reduce greenhouse gas emissions and transition to sustainable energy sources.",
    "The concept of cultural diversity emphasizes the importance of understanding and respecting different traditions, languages, and perspectives that enrich our global community.",
    "Effective communication skills are crucial in today's interconnected world, as they enable individuals to express ideas clearly, build relationships, and navigate complex social and professional environments.",
    "The study of history provides valuable insights into human behavior, societal evolution, and the consequences of past decisions, helping us make more informed choices for the future.",
    "Mental health awareness has gained significant attention in recent years, highlighting the need for accessible support systems and reducing the stigma associated with seeking psychological help.",
    "Sustainable development requires balancing economic growth with environmental protection, ensuring that current progress does not compromise the well-being of future generations.",
    "The digital transformation of education has created new opportunities for personalized learning experiences, allowing students to access resources and collaborate with peers regardless of geographical boundaries.",
    "Critical thinking skills are essential for navigating the vast amount of information available in the digital age, enabling individuals to evaluate sources, identify biases, and form well-reasoned conclusions.",
    "The importance of work-life balance has become increasingly recognized, as maintaining physical and mental well-being is crucial for long-term productivity and personal fulfillment."
  ]
};

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
 * Tạo session mới cho luyện nói
 */
export async function createPracticeSession(learnerId, level) {
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
 * Lấy prompt cho vòng nói
 */
export function getPromptForRound(level, roundNumber) {
  const prompts = PROMPTS_BY_LEVEL[level] || PROMPTS_BY_LEVEL[1];
  const index = (roundNumber - 1) % prompts.length;
  return prompts[index];
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
export async function saveRound(sessionId, roundNumber, audioUrl, timeTaken) {
  const session = await pool.query(
    `SELECT level FROM speaking_practice_sessions WHERE id = $1`,
    [sessionId]
  );

  if (!session.rows[0]) {
    throw new Error("Session not found");
  }

  const level = session.rows[0].level;
  const prompt = getPromptForRound(level, roundNumber);

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
 * Phân tích phát âm với AI
 */
async function analyzePronunciation(transcript, expectedText, level) {
  const prompt = `You are an English pronunciation tutor. Analyze the learner's pronunciation.

Expected text: "${expectedText}"
Learner's transcript: "${transcript}"

Please provide:
1. A score from 0-10 based on pronunciation accuracy, fluency, and correctness
2. Detailed feedback on pronunciation errors
3. A list of specific pronunciation mistakes
4. A corrected version of what the learner said (if different from expected)

Respond in JSON format:
{
  "score": <number 0-10>,
  "feedback": "<detailed feedback>",
  "errors": ["<error1>", "<error2>", ...],
  "corrected_text": "<corrected version>"
}`;

  try {
    const response = await aiService.callOpenRouter(
      [{ role: "user", content: prompt }],
      { model: "openai/gpt-4o-mini", temperature: 0.7 }
    );

    const content = response.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    return parsed;
  } catch (err) {
    console.error("❌ AI analysis error:", err);
    return {
      score: 5,
      feedback: "Không thể phân tích chi tiết.",
      errors: [],
      corrected_text: expectedText
    };
  }
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

  // Tạo tổng kết với AI
  const summaryPrompt = `You are an English tutor. Provide a comprehensive summary of a learner's speaking practice session.

The learner completed ${rounds.rows.length} rounds with an average score of ${averageScore.toFixed(1)}/10.

Round details:
${rounds.rows.map((r, i) => 
  `Round ${i + 1}: Score ${r.score}/10. Prompt: "${r.prompt}". Analysis: ${r.analysis ? JSON.stringify(r.analysis) : "N/A"}`
).join("\n")}

Please provide:
1. Overall feedback on the learner's performance
2. Common mistakes identified across all rounds
3. Strengths and areas for improvement
4. Encouragement and next steps

Respond in JSON:
{
  "overall_feedback": "<comprehensive feedback>",
  "common_mistakes": ["<mistake1>", "<mistake2>", ...],
  "strengths": ["<strength1>", "<strength2>", ...],
  "improvements": ["<improvement1>", "<improvement2>", ...],
  "encouragement": "<encouraging message>"
}`;

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
      { model: "openai/gpt-4o-mini", temperature: 0.7 }
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
 * Tạo AI response cho story mode (tone đồng cảm, an ủi)
 */
async function generateStoryResponse(userMessage, history) {
  const systemPrompt = `You are a compassionate and empathetic AI companion. Your role is to listen, understand, and provide emotional support to learners who are sharing their stories.

Guidelines:
- Be warm, understanding, and non-judgmental
- Show empathy and validate their feelings
- Offer encouragement and positive reinforcement
- Don't focus on grammar or pronunciation errors (this is a safe space for expression)
- Keep responses conversational and natural
- If appropriate, offer gentle advice or perspective
- Be supportive and uplifting

Previous conversation context:
${history.map((h) => 
  `User: ${h.text_content || "[Audio]"} | AI: ${h.ai_response || ""}`
).join("\n")}

User's current message: "${userMessage}"

Respond naturally and empathetically.`;

  try {
    const response = await aiService.callOpenRouter(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      { model: "openai/gpt-4o-mini", temperature: 0.8 }
    );

    return response.choices?.[0]?.message?.content || "I'm here to listen. Please continue.";
  } catch (err) {
    console.error("❌ Story response error:", err);
    return "I understand. Thank you for sharing with me. How are you feeling about this?";
  }
}

