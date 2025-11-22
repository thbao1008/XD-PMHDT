/**
 * Auto Start Local GPU Training
 * Tự động chạy training với GPU local liên tục
 */

import { spawn } from "child_process";
import path from "path";

const pythonScript = path.join(process.cwd(), "backend", "ai_models", "localGPUTraining.py");

console.log("🚀 Starting Auto Local GPU Training...");
console.log("   - Will check GPU every 10 minutes");
console.log("   - Will train automatically when GPU available");
console.log("   - Press Ctrl+C to stop");

// Check GPU first
console.log("\n📊 Checking GPU availability...");
const checkProcess = spawn("python", [pythonScript, "check-gpu"], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    PYTHONIOENCODING: "utf-8"
  }
});

checkProcess.on("exit", (code) => {
  if (code === 0) {
    console.log("\n✅ GPU check completed. Starting continuous training...\n");
    
    // Detect NVIDIA GPU index
    const checkGpuScript = path.join(process.cwd(), "backend", "ai_models", "localGPUTraining.py");
    const checkGpuProcess = spawn("python", [checkGpuScript, "check-gpu"], {
      stdio: "pipe",
      shell: true,
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8"
      }
    });

    let nvidiaGpuIndex = "0";

    checkGpuProcess.stdout.on("data", (data) => {
      try {
        const gpuInfo = JSON.parse(data.toString());
        if (gpuInfo.nvidia_gpu_available && gpuInfo.nvidia_gpu_index !== null) {
          nvidiaGpuIndex = String(gpuInfo.nvidia_gpu_index);
          console.log(`🎯 Using NVIDIA GPU (rời) at index ${nvidiaGpuIndex}`);
        }
      } catch (e) {
        // Ignore
      }
    });

    checkGpuProcess.on("exit", () => {
      // Start continuous learning (which includes local GPU training)
      const learningScript = path.join(process.cwd(), "backend", "ai_models", "aiespContinuousLearning.py");
      const learningProcess = spawn("python", [learningScript, "continuous"], {
        stdio: "inherit",
        shell: true,
        env: {
          ...process.env,
          PYTHONIOENCODING: "utf-8",
          CUDA_VISIBLE_DEVICES: nvidiaGpuIndex,  // Chỉ sử dụng NVIDIA GPU
          PYTORCH_CUDA_ALLOC_CONF: "max_split_size_mb:512"
        }
      });

    learningProcess.on("error", (err) => {
      console.error("❌ Error:", err);
      process.exit(1);
    });

    learningProcess.on("exit", (code) => {
      if (code === 0) {
        console.log("\n✅ Auto Local GPU Training completed!");
      } else {
        console.error(`\n❌ Failed with code ${code}`);
      }
      process.exit(code);
    });
  } else {
    console.error("\n❌ GPU check failed");
    process.exit(1);
  }
});

