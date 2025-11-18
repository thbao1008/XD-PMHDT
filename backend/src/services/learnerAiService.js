import { spawn } from "child_process";
import path from "path";
import * as aiService from "./aiService.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * autoDetectTopics - call Python BERTopic script (ai_models/autoDetectTopics.py)
 * Nếu transcripts < 2 thì Python sẽ trả về rỗng, không lỗi.
 */
export async function autoDetectTopics(transcripts = []) {
  return new Promise((resolve, reject) => {
    try {
      const pyPath = path.resolve(__dirname, "../../ai_models/autoDetectTopics.py");
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
    console.error("analyzeWithOpenRouter: speech scoring failed - learnerAiService.js:98", err);
  }

  const alignPrompt = `
Transcript: "${transcriptText}"
Challenge: title="${challenge?.title || ""}", description="${stripHTML(challenge?.description || "")}", tags=${JSON.stringify(challenge?.tags || [])}

Trả về JSON:
{
  "topic_alignment": { "score": 0-1, "notes": string[] },
  "word_choice": { "<word>": ["better1","better2"] },
  "grammar_issues": [{ "index": number, "issue": string, "suggestion": string }]
}
Chỉ trả JSON hợp lệ.
`;

  let alignEval = {};
  try {
    const resp2 = await aiService.callOpenRouter(
      [
        { role: "system", content: "Return strict JSON only." },
        { role: "user", content: alignPrompt }
      ],
      { max_tokens: 700, temperature: 0.2 }
    );
    alignEval = aiService.safeParseJSON(resp2?.choices?.[0]?.message?.content) || {};
  } catch (err) {
    console.error("analyzeWithOpenRouter: challenge alignment failed - learnerAiService.js:125", err);
  }

  return {
    feedback: speechEval.feedback,
    overall_score: speechEval.overall_score,
    pronunciation_score: speechEval.pronunciation_score,
    fluency_score: speechEval.fluency_score,
    errors: Array.isArray(speechEval.errors) ? speechEval.errors : [],
    suggestions: speechEval.suggestions || [],
    topic_alignment: alignEval.topic_alignment || null,
    word_choice: alignEval.word_choice || {},
    grammar_issues: Array.isArray(alignEval.grammar_issues) ? alignEval.grammar_issues : []
  };
}

/**
 * analyzeLearnerTranscript - main analysis for a learner submission
 */
export async function analyzeLearnerTranscript(
  transcriptInput,
  { runTopicDetection = true, challenge = null, sampleTranscripts = [] } = {}
) {
  let text = "";
  let whisperJson = null;
  if (typeof transcriptInput === "string") {
    text = transcriptInput;
  } else if (transcriptInput && typeof transcriptInput === "object") {
    whisperJson = transcriptInput;
    if (typeof whisperJson.text === "string") text = whisperJson.text;
    else if (Array.isArray(whisperJson.words)) {
      text = whisperJson.words.map(w => w.text ?? w.word ?? "").join(" ");
    }
  }

  let aiEval = await analyzeWithOpenRouter(text, challenge || {});

  let word_analysis = buildWordAnalysis(whisperJson);

  let topic = null;
  let topic_confidence = null;
let topicDetectionRaw = null;

if (runTopicDetection) {
  try {
    const td = await autoDetectTopics([...sampleTranscripts, text]);
    topicDetectionRaw = td; // giữ toàn bộ output để lưu

    if (td && Array.isArray(td.assignments) && td.assignments.length > 0) {
      const assignedId = td.assignments[td.assignments.length - 1];
      if (Array.isArray(td.topics) && td.topics.length > 0) {
        const tinfo = td.topics.find(t => t.Topic === assignedId) || td.topics[0];
        if (tinfo && (tinfo.Name || tinfo.Representation)) {
          topic =
            tinfo.Name ||
            (Array.isArray(tinfo.Representation)
              ? tinfo.Representation.join(", ")
              : String(tinfo.Representation));
        } else {
          topic = `Topic ${assignedId}`;
        }
      }
      if (Array.isArray(td.probs) && td.probs[td.probs.length - 1]) {
        const p = Array.isArray(td.probs[td.probs.length - 1])
          ? Math.max(...td.probs[td.probs.length - 1].map(Number))
          : Number(td.probs[td.probs.length - 1]);
        topic_confidence = Number.isFinite(p) ? p : null;
      }
    }
  } catch (err) {
    console.warn("autoDetectTopics failed - learnerAiService.js:195", err.message || err);
  }
}

  const wordChoiceMap = aiEval.word_choice || {};
  const grammarIndexMap = Array.isArray(aiEval.grammar_issues)
    ? aiEval.grammar_issues.reduce((acc, it) => {
        if (typeof it.index === "number") acc[it.index] = [it.issue, it.suggestion].filter(Boolean);
        return acc;
      }, {})
    : {};

  word_analysis = alignWithChallengeTokens(
    word_analysis,
    challenge?.sampleText || "",
    { wordChoice: wordChoiceMap, grammar: grammarIndexMap }
  );

  return {
  overall_score: aiEval.overall_score ?? null,
  pronunciation_score: aiEval.pronunciation_score ?? null,
  fluency_score: aiEval.fluency_score ?? null,
  grammar_issues: aiEval.errors?.filter(e => e.type === "usage") ?? [],
  pronunciation_issues: aiEval.errors?.filter(e => e.type === "pronunciation") ?? [],
  suggestions: aiEval.suggestions ?? [],
  raw_ai_response: aiEval,
  word_analysis,
  topic,
  topic_confidence,
  topic_alignment: aiEval.topic_alignment || null,
  topic_detection_raw: topicDetectionRaw 
};

}

/**
 * helper: runWhisperXFile
 */
export async function runWhisperXFile(localPath) {
  try {
    const { json, text } = await aiService.transcribeWithWhisperX(localPath);
    return { json, text };
  } catch (err) {
    throw err;
  }
}

/**
 * Merge expected sample tokens and AI hints into per-word analysis
 */
function alignWithChallengeTokens(wordAnalysis, sampleText, aiHints = {}) {
  const sampleTokens = (sampleText || "")
    .replace(/[^\w\s]/g, "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  return wordAnalysis.map((w, idx) => {
    const expected = sampleTokens[idx] || null;
    const mismatch = expected ? w.word.toLowerCase() !== expected : false;
    const lower = (w.word || "").toLowerCase();

    const flags = {};
    if (mismatch) flags.mismatch = true;
    if (aiHints.wordChoice && aiHints.wordChoice[lower]) flags.word_choice = aiHints.wordChoice[lower];
    if (aiHints.grammar && aiHints.grammar[idx]) flags.grammar = aiHints.grammar[idx];

    const correct = expected ? !mismatch : undefined;

    return { ...w, expected, flags, ...(typeof correct === "boolean" ? { correct } : {}) };
  });
}

function stripHTML(html) {
  return String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
