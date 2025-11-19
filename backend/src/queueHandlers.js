// backend/src/queueHandlers.js
import { registerProcessor } from "./utils/queue.js";
import * as learnerService from "./services/learnerService.js";
import * as learnerAiService from "./services/learnerAiService.js";
import { runWhisperX } from "./utils/whisperxRunner.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Đọc sampleTranscripts từ JSON bằng fs (không dùng assert)
const sampleTranscriptsPath = path.resolve(__dirname, "../ai_models/sampleTranscripts.json");
const sampleTranscripts = JSON.parse(fs.readFileSync(sampleTranscriptsPath, "utf-8"));
const sampleTexts = Array.isArray(sampleTranscripts) ? sampleTranscripts.map(s => s.text) : [];

function audioUrlToLocalPath(audioUrl) {
  const m = String(audioUrl || "").match(/\/uploads\/(.+)$/);
  if (!m) return null;
  const filename = m[1];
  return path.resolve(process.cwd(), "uploads", filename);
}

registerProcessor("analyzeSubmission", async (job) => {
  const { submissionId } = job.data;
  console.log("🔄 Processing analyzeSubmission job: - queueHandlers.js:27", submissionId);

  const sub = await learnerService.getSubmissionById(submissionId);
  if (!sub) {
    console.warn("⚠️ Submission not found: - queueHandlers.js:31", submissionId);
    return;
  }

  console.log("📄 Submission loaded: - queueHandlers.js:35", {
    id: sub.id,
    audio_url: sub.audio_url,
    transcriptExists: !!sub.transcript,
  });

  let transcript = sub.transcript ?? null;

  // Nếu chưa có transcript thì chạy WhisperX
  if (!transcript) {
    if (!sub.audio_url) {
      console.warn("⚠️ No audio_url to transcribe: - queueHandlers.js:46", submissionId);
      await learnerService.updateSubmissionStatus(submissionId, "failed");
      return;
    }

    const localPath = audioUrlToLocalPath(sub.audio_url);
    if (!localPath || !fs.existsSync(localPath)) {
      console.error("❌ Local audio file not found: - queueHandlers.js:53", localPath);
      await learnerService.updateSubmissionStatus(submissionId, "failed");
      return;
    }

    try {
      console.log("🔊 Transcribing audio: - queueHandlers.js:59", localPath);
      const { json: transcriptJson } = await runWhisperX(localPath, {
        model: "base",
        computeType: "float32",
        timeoutMs: 3 * 60 * 1000,
      });

      if (transcriptJson) {
        // Lưu transcript
        await learnerService.updateSubmissionTranscript(submissionId, transcriptJson);
        transcript = transcriptJson;

        // Lưu segments nếu có
        if (Array.isArray(transcriptJson.segments)) {
          await learnerService.updateSubmissionSegments(submissionId, transcriptJson.segments);
        }

        console.log("📝 Transcript + segments saved: - queueHandlers.js:76", submissionId);
      } else {
        console.warn("⚠️ Empty transcript JSON: - queueHandlers.js:78", submissionId);
        await learnerService.updateSubmissionStatus(submissionId, "pending_transcription");
        return;
      }
    } catch (err) {
      console.error("❌ Transcription failed: - queueHandlers.js:83", submissionId, err);
      await learnerService.updateSubmissionStatus(submissionId, "failed");
      return;
    }
  }

  // Phân tích transcript bằng learnerAiService
  try {
    console.log("🧠 Analyzing transcript: - queueHandlers.js:91", submissionId);

    const challenge = await learnerService.getChallengeById(sub.challenge_id);

    const analysis = await learnerAiService.analyzeLearnerTranscript(transcript, {
      runTopicDetection: true,
      challenge,
      sampleTranscripts: sampleTexts
    });

    if (!analysis || typeof analysis !== "object") {
      console.error("❌ Invalid analysis result: - queueHandlers.js:102", submissionId, analysis);
      await learnerService.updateSubmissionStatus(submissionId, "failed");
      return;
    }

    await learnerService.updateSubmissionAnalysis(submissionId, { ...analysis, transcript });
    await learnerService.updateSubmissionStatus(submissionId, "completed");
    console.log("✅ AI analysis saved: - queueHandlers.js:109", submissionId);
  } catch (err) {
    console.error("❌ AI analysis failed: - queueHandlers.js:111", submissionId, err);
    await learnerService.updateSubmissionStatus(submissionId, "failed");
  }
});

