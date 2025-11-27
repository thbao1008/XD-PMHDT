import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import * as aiService from "./aiService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get backend directory (go up from ai-service/src/services to backend)
const backendDir = path.resolve(__dirname, "..", "..", "..");

/**
 * autoDetectTopics - call Python BERTopic script (ai_models/autoDetectTopics.py)
 * Nếu transcripts < 2 thì Python sẽ trả về rỗng, không lỗi.
 */
export async function autoDetectTopics(transcripts = []) {
  return new Promise((resolve, reject) => {
    try {
      const pyPath = path.resolve(backendDir, "ai_models", "autoDetectTopics.py");
      const args = [pyPath, JSON.stringify(transcripts)];
      const py = spawn("python", args, { stdio: ["ignore", "pipe", "pipe"] });

      let out = "";
      let err = "";
      py.stdout.on("data", chunk => (out += chunk.toString()));
      py.stderr.on("data", chunk => (err += chunk.toString()));

      py.on("close", code => {
        if (code !== 0) {
          return reject(new Error(`autoDetectTopics python exited ${code}: ${err}`));
        }
        try {
          const parsed = JSON.parse(out);
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * buildWordAnalysis - normalize whisperx json -> word_analysis array for DB
 */
function buildWordAnalysis(whisperJson) {
  if (!whisperJson || !Array.isArray(whisperJson.words)) return [];
  return whisperJson.words.map((w, idx) => ({
    word: w.text ?? w.word ?? "",
    start: typeof w.start === "number" ? w.start : null,
    end: typeof w.end === "number" ? w.end : null,
    confidence: typeof w.score === "number" ? w.score : w.confidence ?? null,
    wordIndex: idx
  }));
}

/**
 * analyzeWithOpenRouter - two-step analysis:
 * 1) Speech scoring (thang 10)
 * 2) Challenge alignment
 */
export async function analyzeWithOpenRouter(transcriptText, challenge) {
  const speechPrompt = `
Bạn là giám khảo tiếng Anh. Dưới đây là phần transcript của người học:
"${transcriptText}"

Hãy đánh giá khả năng nói tiếng Anh của người học dựa trên các tiêu chí sau:
- Phát âm (pronunciation)
- Độ trôi chảy (fluency)
- Tổng thể (overall coherence)

Chấm điểm từng tiêu chí theo thang điểm từ 0 đến 10 (có thể dùng số thập phân).

Trả về kết quả dưới dạng JSON như sau:
{
  "feedback": string,
  "overall_score": number,
  "pronunciation_score": number,
  "fluency_score": number,
  "errors": [
    { "word": string, "type": "pronunciation|usage|grammar", "note": string }
  ],
  "suggestions": string[]
}
Chỉ trả về JSON hợp lệ.
`;

  let speechEval = {};
  try {
    const resp = await aiService.callOpenRouter(
      [
        { role: "system", content: "Return strict JSON only." },
        { role: "user", content: speechPrompt }
      ],
      { max_tokens: 600, temperature: 0.2 }
    );
    speechEval = aiService.safeParseJSON(resp?.choices?.[0]?.message?.content) || {};
  } catch (err) {
    // Xử lý lỗi payment required (402) - tự động giảm max_tokens và retry
    if (err.status === 402 && err.code === 'PAYMENT_REQUIRED' && err.maxAffordableTokens) {
      console.warn(`⚠️ Payment required for speech evaluation. Retrying with reduced max_tokens: ${err.maxAffordableTokens}`);
      try {
        const reducedTokens = Math.max(50, err.maxAffordableTokens - 10);
        const resp = await aiService.callOpenRouter(
          [
            { role: "system", content: "Return strict JSON only." },
            { role: "user", content: speechPrompt }
          ],
          { max_tokens: reducedTokens, temperature: 0.2 }
        );
        speechEval = aiService.safeParseJSON(resp?.choices?.[0]?.message?.content) || {};
        console.log(`✅ Speech evaluation retry successful with max_tokens: ${reducedTokens}`);
      } catch (retryErr) {
        console.error("analyzeWithOpenRouter: speech scoring retry failed - ai-service learnerAiService.js", retryErr);
      }
    } else {
      console.error("analyzeWithOpenRouter: speech scoring failed - ai-service learnerAiService.js:98", err);
    }
  }

  // Step 2: Challenge alignment (nếu có challenge)
  let alignmentEval = null;
  if (challenge) {
    const alignmentPrompt = `
Bạn là giám khảo tiếng Anh. Người học đã nói về challenge sau:
Challenge: "${challenge.title || ""}"
Mô tả: "${challenge.description || ""}"

Transcript của người học:
"${transcriptText}"

Hãy đánh giá:
1. Người học có đáp ứng yêu cầu của challenge không?
2. Có sử dụng đúng ngữ pháp/kiến thức mà challenge yêu cầu không?
3. Độ phù hợp với chủ đề (topic alignment)

Trả về JSON:
{
  "topic": string (chủ đề được đề cập),
  "topic_confidence": number (0-1),
  "topic_alignment": {
    "matches": boolean,
    "alignment_score": number (0-1),
    "missing_elements": string[],
    "extra_elements": string[]
  },
  "grammar_compliance": {
    "compliant": boolean,
    "score": number (0-1),
    "issues": string[]
  }
}
Chỉ trả về JSON hợp lệ.
`;

    try {
      const resp = await aiService.callOpenRouter(
        [
          { role: "system", content: "Return strict JSON only." },
          { role: "user", content: alignmentPrompt }
        ],
        { max_tokens: 500, temperature: 0.3 }
      );
      alignmentEval = aiService.safeParseJSON(resp?.choices?.[0]?.message?.content);
    } catch (err) {
      // Xử lý lỗi payment required (402) - tự động giảm max_tokens và retry
      if (err.status === 402 && err.code === 'PAYMENT_REQUIRED' && err.maxAffordableTokens) {
        console.warn(`⚠️ Payment required for alignment evaluation. Retrying with reduced max_tokens: ${err.maxAffordableTokens}`);
        try {
          const reducedTokens = Math.max(50, err.maxAffordableTokens - 10);
          const resp = await aiService.callOpenRouter(
            [
              { role: "system", content: "Return strict JSON only." },
              { role: "user", content: alignmentPrompt }
            ],
            { max_tokens: reducedTokens, temperature: 0.3 }
          );
          alignmentEval = aiService.safeParseJSON(resp?.choices?.[0]?.message?.content);
          console.log(`✅ Alignment evaluation retry successful with max_tokens: ${reducedTokens}`);
        } catch (retryErr) {
          console.error("analyzeWithOpenRouter: alignment retry failed - ai-service learnerAiService.js", retryErr);
        }
      } else {
        console.error("analyzeWithOpenRouter: alignment failed - ai-service learnerAiService.js", err);
      }
    }
  }

  return {
    ...speechEval,
    alignment: alignmentEval,
    word_analysis: buildWordAnalysis(null) // Will be populated from whisperx if available
  };
}

