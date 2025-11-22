/**
 * Start AiESP Sample Generation
 * Tự động tạo training samples cho AiESP
 */

import { spawn } from "child_process";
import path from "path";

const pythonScript = path.join(process.cwd(), "backend", "ai_models", "aiespSampleGenerator.py");
const taskType = process.argv[2] || "conversation_ai";
const count = parseInt(process.argv[3]) || 50;

console.log(`🎲 Generating ${count} training samples for ${taskType}...`);

const pythonProcess = spawn("python", [pythonScript, "generate", taskType, count.toString()], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    PYTHONIOENCODING: "utf-8"
  }
});

pythonProcess.on("error", (err) => {
  console.error("❌ Error generating samples:", err);
  process.exit(1);
});

pythonProcess.on("exit", (code) => {
  if (code === 0) {
    console.log(`✅ Generated ${count} samples for ${taskType}`);
  } else {
    console.error(`❌ Sample generation failed with code ${code}`);
  }
  process.exit(code);
});

