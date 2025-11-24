import fs from "fs";
import path from "path";
import { spawn, execSync } from "child_process";

/**
 * Kiểm tra xem Python có thể import whisperx không
 */
function checkWhisperXAvailable(pythonCmd) {
  try {
    const [exec, ...flags] = pythonCmd.split(' ');
    const checkCmd = [...flags, '-c', 'import whisperx; print("OK")'];
    execSync(`${exec} ${checkCmd.join(' ')}`, { 
      stdio: 'ignore', 
      timeout: 5000,
      shell: process.platform === 'win32'
    });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Tự động tìm Python executable trên hệ thống có whisperx
 * Thử các tên phổ biến: python, python3, py (Windows launcher)
 */
export function findPythonExecutable() {
  const pythonCommands = process.platform === 'win32' 
    ? ['py -3', 'py', 'python', 'python3'] 
    : ['python3', 'python'];
  
  const foundPythons = [];
  
  // Bước 1: Tìm tất cả Python có sẵn
  for (const cmd of pythonCommands) {
    try {
      const [exec, ...flags] = cmd.split(' ');
      // Kiểm tra xem command có tồn tại không
      if (process.platform === 'win32') {
        if (exec === 'py') {
          // py launcher: thử -3 để lấy Python 3
          try {
            execSync(`py -3 --version`, { stdio: 'ignore', timeout: 2000, shell: true });
            foundPythons.push('py -3');
          } catch (e) {
            try {
              execSync(`py --version`, { stdio: 'ignore', timeout: 2000, shell: true });
              foundPythons.push('py');
            } catch (e2) {
              // Skip
            }
          }
        } else {
          try {
            execSync(`${exec} --version`, { stdio: 'ignore', timeout: 2000, shell: true });
            foundPythons.push(cmd);
          } catch (e) {
            // Skip
          }
        }
      } else {
        try {
          execSync(`${exec} --version`, { stdio: 'ignore', timeout: 2000 });
          foundPythons.push(cmd);
        } catch (e) {
          // Skip
        }
      }
    } catch (e) {
      // Skip
    }
  }
  
  // Bước 2: Kiểm tra xem Python nào có whisperx
  for (const cmd of foundPythons) {
    if (checkWhisperXAvailable(cmd)) {
      return cmd;
    }
  }
  
  // Fallback: trả về python hoặc python3
  return process.platform === 'win32' ? 'python' : 'python3';
}

/**
 * Chạy WhisperX để transcribe audio file
 * @param {string} audioPath - Đường dẫn đến file audio
 * @param {object} options - Options: {model, computeType}
 * @returns {Promise<{json: object, text: string}>}
 */
export async function runWhisperX(audioPath, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const pythonCmd = findPythonExecutable();
      // Get backend directory (go up from mentor-service/src/utils to backend)
      const backendDir = path.resolve(__dirname, "..", "..", "..");
      const whisperxPath = path.join(backendDir, "ai_models", "whisperx.py");
      
      if (!fs.existsSync(whisperxPath)) {
        return reject(new Error(`WhisperX script not found at ${whisperxPath}`));
      }
      
      const model = options.model || "base";
      const computeType = options.computeType || "float16";
      
      const args = [whisperxPath, audioPath, model, computeType];
      
      const pythonProcess = spawn(pythonCmd.split(' ')[0], pythonCmd.split(' ').slice(1).concat(args), {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: process.platform === 'win32',
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8'
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
        if (code !== 0) {
          console.error(`WhisperX exited with code ${code}:`, stderr);
          return reject(new Error(`WhisperX failed: ${stderr}`));
        }
        
        try {
          // Parse JSON output
          const jsonMatch = stdout.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const json = JSON.parse(jsonMatch[0]);
            const text = json.text || (json.segments || []).map(s => s.text || "").join(" ");
            resolve({ json, text });
          } else {
            reject(new Error("No JSON output from WhisperX"));
          }
        } catch (err) {
          reject(new Error(`Failed to parse WhisperX output: ${err.message}`));
        }
      });
      
      pythonProcess.on('error', (err) => {
        reject(new Error(`Failed to spawn WhisperX process: ${err.message}`));
      });
    } catch (err) {
      reject(err);
    }
  });
}

