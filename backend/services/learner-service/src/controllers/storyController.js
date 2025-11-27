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

    // Debug: Log thông tin về file upload
    console.log("📤 processStoryMessage - File info:", {
      hasFile: !!req.file,
      fileName: req.file?.filename,
      fileSize: req.file?.size,
      filePath: req.file?.path,
      fileMimetype: req.file?.mimetype,
      hasText: !!text,
      sessionId: session_id
    });

    if (req.file) {
      audioUrl = `/uploads/${req.file.filename}`;
      console.log("✅ Audio file uploaded:", audioUrl, "Size:", req.file.size, "bytes");
    } else {
      console.warn("⚠️ No audio file in request. Request body:", Object.keys(req.body));
    }

    if (!text && !audioUrl) {
      console.error("❌ No text or audio provided");
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
 * Generate TTS audio using CSM (preferred) or FPT.AI (fallback)
 */
export async function generateTTS(req, res) {
  // Set timeout cho request (70 giây - đủ cho CSM load model lần đầu)
  let timeoutId = null;
  let responseSent = false;

  const sendResponse = (status, data) => {
    if (responseSent) return;
    responseSent = true;
    if (timeoutId) clearTimeout(timeoutId);
    if (!res.headersSent) {
      res.status(status).json(data);
    }
  };

  timeoutId = setTimeout(() => {
    sendResponse(504, { 
      success: false,
      message: "TTS request timeout, using browser TTS",
      fallback: true
    });
  }, 70000); // 70 giây timeout (đủ cho CSM 60s + buffer)

  try {
    const { text, voiceType, voiceOrigin, region, useCSM, context } = req.body;

    if (!text || text.length < 3) {
      return sendResponse(400, { message: "Text must be at least 3 characters" });
    }

    if (text.length > 5000) {
      return sendResponse(400, { message: "Text must not exceed 5000 characters" });
    }

    // Thử CSM trước nếu được yêu cầu hoặc mặc định
    const shouldUseCSM = useCSM !== false && process.env.USE_CSM_TTS !== 'false';
    
    if (shouldUseCSM) {
      try {
        const { generateCSMSpeech } = await import("../services/csmTtsService.js");
        
        // Map voiceType to speaker ID (0 = first speaker, 1 = second speaker)
        const speaker = voiceType === 'male' ? 1 : 0;
        
        const csmResult = await Promise.race([
          generateCSMSpeech(text, speaker, context || [], 10000),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('CSM TTS timeout')), 60000) // Tăng lên 60s cho lần load đầu
          )
        ]);

        if (csmResult.success) {
          return sendResponse(200, {
            success: true,
            audioBase64: csmResult.audioBase64,
            mimeType: csmResult.mimeType || 'audio/wav',
            source: 'csm'
          });
        } else {
          console.warn("⚠️ CSM TTS failed, falling back to FPT.AI:", csmResult.error);
          // Fall through to FPT.AI
        }
      } catch (err) {
        console.warn("⚠️ CSM TTS error, falling back to FPT.AI:", err.message);
        // Fall through to FPT.AI (only if headers not sent)
        if (responseSent) return;
      }
    }

    // Dùng FPT.AI cho giọng Việt Nam (cả nam và nữ) - fallback
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

        if (result) {
          return sendResponse(200, {
            success: true,
            audioBase64: result.audioBase64,
            mimeType: result.mimeType
          });
        }
      } catch (err) {
        console.error("❌ FPT.AI TTS error:", err);
        // Fallback: trả về null để frontend dùng SpeechSynthesis
        return sendResponse(200, {
          success: false,
          message: "FPT.AI TTS unavailable, using browser TTS",
          fallback: true
        });
      }
    }

    // Các giọng khác dùng SpeechSynthesis ở frontend
    return sendResponse(200, {
      success: false,
      message: "Use browser SpeechSynthesis for this voice type",
      fallback: true
    });
  } catch (err) {
    console.error("❌ generateTTS error:", err);
    return sendResponse(500, { message: err.message || "Server error" });
  }
}

