#!/usr/bin/env node
/**
 * Script tổng hợp để fix tất cả các lỗi thường gặp
 * Usage: node fix-all.js
 */

import { execSync } from "child_process";
import { existsSync, rmSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = __dirname;

const isWindows = process.platform === "win32";

console.log("🔧 Fix All Script - AESP\n");
console.log("=" .repeat(50));
console.log();

// Step 1: Kill all processes on service ports
console.log("Step 1: Killing processes on service ports...");
if (isWindows) {
  try {
    const ports = [4000, 4001, 4002, 4003, 4004, 4005, 4006, 4007, 4008, 4010, 4011, 5173];
    const currentPid = process.pid;
    
    ports.forEach(port => {
      try {
        const command = `$port = ${port}; $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue; if ($conns) { $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($procId in $pids) { if ($procId -and $procId -ne ${currentPid}) { try { taskkill /F /T /PID $procId 2>&1 | Out-Null } catch {} } } }`;
        execSync(`powershell -Command "${command}"`, { stdio: "ignore", timeout: 5000 });
      } catch (e) {
        // Ignore
      }
    });
    
    // Kill npm and node processes
    try {
      const killNodeCommand = `$currentPid = ${currentPid}; Get-Process -Name node,npm -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $currentPid } | ForEach-Object { try { taskkill /F /T /PID $_.Id 2>&1 | Out-Null } catch {} }`;
      execSync(`powershell -Command "${killNodeCommand}"`, { stdio: "ignore", timeout: 10000 });
    } catch (e) {
      // Ignore
    }
    
    console.log("✅ Killed processes on service ports\n");
    
    // Wait a bit
    execSync(`powershell -Command "Start-Sleep -Seconds 2"`, { stdio: "ignore", timeout: 3000 });
  } catch (e) {
    console.log("⚠️  Could not kill processes (may not be needed)\n");
  }
} else {
  console.log("⚠️  Windows-only feature, skipping...\n");
}

// Step 2: Clean node_modules and package-lock.json
console.log("Step 2: Cleaning node_modules and package-lock.json...");
const dirsToClean = [
  rootDir,
  join(rootDir, "frontend"),
  join(rootDir, "backend", "services")
];

let cleaned = 0;
dirsToClean.forEach(dir => {
  const nodeModulesPath = join(dir, "node_modules");
  const packageLockPath = join(dir, "package-lock.json");
  
  if (existsSync(nodeModulesPath)) {
    try {
      console.log(`   Removing ${nodeModulesPath}...`);
      rmSync(nodeModulesPath, { recursive: true, force: true });
      cleaned++;
    } catch (e) {
      console.log(`   ⚠️  Could not remove ${nodeModulesPath}`);
    }
  }
  
  if (existsSync(packageLockPath)) {
    try {
      console.log(`   Removing ${packageLockPath}...`);
      rmSync(packageLockPath, { force: true });
    } catch (e) {
      console.log(`   ⚠️  Could not remove ${packageLockPath}`);
    }
  }
});

if (cleaned > 0) {
  console.log(`✅ Cleaned ${cleaned} node_modules directories\n`);
} else {
  console.log("✅ No node_modules to clean\n");
}

// Step 3: Clear npm cache
console.log("Step 3: Clearing npm cache...");
try {
  execSync("npm cache clean --force", { stdio: "inherit", cwd: rootDir });
  console.log("✅ npm cache cleared\n");
} catch (e) {
  console.log("⚠️  Could not clear npm cache\n");
}

// Step 4: Install dependencies
console.log("Step 4: Installing dependencies...\n");

// Root
console.log("   Installing root dependencies...");
try {
  execSync("npm install", { stdio: "inherit", cwd: rootDir });
  console.log("   ✅ Root dependencies installed\n");
} catch (e) {
  console.log("   ❌ Failed to install root dependencies\n");
}

// Frontend
const frontendDir = join(rootDir, "frontend");
if (existsSync(join(frontendDir, "package.json"))) {
  console.log("   Installing frontend dependencies...");
  try {
    execSync("npm install", { stdio: "inherit", cwd: frontendDir });
    console.log("   ✅ Frontend dependencies installed\n");
  } catch (e) {
    console.log("   ❌ Failed to install frontend dependencies\n");
  }
}

// Backend Services
const backendServicesDir = join(rootDir, "backend", "services");
if (existsSync(join(backendServicesDir, "package.json"))) {
  console.log("   Installing backend services dependencies...");
  try {
    execSync("npm install", { stdio: "inherit", cwd: backendServicesDir });
    console.log("   ✅ Backend services dependencies installed\n");
  } catch (e) {
    console.log("   ❌ Failed to install backend services dependencies\n");
  }
}

// Step 5: Verify files
console.log("Step 5: Verifying required files...");
const requiredFiles = [
  { path: join(frontendDir, "index.html"), name: "Frontend index.html" },
  { path: join(frontendDir, "src", "main.jsx"), name: "Frontend main.jsx" },
  { path: join(frontendDir, "vite.config.js"), name: "Frontend vite.config.js" },
  { path: join(backendServicesDir, "start-all-services.js"), name: "Backend start-all-services.js" },
  { path: join(frontendDir, "start-frontend.js"), name: "Frontend start-frontend.js" }
];

let allFilesExist = true;
requiredFiles.forEach(({ path, name }) => {
  if (existsSync(path)) {
    console.log(`   ✅ ${name}`);
  } else {
    console.log(`   ❌ ${name} - MISSING`);
    allFilesExist = false;
  }
});

if (allFilesExist) {
  console.log("\n✅ All required files exist\n");
} else {
  console.log("\n⚠️  Some required files are missing\n");
}

// Step 6: Check PostgreSQL
console.log("Step 6: Checking PostgreSQL...");
if (isWindows) {
  try {
    const checkCommand = `$conn = Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue; if ($conn) { Write-Output "RUNNING" } else { Write-Output "NOT_RUNNING" }`;
    const result = execSync(`powershell -Command "${checkCommand}"`, { 
      encoding: "utf-8", 
      timeout: 3000,
      stdio: "pipe"
    });
    
    if (result && result.trim() === "RUNNING") {
      console.log("✅ PostgreSQL is running\n");
    } else {
      console.log("⚠️  PostgreSQL is NOT running");
      console.log("   Please start PostgreSQL:");
      console.log("   Start-Service -Name \"postgresql-x64-18\"\n");
    }
  } catch (e) {
    console.log("⚠️  Could not check PostgreSQL status\n");
  }
} else {
  console.log("⚠️  Windows-only check, skipping...\n");
}

// Summary
console.log("=" .repeat(50));
console.log("✨ Fix All Complete!");
console.log();
console.log("Next steps:");
console.log("1. Ensure PostgreSQL is running");
console.log("2. Run: npm run dev (to start all services)");
console.log("   Or: npm run dev:be:micro (backend only)");
console.log("   Or: npm run dev:fe (frontend only)");
console.log();
console.log("For more help, see:");
console.log("- QUICK_START_GUIDE.md");
console.log("- TROUBLESHOOTING.md");
console.log();

