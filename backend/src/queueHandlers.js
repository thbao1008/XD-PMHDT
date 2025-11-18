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
