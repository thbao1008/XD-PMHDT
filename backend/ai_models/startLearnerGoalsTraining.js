/**
 * Start Training AiESP cho 3 mục tiêu của learner
 */

import { spawn } from "child_process";
import path from "path";

const pythonScript = path.join(process.cwd(), "backend", "ai_models", "trainAiESPForLearnerGoals.py");

console.log(`🎯 Training AiESP for 3 learner goals...`);

const pythonProcess = spawn("python", [pythonScript], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    PYTHONIOENCODING: "utf-8"
  }
});

pythonProcess.on("error", (err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});

pythonProcess.on("exit", (code) => {
  if (code === 0) {
    console.log(`✅ Training samples generated successfully`);
    console.log(`\n📚 Next steps:`);
    console.log(`   1. Train models: python backend/ai_models/assistantAI.py train speaking_practice`);
    console.log(`   2. Train models: python backend/ai_models/assistantAI.py train conversation_ai`);
    console.log(`   3. Train models: python backend/ai_models/assistantAI.py train game_conversation`);
  } else {
    console.error(`❌ Failed with code ${code}`);
  }
  process.exit(code);
});

