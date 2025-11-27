// AI Service - OpenRouter integration
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load .env from backend/ai_models/.env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Go up from ai-service/src/services to backend root
const backendRoot = path.resolve(__dirname, "..", "..", "..", "..");
// Try backend/ai_models/.env first, then fallback to backend/.env
const envPath1 = path.resolve(backendRoot, "ai_models", ".env");
const envPath2 = path.resolve(backendRoot, ".env");
if (fs.existsSync(envPath1)) {
  dotenv.config({ path: envPath1 });
  console.log(`✅ Loaded .env from: ${envPath1}`);
} else if (fs.existsSync(envPath2)) {
  dotenv.config({ path: envPath2 });
  console.log(`✅ Loaded .env from: ${envPath2}`);
} else {
  console.warn(`⚠️ .env file not found at ${envPath1} or ${envPath2}`);
  dotenv.config(); // Try default locations
}

const OR_BASE = process.env.OPENROUTER_API_BASE || "https://openrouter.ai/api/v1";
const OR_KEY = process.env.OPENROUTER_API_KEY;
const OR_MODEL = process.env.OPENROUTER_MODEL || "gpt-4o-mini";

if (!OR_KEY) {
  console.warn("OpenRouter key not set. Set OPENROUTER_API_KEY in .env - ai-service aiService.js:11");
}

/**
 * getFetch - ensure fetch is available (Node >=18 or node-fetch)
 */
async function getFetch() {
  if (typeof globalThis.fetch === "function") return globalThis.fetch.bind(globalThis);
  try {
    const mod = await import("node-fetch");
    return mod.default ?? mod;
  } catch (err) {
    throw new Error("No fetch available. Install node-fetch or run Node >= 18");
  }
}

/**
 * callAiESP - Call AiESP Python script for AI responses
 * messages: [{role, content}, ...]
 * opts: {task_type, temperature, max_tokens}
 */
