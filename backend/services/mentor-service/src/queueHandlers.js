// Mentor Service - Queue Handlers
import { registerProcessor } from "./utils/queue.js";
import { runWhisperX } from "./utils/whisperxRunner.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import pool from "./config/db.js";

/**
 * Tìm project root (đi lên từ mentor-service/src đến root)
 */
function getProjectRoot() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  // __dirname = backend/services/mentor-service/src
  // Đi lên 3 cấp: src -> mentor-service -> services -> backend
  return path.resolve(__dirname, "..", "..", "..");
}

function audioUrlToLocalPath(audioUrl) {
  // Handle both absolute URLs (http://localhost:4000/uploads/file.webm) and relative paths (/uploads/file.webm)
  let filename = null;
  
  // Try to extract filename from absolute URL
  try {
    const url = new URL(audioUrl);
    if (url.pathname.startsWith("/uploads/")) {
      filename = url.pathname.replace("/uploads/", "");
    }
  } catch (e) {
    // Not a valid URL, try as relative path
    const m = String(audioUrl || "").match(/\/uploads\/(.+)$/);
    if (m) {
      filename = m[1];
    }
  }
  
  if (!filename) {
    console.error(`[DEBUG] Cannot extract filename from audioUrl: ${audioUrl}`);
    return null;
  }
  
  // Tìm file ở root uploads/, không phải trong service directory
  const projectRoot = getProjectRoot();
  const localPath = path.resolve(projectRoot, "uploads", filename);
  return localPath;
}

// Queue handler để xử lý audio feedback từ mentor: transcribe và gửi cho AI học
registerProcessor("processMentorAudioFeedback", async (job) => {
  const { feedbackId, audioUrl, submissionId, scores } = job.data;
  console.log("🔄 Processing mentor audio feedback:", { feedbackId, audioUrl });

  if (!audioUrl) {
    console.warn("⚠️ No audio_url for feedback:", feedbackId);
    return;
  }

  const localPath = audioUrlToLocalPath(audioUrl);
  if (!localPath) {
    console.error("❌ Invalid audio URL format:", audioUrl);
    return;
  }
  
  if (!fs.existsSync(localPath)) {
    console.error("❌ Local audio file not found:", localPath);
    return;
  }

  try {
    console.log("🔊 Transcribing mentor feedback audio:", localPath);
    const { json: transcriptJson } = await runWhisperX(localPath, {
      model: "base",
      computeType: "float32",
      timeoutMs: 3 * 60 * 1000,
    });

    const transcriptText = transcriptJson?.text || 
      (transcriptJson?.segments || []).map(s => s.text || "").join(" ");

    if (!transcriptText || transcriptText.trim().length === 0) {
      console.warn("⚠️ Empty transcript for feedback:", feedbackId);
      return;
    }

    // Gửi cho AI Service để học
    try {
      // TODO: Replace with API call to AI Service
      const response = await fetch(`${process.env.AI_SERVICE_URL || 'http://localhost:4010'}/api/ai/mentor/learn-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback: transcriptText,
          scores,
          context: {
            feedback_id: feedbackId,
            submission_id: submissionId
          }
        })
      });

      if (response.ok) {
        const learningResult = await response.json();
        console.log("✅ AI learned from mentor feedback:", {
          feedbackId,
          criteria: learningResult.evaluation_criteria?.length || 0,
          suggestions: learningResult.improvement_suggestions?.length || 0
        });
      }
    } catch (err) {
      console.warn("⚠️ Failed to send feedback to AI Service:", err);
    }

    console.log("📝 Mentor feedback transcribed:", feedbackId);
  } catch (err) {
    console.error("❌ Process mentor audio feedback failed:", feedbackId, err);
  }
});

