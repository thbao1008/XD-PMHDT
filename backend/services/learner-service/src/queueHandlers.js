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
  // Go up 4 levels: src -> learner-service -> services -> backend
  // .. -> learner-service
  // .. -> services
  // .. -> backend ✅
  return path.resolve(__dirname, "..", "..", "..", "..");
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
        // QUAN TRỌNG: Dùng analyzePronunciation trực tiếp thay vì gọi API
        // Để đảm bảo logic tính điểm dựa trên số từ đúng được áp dụng
        const { analyzePronunciation } = await import("./services/speakingPracticeService.js");
        
        // Lấy learner_id từ session
        const sessionInfo = await pool.query(
          `SELECT learner_id FROM speaking_practice_sessions WHERE id = $1`,
          [sessionId]
        );
        const learnerId = sessionInfo.rows[0]?.learner_id;
        
        analysis = await analyzePronunciation(transcriptText, prompt, level, roundId, sessionId, learnerId);
        score = Math.round(analysis.score || 0);
        feedback = analysis.feedback || "";
        errors = analysis.errors || [];
        correctedText = analysis.corrected_text || "";
        
        console.log(`✅ Queue handler: round ${roundId} analyzed, score=${score}, missing_words=${analysis?.missing_words?.length || 0}`);
      } catch (err) {
        console.error("❌ AI analysis error in queue handler:", err);
        console.error("❌ Error stack:", err.stack);
        
        // Fallback: Tính điểm dựa trên transcript matching nếu có
        if (transcriptText && transcriptText.trim()) {
          const transcriptWords = transcriptText.toLowerCase().split(/\s+/).filter(w => w.length > 0);
          const expectedWords = prompt.toLowerCase().split(/\s+/).filter(w => w.length > 0);
          
          // Tính số từ match
          const matchedWords = expectedWords.filter(ew => {
            const cleanExpected = ew.replace(/[.,!?;:]/g, "").trim();
            if (!cleanExpected) return false;
            return transcriptWords.some(tw => {
              const cleanTranscript = tw.replace(/[.,!?;:]/g, "").trim();
              if (!cleanTranscript) return false;
              if (cleanTranscript === cleanExpected) return true;
              if (cleanTranscript.length >= cleanExpected.length && cleanTranscript.includes(cleanExpected)) return true;
              if (cleanExpected.length >= cleanTranscript.length && cleanExpected.includes(cleanTranscript) && cleanTranscript.length >= 3) return true;
              return false;
            });
          });
          
          // Tính điểm dựa trên số từ đúng
          const fallbackScore = matchedWords.length > 0 
            ? Math.round((matchedWords.length / expectedWords.length) * 100)
            : 0;
          
          const missingWords = expectedWords.filter(ew => !matchedWords.includes(ew));
          
          score = fallbackScore;
          feedback = fallbackScore > 0 
            ? `Bạn đã nói đúng ${matchedWords.length}/${expectedWords.length} từ. ${missingWords.length > 0 ? `Cần cải thiện: ${missingWords.slice(0, 5).join(", ")}` : "Tuyệt vời!"}`
            : "Không thể phân tích chính xác. Vui lòng thử lại.";
          analysis = {
            score: fallbackScore,
            feedback: feedback,
            missing_words: missingWords,
            errors: [],
            corrected_text: prompt
          };
          
          console.log(`⚠️ Using fallback scoring: score=${fallbackScore}, matched=${matchedWords.length}/${expectedWords.length}`);
        } else {
          // Không có transcript
          feedback = "Bạn chưa nói gì. Hãy thử lại và nói to, rõ ràng.";
          score = 0;
          analysis = {
            score: 0,
            feedback: feedback,
            missing_words: prompt.toLowerCase().split(/\s+/).filter(w => w.length > 0),
            errors: [],
            corrected_text: prompt
          };
        }
      }
    } else {
      score = 0;
      feedback = "Bạn chưa nói gì. Hãy thử lại và nói to, rõ ràng.";
      analysis = {
        score: 0,
        feedback: feedback,
        missing_words: prompt.toLowerCase().split(/\s+/).filter(w => w.length > 0),
        errors: [],
        corrected_text: prompt
      };
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

    // Cập nhật database với kết quả (bao gồm missing_words để highlight từ sai)
    try {
      await pool.query(
        `UPDATE speaking_practice_rounds 
         SET transcript = $1, score = $2, analysis = $3
         WHERE id = $4`,
        [
          transcript ? JSON.stringify(transcript) : null,
          score,
          JSON.stringify({
            feedback,
            errors,
            corrected_text: correctedText || prompt,
            score,
            missing_words: analysis?.missing_words || [], // Các từ sai để highlight
            word_analysis: wordAnalysis.length > 0 ? wordAnalysis : []
          }),
          roundId
        ]
      );
      console.log(`✅ Queue handler: Updated round ${roundId} with score ${score}, missing_words=${analysis?.missing_words?.length || 0}`);
    } catch (dbErr) {
      console.error(`❌ Database update error in queue handler for round ${roundId}:`, dbErr);
    }

    console.log("✅ Speaking round processed:", roundId);
  } catch (err) {
    console.error("❌ Process speaking round error:", err);
  }
});

