// backend/src/services/mentorAiService.js
import { callOpenRouter, safeParseJSON } from "./aiService.js";

/**
 * learnFromMentorFeedback - Gửi feedback transcript của mentor cho AI để học cách đánh giá
 * @param {string} feedbackTranscript - Transcript của audio feedback từ mentor
 * @param {object} scores - { final_score, pronunciation_score, fluency_score }
 * @param {object} submissionContext - { learner_transcript, challenge_title, challenge_description }
 */
export async function learnFromMentorFeedback(feedbackTranscript, scores, submissionContext = {}) {
  if (!feedbackTranscript || typeof feedbackTranscript !== "string") {
    console.warn("[mentorAiService] learnFromMentorFeedback: invalid transcript");
    return null;
  }

  const prompt = `Bạn là hệ thống AI đang học cách đánh giá từ mentor.

Mentor đã đánh giá một bài nộp của học viên với các điểm số:
- Điểm tổng: ${scores.final_score ?? "N/A"}/10
- Phát âm: ${scores.pronunciation_score ?? "N/A"}/10
- Trôi chảy: ${scores.fluency_score ?? "N/A"}/10

Transcript của nhận xét audio từ mentor:
"${feedbackTranscript}"

${submissionContext.learner_transcript ? `Transcript của học viên được đánh giá:
"${submissionContext.learner_transcript}"` : ""}

${submissionContext.challenge_title ? `Challenge: ${submissionContext.challenge_title}` : ""}

Hãy phân tích và trích xuất:
1. Các tiêu chí đánh giá mà mentor sử dụng
2. Các điểm mạnh/yếu mà mentor nhận xét
3. Các gợi ý cải thiện mà mentor đưa ra
4. Cách mentor cân nhắc giữa pronunciation và fluency

Trả về JSON:
{
  "evaluation_criteria": ["tiêu chí 1", "tiêu chí 2", ...],
  "strengths_mentioned": ["điểm mạnh 1", ...],
  "weaknesses_mentioned": ["điểm yếu 1", ...],
  "improvement_suggestions": ["gợi ý 1", ...],
  "scoring_rationale": "giải thích cách mentor chấm điểm",
  "key_phrases": ["cụm từ quan trọng mentor dùng", ...]
}

Chỉ trả về JSON hợp lệ.`;

  try {
    const resp = await callOpenRouter(
      [
        { role: "system", content: "Bạn là hệ thống phân tích và học hỏi từ đánh giá của mentor. Trả về JSON hợp lệ." },
        { role: "user", content: prompt }
      ],
      { max_tokens: 1000, temperature: 0.3 }
    );

    const result = safeParseJSON(resp?.choices?.[0]?.message?.content);
    if (result && typeof result === "object") {
      console.log("[mentorAiService] ✅ Learned from mentor feedback");
      return result;
    }
    return null;
  } catch (err) {
    console.error("[mentorAiService] learnFromMentorFeedback error:", err);
    return null;
  }
}

/**
 * getChallengeCreatorSystemPrompt - Lấy system prompt từ Python trainer
 */
async function getChallengeCreatorSystemPrompt() {
  try {
    const { spawn } = await import("child_process");
    const path = await import("path");
    const { fileURLToPath } = await import("url");
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    const trainerPath = path.join(__dirname, "..", "..", "ai_models", "challengeCreatorTrainer.py");
    
    return new Promise((resolve, reject) => {
      const python = spawn("python", [trainerPath]);
      let output = "";
      let errorOutput = "";
      
      python.stdout.on("data", (data) => {
        output += data.toString();
      });
      
      python.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });
      
      python.on("close", (code) => {
        if (code === 0) {
          // Extract system prompt from output
          const systemPromptMatch = output.match(/=== SYSTEM PROMPT ===\n([\s\S]+?)\n=== USER PROMPT ===/);
          if (systemPromptMatch) {
            resolve(systemPromptMatch[1].trim());
          } else {
            // Fallback: use hardcoded prompt
            resolve(getDefaultSystemPrompt());
          }
        } else {
          console.warn("[mentorAiService] Python trainer error, using default prompt:", errorOutput);
          resolve(getDefaultSystemPrompt());
        }
      });
    });
  } catch (err) {
    console.warn("[mentorAiService] Error loading Python trainer, using default:", err.message);
    return getDefaultSystemPrompt();
  }
}

/**
 * getDefaultSystemPrompt - System prompt mặc định nếu không load được từ Python
 */
