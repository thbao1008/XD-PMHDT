/**
 * CSM TTS Service - Wrapper để gọi CSM Python service
 * CSM (Conversational Speech Model) từ Sesame AI Labs
 */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get project root
function getProjectRoot() {
  // __dirname = backend/services/learner-service/src/services
  // Đi lên 5 cấp: services -> src -> learner-service -> services -> backend -> root
  // .. -> src
  // .. -> learner-service  
  // .. -> services
  // .. -> backend
  // .. -> root (project root)
  return path.resolve(__dirname, "..", "..", "..", "..", "..");
}

const CSM_SERVICE_PATH = path.join(getProjectRoot(), "backend", "ai_models", "csm_service.py");
// Check both possible venv locations
const CSM_VENV_PYTHON_1 = path.join(getProjectRoot(), "backend", "ai_models", "csm", ".venv", "Scripts", "python.exe");
const CSM_VENV_PYTHON_2 = path.join(getProjectRoot(), "backend", "ai_models", ".venv", "Scripts", "python.exe");

/**
 * Get Python executable (prefer venv if available)
 */
function getPythonExecutable() {
  // Try csm/.venv first, then ai_models/.venv
  if (fs.existsSync(CSM_VENV_PYTHON_1)) {
    console.log(`✅ Using CSM venv Python: ${CSM_VENV_PYTHON_1}`);
    return CSM_VENV_PYTHON_1;
  }
  if (fs.existsSync(CSM_VENV_PYTHON_2)) {
    console.log(`✅ Using ai_models venv Python: ${CSM_VENV_PYTHON_2}`);
    return CSM_VENV_PYTHON_2;
  }
  console.log(`ℹ️ Using system Python (venv not found)`);
  return 'python'; // Fallback to system Python
}

/**
 * Check if CSM is available
 */
export async function checkCSMAvailable() {
  return new Promise((resolve) => {
    try {
      const pythonExe = getPythonExecutable();
      const pythonProcess = spawn(pythonExe, [CSM_SERVICE_PATH, 'check'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8',
          NO_TORCH_COMPILE: '1'
        }
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (e) {
            resolve({ success: false, available: false, error: 'Failed to parse response' });
          }
        } else {
          resolve({ success: false, available: false, error: stderr || 'CSM service error' });
        }
      });

      pythonProcess.on('error', (err) => {
        resolve({ success: false, available: false, error: err.message });
      });
    } catch (err) {
      resolve({ success: false, available: false, error: err.message });
    }
  });
}

/**
 * Generate speech từ text sử dụng CSM
 * @param {string} text - Text cần convert
 * @param {number} speaker - Speaker ID (0 hoặc 1, default 0)
 * @param {Array} context - Conversation context (optional)
 * @param {number} maxAudioLengthMs - Max audio length in milliseconds (default 10000)
 * @returns {Promise<{success: boolean, audioBase64?: string, mimeType?: string, error?: string}>}
 */
export async function generateCSMSpeech(text, speaker = 0, context = [], maxAudioLengthMs = 10000) {
  return new Promise((resolve, reject) => {
    try {
      if (!text || text.length < 1) {
        return resolve({ success: false, error: 'Text is required' });
      }

      // Log paths for debugging
      const projectRoot = getProjectRoot();
      console.log(`🔍 CSM Debug - Project root: ${projectRoot}`);
      console.log(`🔍 CSM Debug - CSM service path: ${CSM_SERVICE_PATH}`);
      console.log(`🔍 CSM Debug - CSM service exists: ${fs.existsSync(CSM_SERVICE_PATH)}`);
      
      if (!fs.existsSync(CSM_SERVICE_PATH)) {
        console.error(`❌ CSM service not found at: ${CSM_SERVICE_PATH}`);
        return resolve({ 
          success: false, 
          error: `CSM service not found at ${CSM_SERVICE_PATH}. Make sure CSM is installed.` 
        });
      }

      const inputData = JSON.stringify({
        text,
        speaker,
        context,
        max_audio_length_ms: maxAudioLengthMs
      });

      const pythonExe = getPythonExecutable();
      const pythonProcess = spawn(pythonExe, [CSM_SERVICE_PATH, 'generate'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8',
          NO_TORCH_COMPILE: '1'
        }
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Set timeout (60 seconds - longer for first model load)
      const timeout = setTimeout(() => {
        pythonProcess.kill();
        resolve({ 
          success: false, 
          error: 'CSM generation timeout (60s). Model may be loading for the first time or audio too long.' 
        });
      }, 60000);

      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            if (result.success) {
              resolve({
                success: true,
                audioBase64: result.audio_base64,
                mimeType: result.mime_type || 'audio/wav',
                sampleRate: result.sample_rate
              });
            } else {
              resolve({ success: false, error: result.error || 'CSM generation failed' });
            }
          } catch (e) {
            console.error('❌ Error parsing CSM response:', e);
            console.error('CSM stdout:', stdout);
            resolve({ success: false, error: 'Failed to parse CSM response' });
          }
        } else {
          console.error('❌ CSM service error:', stderr);
          resolve({ 
            success: false, 
            error: stderr || 'CSM service exited with error' 
          });
        }
      });

      pythonProcess.on('error', (err) => {
        clearTimeout(timeout);
        console.error('❌ Error spawning CSM service:', err);
        resolve({ success: false, error: `Failed to start CSM service: ${err.message}` });
      });

      // Send input data
      pythonProcess.stdin.write(inputData);
      pythonProcess.stdin.end();

    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
}

