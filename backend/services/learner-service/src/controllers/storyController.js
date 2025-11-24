// backend/src/controllers/storyController.js
import * as storyService from "../services/storyService.js";
import * as fptTtsService from "../services/fptTtsService.js";
import pool from "../config/db.js";

/**
 * Tạo session mới cho story mode
 */
export async function createStorySession(req, res) {
  try {
    const { learner_id, user_id } = req.body;

    const session = await storyService.createStorySession(learner_id, user_id);

    res.json({
      session_id: session.id,
      initial_message: session.initial_message
    });
  } catch (err) {
    console.error("❌ createStorySession error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
}

/**
 * Xử lý message trong story mode
 */
export async function processStoryMessage(req, res) {
  try {
    const { session_id, text } = req.body;
    let audioUrl = null;

    if (req.file) {
      audioUrl = `/uploads/${req.file.filename}`;
    }

    if (!text && !audioUrl) {
      return res.status(400).json({ message: "No text or audio provided" });
    }

    // Validate và parse session_id
    let parsedSessionId = null;
    if (session_id && session_id !== "null" && session_id !== null) {
      parsedSessionId = parseInt(session_id, 10);
      if (isNaN(parsedSessionId)) {
        return res.status(400).json({ message: "Invalid session_id" });
      }
    }

    if (!parsedSessionId) {
      return res.status(400).json({ message: "session_id is required" });
    }

    const result = await storyService.processStoryMessage(
      parsedSessionId,
      text || null,
      audioUrl
    );

    // Trả về cả response, transcript text và transcript JSON nếu có
    res.json({ 
      response: result.response || result,
      transcript: result.transcript || text || null,
      transcriptJson: result.transcriptJson || null // Full transcript với words và timings
    });
  } catch (err) {
    console.error("❌ processStoryMessage error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
}

/**
 * Lấy conversation history của session
 */
export async function getStoryHistory(req, res) {
  try {
    const { session_id } = req.params;
    
    if (!session_id) {
      return res.status(400).json({ message: "session_id is required" });
    }
    
    const parsedSessionId = parseInt(session_id, 10);
    if (isNaN(parsedSessionId)) {
      return res.status(400).json({ message: "Invalid session_id" });
    }
    
    const result = await pool.query(
      `SELECT 
        id,
        message_type,
        text_content,
        audio_url,
        transcript,
        ai_response,
        created_at
       FROM story_conversations 
       WHERE session_id = $1 
       ORDER BY created_at ASC`,
      [parsedSessionId]
    );
    
    res.json({
      success: true,
      conversations: result.rows.map(row => {
        // Xử lý transcript - có thể đã là object hoặc JSON string
        let transcriptJson = null;
        if (row.transcript) {
          try {
            if (typeof row.transcript === 'string') {
              transcriptJson = JSON.parse(row.transcript);
            } else if (typeof row.transcript === 'object') {
              transcriptJson = row.transcript;
            }
          } catch (e) {
            console.warn("Could not parse transcript:", e);
            transcriptJson = null;
          }
        }
        
        return {
          id: row.id,
          type: row.message_type,
          text: row.text_content || row.ai_response,
          audioUrl: row.audio_url,
          transcriptJson: transcriptJson,
          timestamp: row.created_at
        };
      })
    });
  } catch (err) {
    console.error("❌ getStoryHistory error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
}

/**
 * Generate TTS audio using FPT.AI
 */
export async function generateTTS(req, res) {
  // Set timeout cho request (30 giây)
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ 
        success: false,
        message: "TTS request timeout, using browser TTS",
        fallback: true
      });
    }
  }, 30000); // 30 giây timeout

  try {
    const { text, voiceType, voiceOrigin, region } = req.body;

    if (!text || text.length < 3) {
      clearTimeout(timeout);
      return res.status(400).json({ message: "Text must be at least 3 characters" });
    }

    if (text.length > 5000) {
      clearTimeout(timeout);
      return res.status(400).json({ message: "Text must not exceed 5000 characters" });
    }

    // Dùng FPT.AI cho giọng Việt Nam (cả nam và nữ)
    if (voiceOrigin === 'asian') {
      try {
        // Luôn dùng giọng miền Bắc, bỏ qua region parameter
        // Thêm timeout ngắn hơn (20 giây) cho FPT.AI
        const result = await Promise.race([
          fptTtsService.generateSpeechForFrontend(
            text,
            voiceType,
            voiceOrigin,
            'north' // Luôn dùng miền Bắc
          ),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('FPT.AI TTS timeout')), 20000)
          )
        ]);

        clearTimeout(timeout);
        if (result) {
          return res.json({
            success: true,
            audioBase64: result.audioBase64,
            mimeType: result.mimeType
          });
        }
      } catch (err) {
        clearTimeout(timeout);
        console.error("❌ FPT.AI TTS error:", err);
        // Fallback: trả về null để frontend dùng SpeechSynthesis
        return res.json({
          success: false,
          message: "FPT.AI TTS unavailable, using browser TTS",
          fallback: true
        });
      }
    }

    clearTimeout(timeout);
    // Các giọng khác dùng SpeechSynthesis ở frontend
    return res.json({
      success: false,
      message: "Use browser SpeechSynthesis for this voice type",
      fallback: true
    });
  } catch (err) {
    clearTimeout(timeout);
    console.error("❌ generateTTS error:", err);
    if (!res.headersSent) {
      res.status(500).json({ message: err.message || "Server error" });
    }
  }
}