function getDefaultSystemPrompt() {
  return `You are an expert English learning challenge creator AI. Your role is to understand mentor requests and create high-quality challenges with specific grammar rules.

YOUR CAPABILITIES:
1. Understand mentor's intent from their request
2. Identify required grammar rules (tenses, structures, etc.)
3. Create engaging challenges that require learners to use specific grammar
4. Provide clear requirements and examples for learners
5. Adjust difficulty level based on grammar complexity

GRAMMAR RULES YOU CAN INCORPORATE:
- Tenses: present simple, present continuous, past simple, past continuous, present perfect, past perfect, future (will, going to)
- Conditionals: type 0, 1, 2, 3, mixed conditionals
- Passive voice: all tenses
- Reported speech / Indirect speech
- Modal verbs: can, could, should, must, might, may
- Comparative and superlative adjectives
- Relative clauses: who, which, that, where
- Gerunds and infinitives
- Phrasal verbs

CHALLENGE CREATION GUIDELINES:
1. Title: Clear, engaging, and related to the topic
2. Description: HTML format with:
   - Clear instructions
   - Specific grammar requirements (highlighted in <strong>)
   - Examples of correct usage
   - Minimum speaking time/duration
   - Number of sentences/points required
3. Level: easy (basic grammar), medium (intermediate grammar), hard (advanced/combined grammar)
4. Grammar Focus: List the specific grammar points required

IMPORTANT:
- Always include specific grammar requirements in the challenge description
- Provide examples of correct grammar usage
- Make requirements clear and measurable
- Adjust complexity based on grammar rules (simple tenses = easy, complex combinations = hard)
- Make challenges engaging and relevant to learners' lives`;
}

/**
 * chatWithAI - Enhanced AI chat for challenge creation with grammar rules understanding
 */
export async function chatWithAI(message, context = {}) {
  try {
    // Get system prompt from trainer (with fallback)
    const systemPrompt = await getChallengeCreatorSystemPrompt();
    
    // Build user prompt
    const contextStr = context.description 
      ? `Current challenge context: ${context.description.substring(0, 200)}...`
      : "No existing challenge context.";
    
    const userPrompt = `Mentor Request: "${message}"

${contextStr}

Please create a COMPLETE challenge based on this request. You must return BOTH title and description.

Analyze:
1. What grammar rules should be required?
2. What level of difficulty is appropriate?
3. What should the challenge title be? (Create an engaging, clear title)
4. What detailed requirements should learners follow?

Return your response in JSON format:
{
  "title": "Challenge title here (clear, engaging, related to topic)",
  "description": "HTML formatted description with:
    - Clear task instructions
    - Specific grammar requirements (use <strong> tags)
    - Examples of correct usage
    - Minimum requirements (speaking time, number of sentences, etc.)",
  "level": "easy|medium|hard",
  "grammar_focus": "list of grammar rules required"
}

IMPORTANT: 
- Always include BOTH title and description
- Title should be clear and engaging
- Description should be in HTML format with all requirements
- Make it engaging and educational!`;
    
    const resp = await callOpenRouter(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      { max_tokens: 1000, temperature: 0.8 }
    );
    
    const content = resp?.choices?.[0]?.message?.content || "";
    
    // Try to parse JSON response
    try {
      // Remove markdown code blocks if any
      let jsonContent = content.trim();
      const codeBlockMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonContent = codeBlockMatch[1].trim();
      }
      
      // Try to find JSON object in the content
      const jsonObjectMatch = jsonContent.match(/\{[\s\S]*"title"[\s\S]*"description"[\s\S]*\}/);
      if (jsonObjectMatch) {
        jsonContent = jsonObjectMatch[0];
      }
      
      const parsed = JSON.parse(jsonContent);
      
      // Return JSON string for frontend to parse
      if (parsed.title && parsed.description) {
        return JSON.stringify({
          title: parsed.title,
          description: parsed.description,
          level: parsed.level || "medium",
          grammar_focus: parsed.grammar_focus || ""
        });
      }
    } catch (e) {
      // If not JSON, return as is (fallback)
      console.warn("[mentorAiService] Could not parse AI response as JSON, returning as text:", e.message);
    }
    
    return content;
  } catch (err) {
    console.error("chatWithAI error:", err);
    return "";
  }
}

/**
 * editChallengeAI - Enhanced AI helper to edit challenge content with grammar focus
 */
export async function editChallengeAI(content, mentorFeedback = "") {
  try {
    const systemPrompt = await getChallengeCreatorSystemPrompt();
    
    const userPrompt = `Improve this challenge based on mentor feedback:

Current Challenge:
${content}

Mentor Feedback:
${mentorFeedback || "Make it more engaging and add specific grammar requirements."}

Please enhance the challenge by:
1. Adding or clarifying grammar requirements (if missing)
2. Making instructions clearer
3. Adding examples of correct grammar usage if needed
4. Adjusting difficulty if necessary
5. Making it more engaging and educational

Return the improved challenge in HTML format, ensuring:
- Grammar requirements are clearly stated with <strong> tags
- Examples are provided
- Requirements are measurable (speaking time, number of sentences, etc.)`;
    
    const resp = await callOpenRouter(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      { max_tokens: 1000, temperature: 0.7 }
    );
    
    return resp?.choices?.[0]?.message?.content || content;
  } catch (err) {
    console.error("editChallengeAI error:", err);
    return content;
  }
}

