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
 * chatWithAI - short HTML suggestion (used by mentorService.chatWithAI)
 */
export async function chatWithAI(message, context = {}) {
  const prompt = `Context: ${JSON.stringify(context)}\n\nUser: ${message}`;
  try {
    const resp = await callOpenRouter(
      [{ role: "user", content: prompt }],
      { max_tokens: 300, temperature: 0.7 }
    );
    return resp?.choices?.[0]?.message?.content || "";
  } catch (err) {
    console.error("chatWithAI error:", err);
    return "";
  }
}

/**
 * editChallengeAI - AI helper to edit challenge content
 */
export async function editChallengeAI(content) {
  const prompt = `Chỉnh sửa và cải thiện nội dung challenge sau:\n\n${content}\n\nTrả về nội dung đã được cải thiện.`;
  try {
    const resp = await callOpenRouter(
      [{ role: "user", content: prompt }],
      { max_tokens: 500, temperature: 0.5 }
    );
    return resp?.choices?.[0]?.message?.content || content;
  } catch (err) {
    console.error("editChallengeAI error:", err);
    return content;
  }
}
