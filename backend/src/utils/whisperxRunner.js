import fs from "fs";
import path from "path";
import { spawn } from "child_process";

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
  const computeType = opts.computeType || "float32";
  const lang = opts.lang || null;
  const timeoutMs = typeof opts.timeoutMs === "number" ? opts.timeoutMs : 5 * 60 * 1000;

  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      PYTHONIOENCODING: "utf-8",
      PYTHONUTF8: "1",
      CT2_COMPUTE_TYPE: computeType
    };

    const args = ["-u", scriptPath, localPath, "--output", outputPath, "--model", model, "--compute-type", computeType];
    if (lang) args.push("--lang", lang);

    const py = spawn("python", args, { cwd: projectRoot, env });

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
