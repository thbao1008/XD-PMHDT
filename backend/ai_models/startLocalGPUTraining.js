/**
 * Start Local GPU Training
 * Tự động train với GPU local, dùng full hiệu suất GPU
 */

import { spawn } from "child_process";
import path from "path";

const pythonScript = path.join(process.cwd(), "backend", "ai_models", "localGPUTraining.py");
const command = process.argv[2] || "train-all";
const useWebLearning = process.argv.includes("--web-learning");

console.log(`🚀 Local GPU Training: ${command}...`);

const args = [pythonScript, command];
if (useWebLearning) {
  args.push("--web-learning");
}

// Detect NVIDIA GPU index from Python first
const checkGpuScript = path.join(process.cwd(), "backend", "ai_models", "localGPUTraining.py");
const checkGpuProcess = spawn("python", [checkGpuScript, "check-gpu"], {
  stdio: "pipe",
  shell: true,
  env: {
    ...process.env,
    PYTHONIOENCODING: "utf-8"
  }
});

let nvidiaGpuIndex = "0"; // Default to first GPU

checkGpuProcess.stdout.on("data", (data) => {
  try {
    const gpuInfo = JSON.parse(data.toString());
    if (gpuInfo.nvidia_gpu_available && gpuInfo.nvidia_gpu_index !== null) {
      nvidiaGpuIndex = String(gpuInfo.nvidia_gpu_index);
      console.log(`🎯 Detected NVIDIA GPU (rời) at index ${nvidiaGpuIndex}: ${gpuInfo.nvidia_gpu_name || 'NVIDIA GPU'}`);
    } else if (gpuInfo.cuda_available) {
      console.log(`⚠️  NVIDIA GPU not specifically detected, using first CUDA device`);
    }
  } catch (e) {
    // Ignore parse errors, use default
  }
});

checkGpuProcess.on("exit", () => {
  // Start training with detected NVIDIA GPU
  const pythonProcess = spawn("python", args, {
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      PYTHONIOENCODING: "utf-8",
      // Chỉ sử dụng NVIDIA GPU (rời), bỏ qua AMD GPU tích hợp
      CUDA_VISIBLE_DEVICES: nvidiaGpuIndex, // Chỉ hiển thị NVIDIA GPU
      PYTORCH_CUDA_ALLOC_CONF: "max_split_size_mb:512" // Optimize memory
    }
  });

  pythonProcess.on("error", (err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  });

  pythonProcess.on("exit", (code) => {
    if (code === 0) {
      console.log(`✅ Local GPU Training completed!`);
    } else {
      console.error(`❌ Failed with code ${code}`);
    }
    process.exit(code);
  });
});

pythonProcess.on("error", (err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});

pythonProcess.on("exit", (code) => {
  if (code === 0) {
    console.log(`✅ Local GPU Training completed!`);
  } else {
    console.error(`❌ Failed with code ${code}`);
  }
  process.exit(code);
});

