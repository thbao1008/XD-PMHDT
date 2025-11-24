/**
 * FPT.AI TTS Service
 * Tích hợp FPT.AI Text-to-Speech API
 * Documentation: https://docs.fpt.ai/docs/en/speech/api/text-to-speech.html
 */

import https from 'https';
import http from 'http';

const FPT_AI_API_URL = 'https://api.fpt.ai/hmi/tts/v5';

/**
 * Giọng miền Bắc Việt Nam (chỉ sử dụng giọng miền Bắc):
 * - banmai: female northern (miền Bắc) - giọng nữ
 * - leminh: male northern (miền Bắc) - giọng nam
 */
const VIETNAMESE_NORTH_VOICES = {
  'female': 'thuminh',     // Giọng nữ miền Bắc
  'male': 'leminh'        // Giọng nam miền Bắc
};

/**
 * Tạo giọng nói từ text sử dụng FPT.AI TTS
 * @param {string} text - Text cần convert (3-5000 characters)
 * @param {string} voice - Tên giọng (banmai, lannhi, etc.)
 * @param {number} speed - Tốc độ (-3 đến +3, default 0)
 * @param {string} format - Format output (mp3 hoặc wav, default mp3)
 * @returns {Promise<{audioUrl: string, requestId: string}>}
 */
// Flag để chỉ log warning 1 lần
let hasLoggedWarning = false;

export async function generateSpeech(text, voice = 'banmai', speed = 0, format = 'mp3') {
  const apiKey = process.env.FPT_AI_API_KEY;
  
  if (!apiKey) {
    // Chỉ log warning 1 lần để tránh spam log
    if (!hasLoggedWarning) {
      console.warn('⚠️ FPT_AI_API_KEY is not configured in environment variables. Falling back to browser TTS.');
      hasLoggedWarning = true;
    }
    return null;
  }

  if (!text || text.length < 3) {
    throw new Error('Text must be at least 3 characters');
  }

  if (text.length > 5000) {
    throw new Error('Text must not exceed 5000 characters');
  }

  return new Promise((resolve, reject) => {
    const url = new URL(FPT_AI_API_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'api_key': apiKey,
        'voice': voice,
        'speed': speed.toString(),
        'format': format,
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Length': Buffer.byteLength(text, 'utf8')
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (response.error !== 0) {
            reject(new Error(response.message || 'FPT.AI TTS API error'));
            return;
          }

          // Response chứa async link - cần đợi một chút để file được tạo
          resolve({
            audioUrl: response.async,
            requestId: response.request_id,
            message: response.message
          });
        } catch (err) {
          reject(new Error(`Failed to parse FPT.AI response: ${err.message}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`FPT.AI TTS request failed: ${err.message}`));
    });

    req.write(text, 'utf8');
    req.end();
  });
}

/**
 * Đợi audio file sẵn sàng (poll async link)
 * @param {string} audioUrl - Async link từ FPT.AI
 * @param {number} maxWaitTime - Thời gian tối đa đợi (ms, default 120000 = 2 phút)
 * @param {number} pollInterval - Khoảng thời gian giữa các lần check (ms, default 2000)
 * @returns {Promise<Buffer>} - Audio data
 */
export async function waitForAudio(audioUrl, maxWaitTime = 120000, pollInterval = 2000) {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const checkAudio = () => {
      if (Date.now() - startTime > maxWaitTime) {
        reject(new Error('Timeout waiting for audio file'));
        return;
      }

      const url = new URL(audioUrl);
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + (url.search || ''),
        method: 'GET',
        headers: {
          'User-Agent': 'Node.js FPT TTS Client'
        }
      };

      const req = https.request(options, (res) => {
        if (res.statusCode === 200) {
          // File đã sẵn sàng
          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            resolve(Buffer.concat(chunks));
          });
        } else if (res.statusCode === 404) {
          // File chưa sẵn sàng, đợi thêm
          setTimeout(checkAudio, pollInterval);
        } else {
          reject(new Error(`Failed to fetch audio: HTTP ${res.statusCode}`));
        }
      });

      req.on('error', (err) => {
        // Có thể là file chưa sẵn sàng, thử lại
        setTimeout(checkAudio, pollInterval);
      });

      req.end();
    };

    // Bắt đầu check sau 2 giây (FPT.AI thường cần 5-10 giây)
    setTimeout(checkAudio, 2000);
  });
}

/**
 * Tạo giọng Việt Nam miền Bắc
 * @param {string} text - Text cần convert
 * @param {string} voiceType - 'male' hoặc 'female'
 * @param {number} speed - Tốc độ (-3 đến +3)
 * @returns {Promise<Buffer>} - Audio data
 */
export async function generateVietnameseNorthVoice(text, voiceType = 'female', speed = -1) {
  const voice = VIETNAMESE_NORTH_VOICES[voiceType] || VIETNAMESE_NORTH_VOICES['female'];
  
  // Gọi API để lấy async link
  const result = await generateSpeech(text, voice, speed, 'mp3');
  
  // Nếu API key không có hoặc lỗi, return null để fallback
  if (!result || !result.audioUrl) {
    return null;
  }
  
  // Đợi audio file sẵn sàng và download
  const audioData = await waitForAudio(result.audioUrl);
  
  return audioData;
}

/**
 * Tạo giọng nói và trả về base64 để frontend có thể phát ngay
 * Chỉ sử dụng giọng miền Bắc cho cả nam và nữ
 * @param {string} text - Text cần convert
 * @param {string} voiceType - 'male' hoặc 'female'
 * @param {string} voiceOrigin - 'native' hoặc 'asian'
 * @param {string} region - Không sử dụng, luôn dùng miền Bắc
 * @returns {Promise<{audioBase64: string, mimeType: string}>}
 */
export async function generateSpeechForFrontend(text, voiceType, voiceOrigin, region = 'north') {
  // Dùng FPT.AI cho giọng Việt Nam miền Bắc (cả nam và nữ)
  if (voiceOrigin === 'asian') {
    try {
      // Luôn dùng giọng miền Bắc
      // Tốc độ tự nhiên hơn: +1 (nhanh hơn một chút) để không giống đánh vần
      const speed = voiceType === 'female' ? 1 : 1; // Cả nam và nữ đều dùng tốc độ +1 (tự nhiên, không quá chậm)
      const audioData = await generateVietnameseNorthVoice(text, voiceType, speed);
      
      // Nếu không có audio data (API key missing hoặc lỗi), return null để fallback
      if (!audioData) {
        // Không log warning ở đây vì đã log ở generateSpeech
        return null;
      }
      
      const audioBase64 = audioData.toString('base64');
      return {
        audioBase64,
        mimeType: 'audio/mpeg' // MP3
      };
    } catch (err) {
      console.error('❌ FPT.AI TTS error:', err);
      // Fallback về SpeechSynthesis nếu FPT.AI fail
      return null;
    }
  }
  
  // Các giọng khác (bản địa) dùng SpeechSynthesis ở frontend
  return null;
}