// Queue handler để xử lý audio feedback từ mentor: transcribe và gửi cho AI học
registerProcessor("processMentorAudioFeedback", async (job) => {
  const { feedbackId, audioUrl, submissionId, scores } = job.data;
  console.log("🔄 Processing mentor audio feedback: - queueHandlers.js:118", { feedbackId, audioUrl });

  if (!audioUrl) {
    console.warn("⚠️ No audio_url for feedback: - queueHandlers.js:121", feedbackId);
    return;
  }

  const localPath = audioUrlToLocalPath(audioUrl);
  if (!localPath || !fs.existsSync(localPath)) {
    console.error("❌ Local audio file not found: - queueHandlers.js:126", localPath);
    return;
  }

  try {
    // Transcribe audio feedback
    console.log("🔊 Transcribing mentor feedback audio: - queueHandlers.js:135", localPath);
    const { json: transcriptJson } = await runWhisperX(localPath, {
      model: "base",
      computeType: "float32",
      timeoutMs: 3 * 60 * 1000,
    });

    // Extract text from transcript JSON
    let transcriptText = "";
    if (transcriptJson) {
      if (typeof transcriptJson.text === "string") {
        transcriptText = transcriptJson.text;
      } else if (Array.isArray(transcriptJson.words)) {
        transcriptText = transcriptJson.words.map(w => w.text || w.word || "").join(" ");
      } else if (Array.isArray(transcriptJson.segments)) {
        transcriptText = transcriptJson.segments.map(s => s.text || "").join(" ");
      }
    }

    if (!transcriptText) {
      console.warn("⚠️ Empty transcript for feedback: - queueHandlers.js:150", feedbackId);
      return;
    }

    // Lấy context của submission để AI học
    let submissionContext = {};
    if (submissionId) {
      try {
        const sub = await learnerService.getSubmissionById(submissionId);
        if (sub) {
          const learnerTranscript = typeof sub.transcript === "string" 
            ? sub.transcript 
            : (sub.transcript?.text || "");
          submissionContext = {
            learner_transcript: learnerTranscript,
            challenge_title: sub.challenge?.title || "",
            challenge_description: sub.challenge?.description || ""
          };
        }
      } catch (err) {
        console.warn("⚠️ Could not load submission context: - queueHandlers.js:156", err);
      }
    }

    // Gửi cho AI để học từ cách đánh giá của mentor
    const mentorAiService = await import("./services/mentorAiService.js");
    const learningResult = await mentorAiService.learnFromMentorFeedback(
      transcriptText,
      scores || {},
      submissionContext
    );

    if (learningResult) {
      console.log("✅ AI learned from mentor feedback: - queueHandlers.js:165", {
        feedbackId,
        criteria: learningResult.evaluation_criteria?.length || 0,
        suggestions: learningResult.improvement_suggestions?.length || 0
      });
      
      // Có thể lưu learningResult vào database để sử dụng sau này
      // Ví dụ: tạo bảng mentor_feedback_learnings hoặc cập nhật feedbacks table
      // TODO: Lưu learningResult vào database nếu cần
    }

    // Cập nhật feedback với transcript (nếu cần lưu transcript vào DB)
    // Có thể thêm cột transcript_text vào bảng feedbacks
    console.log("📝 Mentor feedback transcribed: - queueHandlers.js:177", feedbackId);
  } catch (err) {
    console.error("❌ Process mentor audio feedback failed: - queueHandlers.js:180", feedbackId, err);
  }
});

// Queue handler để xử lý speaking round (transcription + AI analysis)
registerProcessor("processSpeakingRound", async (job) => {
  const { roundId, audioUrl, prompt, level } = job.data;
  console.log("🔄 Processing speaking round: - queueHandlers.js", roundId);

  const pool = (await import("./config/db.js")).default;
  const { runWhisperX } = await import("./utils/whisperxRunner.js");
  const path = (await import("path")).default;
  const fs = (await import("fs")).default;
  const aiService = await import("./services/aiService.js");

  try {
    // Transcribe audio
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
        // Phân tích phát âm và so sánh với prompt
        const expectedWords = prompt.toLowerCase().split(/\s+/).filter(w => w.length > 0);
        const spokenWords = transcriptText.toLowerCase().split(/\s+/).filter(w => w.length > 0);
        const missingWords = expectedWords.filter(w => !spokenWords.includes(w.replace(/[.,!?;:]/g, "")));
        
        // Tính tốc độ nói (từ/phút)
        const timeTaken = job.data.time_taken || 30; // seconds
        const speechRate = Math.round((spokenWords.length / timeTaken) * 60);
        
        const analysisPrompt = `You are an English pronunciation and speaking tutor. Analyze the learner's speaking performance.

Expected text: "${prompt}"
Learner's transcript: "${transcriptText}"
Time taken: ${timeTaken} seconds
Speech rate: ${speechRate} words/minute
Missing words: ${missingWords.length > 0 ? missingWords.join(", ") : "None"}

Please provide a comprehensive analysis in JSON format:
{
  "speaking_score": <number 0-10, based on pronunciation accuracy, fluency, and correctness>,
  "vocabulary_score": <number 0-10, based on vocabulary usage and word accuracy>,
  "speech_rate": ${speechRate},
  "missing_words": ${JSON.stringify(missingWords)},
  "grammar_errors": ["<grammar error 1>", "<grammar error 2>", ...],
  "feedback": "<detailed feedback in Vietnamese about pronunciation, grammar, and overall performance>"
}

IMPORTANT: Respond ONLY with valid JSON, no markdown code blocks, no explanations.`;

        const response = await aiService.callOpenRouter(
          [{ role: "user", content: analysisPrompt }],
          { model: "openai/gpt-4o-mini", temperature: 0.7 }
        );

        let content = response.choices?.[0]?.message?.content || "{}";
        
        // Parse JSON (handle markdown code blocks if any)
        content = content.trim();
        const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/;
        const codeBlockMatch = content.match(codeBlockRegex);
        if (codeBlockMatch && codeBlockMatch[1]) {
          content = codeBlockMatch[1].trim();
        }
        
        analysis = JSON.parse(content);
        score = analysis.speaking_score || analysis.score || 0;
        feedback = analysis.feedback || "";
        errors = analysis.grammar_errors || analysis.errors || [];
        
        // Lưu thêm các thông tin mới
        analysis.speech_rate = speechRate;
        analysis.missing_words = missingWords;
        analysis.vocabulary_score = analysis.vocabulary_score || 0;
        analysis.speaking_score = analysis.speaking_score || score;
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
        analysis?.speaking_score || score,
        JSON.stringify(analysis || {
          feedback,
          grammar_errors: errors,
          speaking_score: score,
          vocabulary_score: analysis?.vocabulary_score || 0,
          speech_rate: speechRate,
          missing_words: missingWords
        }),
        roundId
      ]
    );

    console.log("✅ Speaking round processed:", roundId);
  } catch (err) {
    console.error("❌ Process speaking round failed:", roundId, err);
  }
});