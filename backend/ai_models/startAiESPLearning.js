/**
 * Start AiESP Continuous Learning System
 * Tự động học liên tục từ OpenRouter
 */

import { spawn } from "child_process";
import path from "path";

const pythonScript = path.join(process.cwd(), "backend", "ai_models", "aiespContinuousLearning.py");

console.log("🚀 Starting AiESP Continuous Learning System...");
console.log("📚 OpenRouter will teach AiESP continuously");
console.log("🎯 Monitoring and improving models automatically");

const pythonProcess = spawn("python", [pythonScript, "continuous", "120"], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    PYTHONIOENCODING: "utf-8"
  }
});

pythonProcess.on("error", (err) => {
  console.error("❌ Error starting AiESP learning:", err);
  process.exit(1);
});

pythonProcess.on("exit", (code) => {
  console.log(`AiESP learning process exited with code ${code}`);
  process.exit(code);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Stopping AiESP learning...");
  pythonProcess.kill("SIGINT");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Stopping AiESP learning...");
  pythonProcess.kill("SIGTERM");
  process.exit(0);
});