export async function callAiESP(messages, opts = {}) {
  const { spawn } = await import("child_process");
  const path = await import("path");
  const { fileURLToPath } = await import("url");
  
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const backendDir = path.resolve(__dirname, "..", "..", "..", "..");
  const assistantPath = path.resolve(backendDir, "ai_models", "assistantAI.py");
  
  // Determine task type from system prompt or default
  const systemMessage = messages.find(m => m.role === "system");
  let taskType = opts.task_type || "conversation_ai";
  
  // Auto-detect task type from system prompt
  if (systemMessage?.content) {
    if (systemMessage.content.includes("speech") || systemMessage.content.includes("pronunciation")) {
      taskType = "speaking_practice";
    } else if (systemMessage.content.includes("alignment") || systemMessage.content.includes("challenge")) {
      taskType = "speaking_practice";
    }
  }
  
  return new Promise((resolve, reject) => {
    try {
      // Convert messages to input format for AiESP
      const lastMessage = messages[messages.length - 1];
      const userMessage = lastMessage?.content || "";
      const history = messages.slice(0, -1).map(m => ({
        role: m.role,
        content: m.content
      }));
      
      const inputData = {
        user_message: userMessage,
        history: history,
        system_prompt: systemMessage?.content || "",
        full_messages: messages // Pass full messages for complex tasks
      };
      
      const pythonProcess = spawn('python', [assistantPath, 'conversation', taskType], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
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
          reject(new Error(`AiESP error: ${stderr || 'Unknown error'}`));
          return;
        }
        
        try {
          // AiESP returns JSON string or plain text
          const response = stdout.trim();
          
          // Try to parse as JSON first (for structured responses)
          let parsedResponse;
          try {
            parsedResponse = JSON.parse(response);
          } catch {
            // If not JSON, use as plain text
            parsedResponse = response;
          }
          
          // Format as OpenRouter-like response
          resolve({
            choices: [{
              message: {
                role: "assistant",
                content: typeof parsedResponse === 'string' ? parsedResponse : JSON.stringify(parsedResponse)
              }
            }]
          });
        } catch (err) {
          reject(new Error(`AiESP parse error: ${err.message}`));
        }
      });
      
      pythonProcess.on('error', (err) => {
        reject(new Error(`AiESP spawn error: ${err.message}`));
      });
      
      // Send input data
      pythonProcess.stdin.write(JSON.stringify(inputData));
      pythonProcess.stdin.end();
      
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * callOpenRouter - generic wrapper to call OpenRouter-like chat completions
 * Mặc định dùng OpenRouter, có thể dùng AiESP cho training (use_aiesp: true)
 * messages: [{role, content}, ...]
 * opts: {temperature, max_tokens, task_type, use_aiesp}
 */
export async function callOpenRouter(messages, opts = {}) {
  // Chỉ dùng AiESP nếu explicitly yêu cầu (cho training)
  const useAiESP = opts.use_aiesp === true;
  
  if (useAiESP) {
    try {
      const result = await callAiESP(messages, opts);
      return result;
    } catch (err) {
      console.warn(`⚠️ AiESP failed, falling back to OpenRouter: ${err.message}`);
      // Fall through to OpenRouter
    }
  }
  
  // Mặc định dùng OpenRouter
  if (!OR_KEY) {
    const err = new Error("AI provider not configured (OPENROUTER_API_KEY missing)");
    err.status = 503;
    err.code = "API_KEY_MISSING";
    throw err;
  }
  
  const fetchFn = await getFetch();
  const model = opts.model || OR_MODEL;
  const body = {
    model: model,
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.max_tokens ?? 800
  };

  const res = await fetchFn(`${OR_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OR_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "<no body>");
    let errorMessage = `AI provider error ${res.status}: ${txt}`;
    
    // Provide helpful error messages
    if (res.status === 401) {
      try {
        const errorJson = JSON.parse(txt);
        if (errorJson.error?.message?.includes("User not found")) {
          errorMessage = `OpenRouter API key is invalid or expired. Please check your OPENROUTER_API_KEY in .env file. Original error: ${txt}`;
        } else {
          errorMessage = `OpenRouter authentication failed. Please verify your OPENROUTER_API_KEY. Original error: ${txt}`;
        }
      } catch (e) {
        errorMessage = `OpenRouter authentication failed (401). Please check your OPENROUTER_API_KEY in .env file.`;
      }
    } else if (res.status === 429) {
      errorMessage = `OpenRouter rate limit exceeded. Please try again later. Original error: ${txt}`;
    } else if (res.status === 402) {
      // Parse error để lấy số tokens có thể afford
      try {
        const errorJson = JSON.parse(txt);
        const errorMsg = errorJson.error?.message || txt;
        // Extract số tokens có thể afford từ message
        const affordMatch = errorMsg.match(/can only afford (\d+)/i);
        const maxAffordableTokens = affordMatch ? parseInt(affordMatch[1]) : null;
        
        errorMessage = `OpenRouter payment required. Please check your account balance. Original error: ${txt}`;
        
        const err = new Error(errorMessage);
        err.status = res.status;
        err.code = "PAYMENT_REQUIRED";
        err.maxAffordableTokens = maxAffordableTokens; // Thêm thông tin tokens có thể afford
        throw err;
      } catch (e) {
        // Nếu e là error đã throw ở trên, re-throw nó
        if (e.status === 402 && e.code === "PAYMENT_REQUIRED") {
          throw e;
        }
        // Nếu là lỗi parse JSON, tạo error mới
        errorMessage = `OpenRouter payment required. Please check your account balance. Original error: ${txt}`;
        const err = new Error(errorMessage);
        err.status = res.status;
        err.code = "PAYMENT_REQUIRED";
        throw err;
      }
    }
    
    const err = new Error(errorMessage);
    err.status = res.status;
    err.code = res.status === 401 ? "API_KEY_INVALID" : "API_ERROR";
    throw err;
  }

  return res.json();
}

/**
 * transcribeWithWhisperX - run local Python whisperx transcriber and return parsed JSON or text
 * localPath: path to audio file
 * returns: { json: <full whisperx json>, text: <joined words text> }
 */
export async function transcribeWithWhisperX(localPath) {
  // Use backendDir defined at top of file
  const outDir = path.resolve(backendDir, "outputs");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outputPath = path.join(outDir, path.basename(localPath).replace(/\.[^/.]+$/, ".json"));

  return new Promise((resolve, reject) => {
    // Use python script that prints JSON to stdout; we redirect to file for reliability
    const cmd = `python whisperx/transcribe_whisperx.py "${localPath}" > "${outputPath}"`;
    exec(cmd, (err) => {
      if (err) return reject(err);
      try {
        const raw = fs.readFileSync(outputPath, "utf-8");
        const json = JSON.parse(raw);
        const text = (json.words || []).map(w => w.text).join(" ");
        resolve({ json, text });
      } catch (e) {
        reject(e);
      }
    });
  });
}

/**
 * compareTranscript - simple token-level comparison helper
 * transcript: string
 * sampleText: string
 * wordSegments: optional array of {word,start,end,score}
 */
export function compareTranscript(transcript, sampleText, wordSegments = []) {
  const transcriptWords = (transcript || "").toLowerCase().split(/\s+/).filter(Boolean);
  const sampleWords = (sampleText || "").toLowerCase().split(/\s+/).filter(Boolean);

  return transcriptWords.map((word, idx) => {
    const expected = sampleWords[idx] || null;
    const segment = wordSegments[idx] || {};
    return {
      word,
      expected,
      correct: expected === word,
      start: segment.start ?? null,
      end: segment.end ?? null,
      confidence: segment.score ?? null
    };
  });
}

/**
 * safeParseJSON - helper to parse AI responses
 */
export function safeParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    return null;
  }
}

