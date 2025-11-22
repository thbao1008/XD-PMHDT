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
          execSync(`${cmd} --version`, { stdio: 'ignore', timeout: 2000, shell: true });
          foundPythons.push(cmd);
        }
      } else {
        execSync(`which ${exec}`, { stdio: 'ignore', timeout: 2000 });
        foundPythons.push(cmd);
      }
    } catch (e) {
      // Command không tồn tại, thử tiếp
      continue;
    }
  }
  
  if (foundPythons.length === 0) {
    console.warn('[whisperxRunner] ⚠️  Could not find Python, using fallback: python');
    return 'python';
  }
  
  // Bước 2: Kiểm tra Python nào có whisperx
  console.log(`[whisperxRunner] Found ${foundPythons.length} Python installation(s): ${foundPythons.join(', ')}`);
  
  for (const pythonCmd of foundPythons) {
    console.log(`[whisperxRunner] Checking if ${pythonCmd} has whisperx...`);
    if (checkWhisperXAvailable(pythonCmd)) {
      console.log(`[whisperxRunner] ✅ ${pythonCmd} has whisperx installed`);
      return pythonCmd;
    } else {
      console.log(`[whisperxRunner] ⚠️  ${pythonCmd} does NOT have whisperx`);
    }
  }
  
  // Không tìm thấy Python nào có whisperx
  console.warn(`[whisperxRunner] ⚠️  None of the Python installations have whisperx installed`);
  console.warn(`[whisperxRunner] 💡 Please install whisperx: pip install whisperx`);
  console.warn(`[whisperxRunner] Using first available Python: ${foundPythons[0]}`);
  return foundPythons[0]; // Trả về Python đầu tiên, sẽ báo lỗi khi chạy
}

/**
 * Lấy đường dẫn tuyệt đối tới file upload từ req.file (multer)
 */
export function getLocalUploadPath(req) {
  if (!req || !req.file) return null;
  if (req.file.filename) {
    const uploadsDir = path.resolve(process.cwd(), "uploads");
    return path.join(uploadsDir, req.file.filename);
  }
  if (req.file.path) {
    return path.resolve(req.file.path);
  }
  return null;
}

/**
 * Chạy whisperx script an toàn bằng spawn
 */
export async function runWhisperX(localPath, opts = {}) {
  if (!localPath) throw new Error("localPath is required");

  const projectRoot = process.cwd();

  // ✅ Đã sửa đường dẫn đúng tới backend/ai_models/transcribe_whisperx.py
  const scriptPath = path.resolve(projectRoot, "backend", "ai_models", "transcribe_whisperx.py");

  if (!fs.existsSync(scriptPath)) {
    throw new Error(`whisperx script not found: ${scriptPath}`);
  }
  if (!fs.existsSync(localPath)) {
    throw new Error(`Input audio not found: ${localPath}`);
  }

  const outputsDir = path.resolve(projectRoot, "outputs");
  if (!fs.existsSync(outputsDir)) fs.mkdirSync(outputsDir, { recursive: true });

  const base = path.basename(localPath, path.extname(localPath));
  const outputPath = opts.outputPath || path.join(outputsDir, `${base}.json`);
  const model = opts.model || "base";
  // Không truyền computeType mặc định - để Python tự động phát hiện GPU và chọn float16
  const computeType = opts.computeType || null;
  const lang = opts.lang || null;
  const timeoutMs = typeof opts.timeoutMs === "number" ? opts.timeoutMs : 5 * 60 * 1000;

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

    const args = ["-u", scriptPath, localPath, "--output", outputPath, "--model", model];
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
      cwd: projectRoot, 
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
            return resolve({ json: parsed, outputPath });
          } catch (e) {
            try {
              const parsedStdout = stdout ? JSON.parse(stdout) : null;
              return resolve({ json: parsedStdout, outputPath: null });
            } catch (e2) {
              return reject(new Error(`whisperx finished but cannot parse output: ${e.message}`));
            }
          }
        } else {
          try {
            const parsedStdout = stdout ? JSON.parse(stdout) : null;
            if (parsedStdout) return resolve({ json: parsedStdout, outputPath: null });
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

/**
 * Helper: lấy file từ req và chạy transcription
 */
export async function transcribeFromReq(req, opts = {}) {
  const localPath = getLocalUploadPath(req);
  if (!localPath || !fs.existsSync(localPath)) {
    throw new Error(`Audio file missing on server: ${localPath}`);
  }

  try {
    const result = await runWhisperX(localPath, opts);
    return result;
  } catch (err) {
    throw err;
  }
}
