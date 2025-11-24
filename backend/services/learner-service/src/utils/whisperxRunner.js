import fs from "fs";
import path from "path";
import { spawn, execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
 * Tìm project root (đi lên từ learner-service/src/utils đến root)
 */
function getProjectRoot() {
  // __dirname = backend/services/learner-service/src/utils
  // Đi lên 3 cấp: utils -> src -> learner-service -> services -> backend
  return path.resolve(__dirname, "..", "..", "..", "..");
}

/**
 * Chạy WhisperX để transcribe audio file
 * @param {string} audioPath - Đường dẫn đến file audio
 * @param {object} options - Options: {model, computeType, outputPath, timeoutMs}
 * @returns {Promise<{json: object, text: string, outputPath?: string}>}
 */
export async function runWhisperX(audioPath, options = {}) {
  if (!audioPath) throw new Error("audioPath is required");

  const backendDir = getProjectRoot();
  
  // ✅ Sửa đường dẫn đúng tới backend/ai_models/transcribe_whisperx.py
  const scriptPath = path.resolve(backendDir, "ai_models", "transcribe_whisperx.py");
  
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`WhisperX script not found at ${scriptPath}`);
  }
  if (!fs.existsSync(audioPath)) {
    throw new Error(`Input audio not found: ${audioPath}`);
  }

  const outputsDir = path.resolve(backendDir, "outputs");
  if (!fs.existsSync(outputsDir)) fs.mkdirSync(outputsDir, { recursive: true });

  const base = path.basename(audioPath, path.extname(audioPath));
  const outputPath = options.outputPath || path.join(outputsDir, `${base}.json`);
  const model = options.model || "base";
  // Không truyền computeType mặc định - để Python tự động phát hiện GPU và chọn float16
  const computeType = options.computeType || null;
  const lang = options.lang || null;
  const timeoutMs = typeof options.timeoutMs === "number" ? options.timeoutMs : 5 * 60 * 1000;

  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      PYTHONIOENCODING: "utf-8",
      PYTHONUTF8: "1"
    };
    
    // Chỉ set CT2_COMPUTE_TYPE nếu có computeType được chỉ định
    if (computeType) {
      env.CT2_COMPUTE_TYPE = computeType;
    }

    const args = ["-u", scriptPath, audioPath, "--output", outputPath, "--model", model];
    // Chỉ thêm --compute-type nếu được chỉ định
    if (computeType) {
      args.push("--compute-type", computeType);
    }
    if (lang) args.push("--lang", lang);

    // Tự động tìm Python executable
    const pythonCmd = findPythonExecutable();
    console.log(`[whisperxRunner] Using Python command: ${pythonCmd}`);
    
    // Nếu pythonCmd có flag (như "py -3"), split ra
    const [pythonExec, ...pythonFlags] = pythonCmd.split(' ');
    const finalArgs = [...pythonFlags, ...args];
    
    const py = spawn(pythonExec, finalArgs, { 
      cwd: backendDir, 
      env, 
      shell: process.platform === 'win32' // Windows cần shell để tìm py launcher
    });

    let stderr = "";
    let stdout = "";
    let killedByTimeout = false;

    const timer = setTimeout(() => {
      killedByTimeout = true;
      try { py.kill("SIGKILL"); } catch (e) {}
    }, timeoutMs);

    py.stdout.on("data", (d) => { stdout += d.toString(); });
    py.stderr.on("data", (d) => { 
      const stderrStr = d.toString();
      // Ignore pkg_resources deprecation warnings
      if (!stderrStr.includes("pkg_resources is deprecated")) {
        stderr += stderrStr;
      }
    });

    py.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to spawn python: ${err.message}`));
    });

    py.on("close", (code, signal) => {
      clearTimeout(timer);
      if (killedByTimeout) {
        return reject(new Error(`whisperx timed out after ${timeoutMs}ms`));
      }

      if (code === 0) {
        if (fs.existsSync(outputPath)) {
          try {
            const txt = fs.readFileSync(outputPath, "utf8");
            const parsed = JSON.parse(txt);
            const text = parsed.text || (parsed.segments || []).map(s => s.text || "").join(" ");
            return resolve({ json: parsed, text, outputPath });
          } catch (e) {
            try {
              const parsedStdout = stdout ? JSON.parse(stdout) : null;
              if (parsedStdout) {
                const text = parsedStdout.text || (parsedStdout.segments || []).map(s => s.text || "").join(" ");
                return resolve({ json: parsedStdout, text, outputPath: null });
              }
              return reject(new Error(`whisperx finished but cannot parse output: ${e.message}`));
            } catch (e2) {
              return reject(new Error(`whisperx finished but cannot parse output: ${e.message}`));
            }
          }
        } else {
          try {
            const parsedStdout = stdout ? JSON.parse(stdout) : null;
            if (parsedStdout) {
              const text = parsedStdout.text || (parsedStdout.segments || []).map(s => s.text || "").join(" ");
              return resolve({ json: parsedStdout, text, outputPath: null });
            }
            return reject(new Error("whisperx finished but no output file and stdout is not JSON"));
          } catch (e) {
            return reject(new Error("whisperx finished but no output file and stdout is not JSON"));
          }
        }
      } else {
        const msg = stderr || stdout || `Exited with code ${code} (signal ${signal})`;
        
        // Kiểm tra nếu lỗi là ModuleNotFoundError: No module named 'whisperx'
        if (msg.includes("ModuleNotFoundError") && msg.includes("whisperx")) {
          const errorMsg = `whisperx module not found in Python environment.\n` +
            `Python command used: ${pythonCmd}\n` +
            `Please install whisperx: ${pythonCmd.split(' ')[0]} -m pip install whisperx\n` +
            `Full error: ${msg}`;
          return reject(new Error(errorMsg));
        }
        
        return reject(new Error(`whisperx exited ${code}. stderr: ${msg}`));
      }
    });
  });
}

