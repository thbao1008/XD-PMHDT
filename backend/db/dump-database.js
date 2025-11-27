// Script to dump database using pg_dump
// Usage: node backend/db/dump-database.js
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function dumpDatabase() {
  try {
    console.log("🔄 Dumping database...");
    
    // Get database connection info
    const dbHost = process.env.DB_HOST || "localhost";
    const dbUser = process.env.DB_USER || "postgres";
    const dbPassword = process.env.DB_PASSWORD || "1234";
    const dbName = process.env.DB_NAME || "aesp";
    
    // Output file path
    const dumpPath = path.join(__dirname, "../../aesp_dump.sql");
    
    // Build pg_dump command
    // For Windows, use full path to pg_dump if available
    let pgDumpCmd = "pg_dump";
    
    // Check if we're on Windows and pg_dump is in Program Files
    if (process.platform === "win32") {
      const pgDumpPath = "C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe";
      if (fs.existsSync(pgDumpPath)) {
        pgDumpCmd = `"${pgDumpPath}"`;
      }
    }
    
    // Build command
    const command = `PGPASSWORD=${dbPassword} ${pgDumpCmd} --host ${dbHost} --port 5432 --username ${dbUser} --format=p --verbose --file "${dumpPath}" ${dbName}`;
    
    console.log(`📦 Running: ${pgDumpCmd} ...`);
    console.log(`   Host: ${dbHost}`);
    console.log(`   Database: ${dbName}`);
    console.log(`   Output: ${dumpPath}`);
    
    try {
      const { stdout, stderr } = await execAsync(command, { maxBuffer: 10 * 1024 * 1024 });
      
      if (stderr && stderr.trim()) {
        // pg_dump outputs to stderr for verbose mode, that's normal
        const errorLines = stderr.split('\n').filter(line => 
          line.includes('ERROR') || line.includes('FATAL')
        );
        if (errorLines.length > 0) {
          console.error("❌ Error during dump:");
          errorLines.forEach(line => console.error(`   ${line}`));
          process.exit(1);
        } else {
          console.log("✅ Dump completed successfully!");
          if (stderr) {
            // Show last few lines of verbose output
            const lines = stderr.split('\n').filter(l => l.trim());
            console.log(`   ${lines.slice(-3).join('\n   ')}`);
          }
        }
      } else {
        console.log("✅ Dump completed successfully!");
      }
      
      // Check if file was created
      if (fs.existsSync(dumpPath)) {
        const stats = fs.statSync(dumpPath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`📄 Dump file created: ${dumpPath} (${sizeMB} MB)`);
      } else {
        console.error("❌ Dump file was not created!");
        process.exit(1);
      }
      
      process.exit(0);
    } catch (err) {
      console.error("❌ Error running pg_dump:");
      console.error(err.message);
      if (err.stderr) {
        console.error("stderr:", err.stderr.substring(0, 500));
      }
      process.exit(1);
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

dumpDatabase();








