// Learner Service - Queue Handlers
import { registerProcessor } from "./utils/queue.js";
import * as learnerService from "./services/learnerService.js";
// TODO: Replace with API calls to AI Service
// import * as learnerAiService from "./services/learnerAiService.js";
import { runWhisperX } from "./utils/whisperxRunner.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import pool from "./config/db.js";

/**
 * Tìm project root (đi lên từ learner-service/src đến root)
 */
function getProjectRoot() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  // __dirname = backend/services/learner-service/src
  // Đi lên 3 cấp: src -> learner-service -> services -> backend
  return path.resolve(__dirname, "..", "..", "..");
}

function audioUrlToLocalPath(audioUrl) {
  const m = String(audioUrl || "").match(/\/uploads\/(.+)$/);
  if (!m) return null;
  const filename = m[1];
  // Tìm file ở backend/uploads/
  const backendDir = getProjectRoot();
  return path.resolve(backendDir, "uploads", filename);
}

// Queue handler để xử lý submission analysis
registerProcessor("analyzeSubmission", async (job) => {
  const { submissionId } = job.data;
  console.log("🔄 Processing analyzeSubmission job:", submissionId);

  const sub = await learnerService.getSubmissionById(submissionId);
  if (!sub) {
    console.warn("⚠️ Submission not found:", submissionId);
    return;
  }

  let transcript = sub.transcript ?? null;

  // Nếu chưa có transcript thì chạy WhisperX
  if (!transcript) {
    if (!sub.audio_url) {
      console.warn("⚠️ No audio_url to transcribe:", submissionId);
      await learnerService.updateSubmissionStatus(submissionId, "failed");
      return;
    }

    const localPath = audioUrlToLocalPath(sub.audio_url);
    if (!localPath || !fs.existsSync(localPath)) {
      console.error("❌ Local audio file not found:", localPath);
      await learnerService.updateSubmissionStatus(submissionId, "failed");
      return;
    }

    try {
      console.log("🔊 Transcribing audio:", localPath);
      const { json: transcriptJson } = await runWhisperX(localPath, {
        model: "base",
        computeType: "float32",
        timeoutMs: 3 * 60 * 1000,
      });

      if (transcriptJson) {
        await learnerService.updateSubmissionTranscript(submissionId, transcriptJson);
        transcript = transcriptJson;

        if (Array.isArray(transcriptJson.segments)) {
          await learnerService.updateSubmissionSegments(submissionId, transcriptJson.segments);
        }

        console.log("📝 Transcript + segments saved:", submissionId);
      } else {
        console.warn("⚠️ Empty transcript JSON:", submissionId);
        await learnerService.updateSubmissionStatus(submissionId, "pending_transcription");
        return;
      }
    } catch (err) {
      console.error("❌ Transcription failed:", submissionId, err);
      await learnerService.updateSubmissionStatus(submissionId, "failed");
      return;
    }
  }

  // Phân tích transcript bằng AI Service
  try {
    console.log("🧠 Analyzing transcript:", submissionId);

    const challenge = await learnerService.getChallengeById(sub.challenge_id);

    // Gọi qua API Gateway thay vì trực tiếp đến AI Service
    // Extract transcript text - handle both object and string formats
    let transcriptText = "";
    if (typeof transcript === "string") {
      transcriptText = transcript;
    } else if (transcript && typeof transcript === "object") {
      transcriptText = transcript.text || (transcript.segments || []).map(s => s.text || "").join(" ") || "";
    }
    
    if (!transcriptText || transcriptText.trim().length === 0) {
      console.error("❌ Empty transcript text:", submissionId);
      await learnerService.updateSubmissionStatus(submissionId, "failed");
      return;
    }

    console.log(`[DEBUG] Sending transcript to AI Service (length: ${transcriptText.length}):`, transcriptText.substring(0, 100) + "...");
    
    const response = await fetch(`http://localhost:${process.env.API_GATEWAY_PORT || 4000}/api/ai/learner/analyze-transcript`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: transcriptText,
        options: {
          runTopicDetection: true,
          challenge,
          sampleTranscripts: []
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(`❌ AI Service error ${response.status}:`, errorText);
      throw new Error(`AI Service error: ${response.status} - ${errorText}`);
    }

    const analysis = await response.json();

    if (!analysis || typeof analysis !== "object") {
      console.error("❌ Invalid analysis result:", submissionId, analysis);
      await learnerService.updateSubmissionStatus(submissionId, "failed");
      return;
    }

    await learnerService.updateSubmissionAnalysis(submissionId, { ...analysis, transcript });
    await learnerService.updateSubmissionStatus(submissionId, "completed");
    console.log("✅ AI analysis saved:", submissionId);
  } catch (err) {
    console.error("❌ AI analysis failed:", submissionId, err);
    await learnerService.updateSubmissionStatus(submissionId, "failed");
  }
});

// Queue handler để xử lý speaking round (transcription + AI analysis)
registerProcessor("processSpeakingRound", async (job) => {
  const { roundId, sessionId, audioUrl, prompt, level, time_taken } = job.data;
  console.log("🔄 Processing speaking round:", roundId);

  try {
    // Transcribe audio
    const backendDir = getProjectRoot();
    const localPath = audioUrl.startsWith("/uploads/")
      ? path.join(backendDir, audioUrl)
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

    // Analyze với AI Service
    let analysis = null;
    let score = 0;
    let feedback = "";
    let errors = [];
    let correctedText = "";

    if (transcript) {
      const transcriptText = transcript.text || (transcript.segments || []).map(s => s.text || "").join(" ");

      try {
        // Gọi qua API Gateway thay vì trực tiếp đến AI Service
        const response = await fetch(`http://localhost:${process.env.API_GATEWAY_PORT || 4000}/api/ai/learner/analyze-transcript`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: transcriptText,
            options: {
              expected: prompt,
              level,
              runTopicDetection: false
            }
          })
        });

        if (response.ok) {
          analysis = await response.json();
          score = Math.round(analysis.score || 0);
          feedback = analysis.feedback || "";
          errors = analysis.errors || [];
          correctedText = analysis.corrected_text || "";
        }
      } catch (err) {
        console.error("❌ AI analysis error:", err);
        feedback = "Không thể phân tích. Vui lòng thử lại.";
        score = 0;
      }
    } else {
      score = 0;
      feedback = "Bạn chưa nói gì. Hãy thử lại và nói to, rõ ràng.";
    }

    // Build word_analysis từ transcript
    let wordAnalysis = [];
    if (transcript && transcript.words && Array.isArray(transcript.words)) {
      wordAnalysis = transcript.words.map((w, idx) => ({
        word: w.text ?? w.word ?? "",
        start: typeof w.start === "number" ? w.start : null,
        end: typeof w.end === "number" ? w.end : null,
        confidence: typeof w.score === "number" ? w.score : w.confidence ?? null,
        wordIndex: idx
      }));
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
          corrected_text: correctedText || prompt,
          score,
          missing_words: analysis?.missing_words || [],
          word_analysis: wordAnalysis.length > 0 ? wordAnalysis : []
        }),
        roundId
      ]
    );

    console.log("✅ Speaking round processed:", roundId);
  } catch (err) {
    console.error("❌ Process speaking round error:", err);
  }
});

