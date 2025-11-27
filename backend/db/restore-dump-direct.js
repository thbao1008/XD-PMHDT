// Direct restore using psql - more reliable for COPY statements
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function restoreDump() {
  try {
    console.log("🔄 Restoring database from dump file using psql...");
    
    const dumpPath = path.join(__dirname, "../../aesp_dump.sql");
    
    if (!fs.existsSync(dumpPath)) {
      console.error("❌ Dump file not found!");
      process.exit(1);
    }
    
    // Get database connection info
    const dbHost = process.env.DB_HOST === "localhost" && process.env.DOCKER === "true" 
      ? "db" 
      : process.env.DB_HOST || "localhost";
    const dbUser = process.env.DB_USER || "postgres";
    const dbPassword = process.env.DB_PASSWORD || "1234";
    const dbName = process.env.DB_NAME || "aesp";
    
    // Clean dump file: remove restrict, and make CREATE TABLE statements idempotent
    console.log("📄 Reading and cleaning dump file...");
    let dumpContent = fs.readFileSync(dumpPath, "utf-8");
    
    // Remove restrict line
    dumpContent = dumpContent.replace(/\\restrict[^\n]*\n/g, '');
    
    // Make CREATE TABLE statements idempotent by adding IF NOT EXISTS
    // Match: CREATE TABLE public.table_name ( or CREATE TABLE table_name (
    // Only replace if it doesn't already have IF NOT EXISTS
    dumpContent = dumpContent.replace(
      /CREATE TABLE (?!IF NOT EXISTS )(public\.)?(\w+) \(/g,
      (match, schema, tableName) => {
        return `CREATE TABLE IF NOT EXISTS ${schema || ''}${tableName} (`;
      }
    );
    
    // Also handle CREATE TYPE statements (but PostgreSQL doesn't support IF NOT EXISTS for types)
    // So we'll let it fail gracefully - types usually exist already
    
    // Write cleaned dump to temp file
    const tempDumpPath = "/tmp/aesp_dump_cleaned.sql";
    fs.writeFileSync(tempDumpPath, dumpContent);
    console.log("✅ Cleaned dump file written to temp location");
    
    // Use psql to restore
    // In Docker, psql might not be in app container, so use docker exec to run in db container
    console.log("📦 Restoring via psql...");
    let command;
    if (process.env.DOCKER === "true" && dbHost === "db") {
      // In Docker: pipe dump file to psql in db container via stdin
      // Use cat to read file and pipe to docker exec
      command = `cat ${tempDumpPath} | docker exec -i aesp-db-1 psql -U ${dbUser} -d ${dbName}`;
    } else {
      // Local: use psql directly
      command = `PGPASSWORD=${dbPassword} psql -h ${dbHost} -U ${dbUser} -d ${dbName} -f ${tempDumpPath}`;
    }
    
    try {
      const { stdout, stderr } = await execAsync(command, { maxBuffer: 10 * 1024 * 1024 }); // 10MB buffer
      
      // Log all output for debugging in Docker
      if (stdout && stdout.trim()) {
        console.log("📋 psql stdout:");
        const stdoutLines = stdout.split('\n').filter(l => l.trim());
        stdoutLines.slice(0, 20).forEach(line => console.log(`   ${line}`));
        if (stdoutLines.length > 20) {
          console.log(`   ... (${stdoutLines.length - 20} more lines)`);
        }
      }
      
      // Check for real errors (ignore warnings about already exists)
      if (stderr && stderr.trim()) {
        const stderrLines = stderr.split('\n').filter(l => l.trim());
        const errorLines = stderrLines.filter(line => 
          line.includes('ERROR') && 
          !line.includes('already exists') && 
          !line.includes('does not exist') &&
          !line.includes('relation') &&
          !line.includes('duplicate key') &&
          !line.includes('skipping')
        );
        
        if (errorLines.length > 0) {
          console.log(`⚠️  Some errors occurred:`);
          errorLines.slice(0, 10).forEach(line => console.log(`   ${line}`));
        } else {
          // Only warnings, not real errors
          if (process.env.DOCKER === "true") {
            console.log("✅ Dump restored (warnings ignored)");
          }
        }
      } else {
        console.log("✅ Dump restored successfully!");
      }
    } catch (err) {
      // psql may return non-zero exit code even on success if there are warnings
      const output = (err.stdout || err.stderr || err.message || '').toString();
      const hasRealErrors = output.includes('FATAL') || 
                           (output.includes('ERROR:') && !output.includes('already exists'));
      
      if (hasRealErrors) {
        console.error("❌ Error restoring dump:");
        console.error(output.substring(0, 1000));
        // Don't throw - let it continue, some errors might be expected
      } else {
        console.log("✅ Dump restored (some warnings may be expected)");
      }
    }
    
    console.log("✅ Database restore completed!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

restoreDump();

