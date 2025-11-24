#!/usr/bin/env node
/**
 * Script to start all microservices
 * Usage: node start-all-services.js
 */

import { spawn } from "child_process";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const services = [
  { name: "API Gateway", port: 4000, path: "api-gateway" },
  { name: "Notification Service", port: 4001, path: "notification-service" },
  { name: "Community Service", port: 4002, path: "community-service" },
  { name: "Package Service", port: 4003, path: "package-service" },
  { name: "Purchase Service", port: 4004, path: "purchase-service" },
  { name: "User Service", port: 4005, path: "user-service" },
  { name: "Mentor Service", port: 4006, path: "mentor-service" },
  { name: "Learner Service", port: 4007, path: "learner-service" },
  { name: "Admin Service", port: 4008, path: "admin-service" },
  { name: "AI Service", port: 4010, path: "ai-service" },
  { name: "File Service", port: 4011, path: "file-service" },
];

const processes = [];
let isShuttingDown = false;

// Function to check if PostgreSQL is running
function checkPostgreSQL() {
  const isWindows = process.platform === "win32";
  
  if (isWindows) {
    try {
      // Check if port 5432 is listening
      const checkCommand = `$conn = Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue; if ($conn) { Write-Output "OK" } else { Write-Output "NOT_RUNNING" }`;
      const result = execSync(`powershell -Command "${checkCommand}"`, { 
        encoding: "utf-8", 
        timeout: 3000,
        stdio: "pipe"
      });
      
      if (result && result.trim() === "NOT_RUNNING") {
        console.log("\n⚠️  WARNING: PostgreSQL is not running!");
        console.log("   All services will fail to connect to database.");
        console.log("   Please start PostgreSQL first:");
        console.log("   1. Run PowerShell as Administrator");
        console.log("   2. Run: Start-Service -Name \"postgresql-x64-18\"");
        console.log("   Or see: backend/services/START_DATABASE.md\n");
        return false;
      }
      return true;
    } catch (e) {
      // If check fails, assume it's running (don't block startup)
      return true;
    }
  }
  return true;
}

// Check if ports are already in use (for first-time kill only)
function arePortsInUse() {
  const isWindows = process.platform === "win32";
  if (!isWindows) return false;
  
  try {
    const checkCommand = `$ports = @(4000, 4001, 4002, 4003, 4004, 4005, 4006, 4007, 4008, 4009, 4010, 4011); $inUse = 0; foreach ($port in $ports) { $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue; if ($conns) { $inUse++ } }; Write-Output $inUse`;
    const result = execSync(`powershell -Command "${checkCommand}"`, { encoding: "utf-8", timeout: 3000 });
    const count = parseInt(result.trim(), 10);
    return count > 0;
  } catch (e) {
    return false; // Assume ports are free if check fails
  }
}

