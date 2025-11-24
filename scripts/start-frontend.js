#!/usr/bin/env node
/**
 * Script to start frontend with cleanup
 * Kills port 5173, verifies files, then starts Vite
 */

import { spawn, execSync } from "child_process";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Get root directory (parent of scripts)
const rootDir = join(__dirname, "..");
const frontendDir = join(rootDir, "frontend");

// Ensure we're in the right directory
process.chdir(rootDir);

const isWindows = process.platform === "win32";

console.log("🚀 Starting Frontend...\n");

// Step 1: Check if port 5173 is in use, only kill if needed (first time only)
let needsKill = false;
if (isWindows) {
  try {
    const checkCommand = `$conns = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue; if ($conns) { Write-Output "IN_USE" } else { Write-Output "FREE" }`;
    const result = execSync(`powershell -Command "${checkCommand}"`, { encoding: "utf-8", timeout: 3000 });
    if (result.trim() === "IN_USE") {
      needsKill = true;
      console.log("Step 1: Killing processes on port 5173...");
      const killCommand = `
        $conns = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue;
        if ($conns) {
          $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique;
          foreach ($pid in $pids) {
            if ($pid -and $pid -ne $PID) {
              try {
                taskkill /F /T /PID $pid 2>&1 | Out-Null;
              } catch {}
            }
          }
        }
      `;
      execSync(`powershell -Command "${killCommand}"`, { stdio: "ignore", timeout: 5000 });
      console.log("✅ Killed processes on port 5173\n");
      // Wait a bit for port to be released
      execSync(`powershell -Command "Start-Sleep -Seconds 2"`, { stdio: "ignore", timeout: 3000 });
    } else {
      console.log("✅ Port 5173 is free, skipping kill step\n");
    }
  } catch (e) {
    // Ignore errors, assume port is free
  }
}

// Step 2: Verify frontend files
console.log("Step 2: Verifying frontend files...");
const requiredFiles = [
  "index.html",
  "src/main.jsx",
  "vite.config.js"
];

let hasErrors = false;
for (const file of requiredFiles) {
  const filePath = join(frontendDir, file);
  if (!existsSync(filePath)) {
    console.error(`❌ Missing: ${file}`);
    hasErrors = true;
  }
}

if (!existsSync(join(frontendDir, "node_modules"))) {
  console.log("⚠️  node_modules not found. Installing dependencies...");
  try {
    execSync("npm install", { cwd: frontendDir, stdio: "inherit" });
  } catch (e) {
    console.error("❌ Failed to install dependencies");
    process.exit(1);
  }
}

if (hasErrors) {
  console.error("\n❌ Missing required files. Please check frontend directory.");
  process.exit(1);
}

console.log("✅ All required files found\n");

// Step 3: Start Vite
console.log("Step 3: Starting Vite dev server...\n");
console.log("📡 Frontend will be available at: http://localhost:5173\n");

const viteProcess = spawn("npm", ["run", "dev"], {
  cwd: frontendDir,
  stdio: "inherit",
  shell: true
});

viteProcess.on("error", (err) => {
  console.error("❌ Error starting Vite:", err);
  // Don't exit - let user see the error and fix it
  console.error("⚠️  Frontend will continue running. Please check the error above.");
});

viteProcess.on("exit", (code) => {
  // Only exit if it's a clean shutdown (code 0) or Ctrl+C
  // Don't exit on errors - let Vite handle retries
  if (code === 0 || code === null) {
    // Clean exit
    return;
  }
  // For other exit codes, log but don't exit
  // Vite might restart automatically or user can restart manually
  console.error(`⚠️  Vite exited with code ${code}`);
  console.error("⚠️  Frontend may need to be restarted. Check backend services are running.");
  // Don't exit - let the process continue
});

// Handle Ctrl+C
process.on("SIGINT", () => {
  console.log("\n🛑 Stopping frontend...");
  viteProcess.kill("SIGINT");
  process.exit(0);
});

process.on("SIGTERM", () => {
  viteProcess.kill("SIGTERM");
  process.exit(0);
});

