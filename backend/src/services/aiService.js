// backend/src/services/aiService.js
import { exec } from "child_process";
import path from "path";
import fs from "fs";

const OR_BASE = process.env.OPENROUTER_API_BASE || "https://openrouter.ai/api/v1";
const OR_KEY = process.env.OPENROUTER_API_KEY;
const OR_MODEL = process.env.OPENROUTER_MODEL || "gpt-4o-mini";

if (!OR_KEY) {
  console.warn("OpenRouter key not set. Set OPENROUTER_API_KEY in .env - aiService.js:11");
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
 * callOpenRouter - generic wrapper to call OpenRouter-like chat completions
 * messages: [{role, content}, ...]
 * opts: {temperature, max_tokens}
 */
export async function callOpenRouter(messages, opts = {}) {
  if (!OR_KEY) throw new Error("AI provider not configured (OPENROUTER_API_KEY missing)");
  const fetchFn = await getFetch();
  const body = {
    model: OR_MODEL,
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
    const err = new Error(`AI provider error ${res.status}: ${txt}`);
    err.status = res.status;
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
  const outDir = path.resolve(process.cwd(), "outputs");
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