// Function to kill ALL processes before starting - COMPLETE CLEANUP (only if ports are in use)
function killAllProcessesBeforeStart() {
  const isWindows = process.platform === "win32";
  
  // Only kill if ports are actually in use (first time only)
  if (!arePortsInUse()) {
    console.log("✅ Ports are free, skipping kill step\n");
    return false; // No kill needed
  }
  
  if (isWindows) {
    console.log("🧹 Killing ALL processes on service ports and related processes...\n");
    
    const currentPid = process.pid;
    const ports = [4000, 4001, 4002, 4003, 4004, 4005, 4006, 4007, 4008, 4009, 4010, 4011, 5173];
    let killed = 0;
    
    // Step 1: Kill by port - DIRECT KILL (kill each port separately)
    ports.forEach(port => {
      try {
        const command = `$port = ${port}; $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue; if ($conns) { $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($procId in $pids) { if ($procId -and $procId -ne ${currentPid}) { try { taskkill /F /T /PID $procId 2>&1 | Out-Null; Start-Sleep -Milliseconds 200 } catch {} } } }`;
        execSync(`powershell -Command "${command}"`, { stdio: "ignore", timeout: 10000 });
        killed++;
      } catch (e) {
        // Ignore
      }
    });
    
    // Wait a bit for processes to die
    try {
      execSync(`powershell -Command "Start-Sleep -Seconds 2"`, { stdio: "ignore", timeout: 3000 });
    } catch (e) {
      // Ignore
    }
    
    // Step 2: Kill ALL node processes using service ports
    try {
      const killNodeCommand = `$ports = @(4000, 4001, 4002, 4003, 4004, 4005, 4006, 4007, 4008, 4009, 4010, 4011); $currentPid = ${currentPid}; Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $currentPid } | ForEach-Object { $procPorts = Get-NetTCPConnection -OwningProcess $_.Id -ErrorAction SilentlyContinue | Where-Object { $ports -contains $_.LocalPort }; if ($procPorts) { try { taskkill /F /T /PID $_.Id 2>&1 | Out-Null; Start-Sleep -Milliseconds 200 } catch {} } }`;
      execSync(`powershell -Command "${killNodeCommand}"`, { stdio: "ignore", timeout: 15000 });
    } catch (e) {
      // Ignore
    }
    
    // Step 3: Kill ALL npm processes
    try {
      const killNpmCommand = `$currentPid = ${currentPid}; Get-Process -Name npm -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $currentPid } | ForEach-Object { try { taskkill /F /T /PID $_.Id 2>&1 | Out-Null; Start-Sleep -Milliseconds 200 } catch {} }`;
      execSync(`powershell -Command "${killNpmCommand}"`, { stdio: "ignore", timeout: 10000 });
    } catch (e) {
      // Ignore
    }
    
    // Step 4: Stop PowerShell jobs
    try {
      execSync(`powershell -Command "Get-Job | ForEach-Object { Stop-Job -Id $_.Id -ErrorAction SilentlyContinue; Remove-Job -Id $_.Id -ErrorAction SilentlyContinue }"`, { stdio: "ignore", timeout: 3000 });
    } catch (e) {
      // Ignore
    }
    
    console.log(`✅ Killed processes on ${ports.length} ports\n`);
    return true; // Kill was performed
  }
  return false;
}

// Check PostgreSQL first
const dbRunning = checkPostgreSQL();

// Kill processes only if ports are in use (first time only)
const needsKill = killAllProcessesBeforeStart();

if (needsKill) {
  // Wait for ports to be fully released only if we killed something
  console.log("⏳ Waiting 5 seconds for ports to be released...\n");
  setTimeout(() => {
    startServices();
  }, 5000);
} else {
  // Ports are free, start immediately
  console.log("🚀 Starting services...\n");
  startServices();
}

// Function to kill API Gateway specifically (port 4000)
function killApiGateway() {
  const isWindows = process.platform === "win32";
  if (!isWindows) return;
  
  try {
    console.log("🔄 Restarting API Gateway (port 4000)...");
    const currentPid = process.pid;
    const command = `$port = 4000; $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue; if ($conns) { $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($procId in $pids) { if ($procId -and $procId -ne ${currentPid}) { try { taskkill /F /T /PID $procId 2>&1 | Out-Null; Start-Sleep -Milliseconds 500 } catch {} } } }`;
    execSync(`powershell -Command "${command}"`, { stdio: "ignore", timeout: 10000 });
    // Wait a bit for port to be released
    execSync(`powershell -Command "Start-Sleep -Seconds 1"`, { stdio: "ignore", timeout: 2000 });
  } catch (e) {
    // Ignore errors
  }
}

function startServices() {
  console.log("🚀 Starting all microservices...\n");

  // Kill API Gateway specifically before starting (to ensure clean restart)
  killApiGateway();

  services.forEach((service) => {
    const servicePath = path.join(__dirname, service.path);
    // Don't inherit stdin so parent can still receive Ctrl+C
    // Inherit stdout/stderr to see output
    // Use 'dev' script (with watch) for auto-reload on file changes
    const child = spawn("npm", ["run", "dev"], {
      cwd: servicePath,
      stdio: ["ignore", "inherit", "inherit"], // stdin: ignore, stdout/stderr: inherit
      shell: true,
      detached: false, // Ensure child processes are in same process group
      env: {
        ...process.env,
        NODE_OPTIONS: "--no-deprecation" // Suppress deprecation warnings
      }
    });

    child.on("error", (err) => {
      console.error(`❌ Error starting ${service.name}:`, err);
    });

    child.on("exit", (code) => {
      if (!isShuttingDown && code !== 0 && code !== null) {
        console.error(`❌ ${service.name} exited with code ${code}`);
      }
    });

    processes.push({ name: service.name, childProcess: child, port: service.port });
    console.log(`✅ Started ${service.name} on port ${service.port}`);
  });

  console.log("\n✨ All services started!");
  console.log("📡 API Gateway: http://localhost:4000");
  console.log("\nPress Ctrl+C to stop all services\n");
}

// Handle graceful shutdown
function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log("\n🛑 Shutting down all services...");
  
  // Kill all child processes
  const isWindows = process.platform === "win32";
  let killedCount = 0;
  
  processes.forEach(({ name, childProcess, port }) => {
    try {
      if (!childProcess.killed && childProcess.pid) {
        // On Windows, use taskkill to kill process tree (includes all child processes)
        if (isWindows) {
          try {
            // Kill the entire process tree (/Y = yes to all prompts)
            spawn("taskkill", ["/F", "/T", "/Y", "/PID", childProcess.pid.toString()], {
              shell: true,
              stdio: "ignore"
            });
            console.log(`   Stopped ${name} (PID: ${childProcess.pid})`);
            killedCount++;
          } catch (e) {
            // Fallback: try to kill by port
            try {
              spawn("powershell", [
                "-Command",
                `$conn = Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue; if ($conn) { Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue }`
              ], { shell: true, stdio: "ignore" });
              console.log(`   Stopped ${name} (by port ${port})`);
              killedCount++;
            } catch (e2) {
              // Try SIGTERM as last resort
              try {
                childProcess.kill("SIGTERM");
                console.log(`   Stopping ${name}...`);
                killedCount++;
              } catch (e3) {
                // Already dead
              }
            }
          }
        } else {
          childProcess.kill("SIGTERM");
          console.log(`   Stopping ${name}...`);
          killedCount++;
        }
      }
    } catch (err) {
      // Process might already be dead
    }
  });
  
  // On Windows, also kill any remaining processes on service ports immediately
  if (isWindows) {
    // Kill by port immediately (don't wait)
    services.forEach(({ port }) => {
      try {
        spawn("powershell", [
          "-Command",
          `Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }`
        ], { shell: true, stdio: "ignore" });
      } catch (e) {
        // Ignore errors
      }
    });
  }
  
  // Wait a bit then force exit
  setTimeout(() => {
    if (killedCount > 0) {
      console.log(`✅ Stopped ${killedCount} service(s)`);
    }
    console.log("✅ All services stopped");
    process.exit(0);
  }, 2000);
}

// Handle Ctrl+C - set up signal handlers before spawning
// This ensures parent process can receive SIGINT even when children inherit stdout/stderr
process.on("SIGINT", () => {
  // Write newline to ensure message appears on new line
  process.stdout.write("\n");
  shutdown();
});

process.on("SIGTERM", shutdown);

// On Windows, SIGINT might not propagate properly, so also handle it via stdin
// But only if stdin is available and not being used by children
if (process.platform === "win32" && process.stdin.isTTY) {
  // Keep stdin available to parent so we can catch Ctrl+C
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  
  process.stdin.on("data", (key) => {
    // Ctrl+C
    if (key === "\u0003" || key === "\x03") {
      process.stdout.write("\n");
      shutdown();
    }
    // Ctrl+D (EOF) - also shutdown
    if (key === "\u0004" || key === "\x04") {
      shutdown();
    }
  });
  
  // Cleanup on exit
  process.on("exit", () => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
  });
}

