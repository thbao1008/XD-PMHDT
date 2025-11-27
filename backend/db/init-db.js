// Script to restore database from dump file
// This should run before seeding data
import pool from "../src/config/db.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase() {
  try {
    console.log("🔄 Restoring database from dump file...");
    
    const dumpPath = path.join(__dirname, "../../aesp_dump.sql");
    
    if (!fs.existsSync(dumpPath)) {
      console.log("⚠️  Dump file not found, using init.sql instead...");
      await initFromSchema();
      await pool.end();
      return;
    }
    
    // Get database connection info
    const dbHost = process.env.DB_HOST === "localhost" && process.env.DOCKER === "true" 
      ? "db" 
      : process.env.DB_HOST || "localhost";
    const dbUser = process.env.DB_USER || "postgres";
    const dbPassword = process.env.DB_PASSWORD || "1234";
    const dbName = process.env.DB_NAME || "aesp";
    const dbPort = process.env.DB_PORT || 5432;
    
    // Check if we're in Docker
    const isDocker = process.env.DOCKER === "true" || fs.existsSync("/.dockerenv");
    
    // Always use Node.js method for better error handling
    console.log("💻 Restoring dump via Node.js...");
    await restoreViaNode(dumpPath);
    
    await pool.end();
    console.log("✅ Database initialization completed!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Database initialization error:", err);
    await pool.end();
    process.exit(1);
  }
}

async function restoreViaNode(dumpPath) {
  // Try using psql first (more reliable for dump files)
  const dbHost = process.env.DB_HOST === "localhost" && process.env.DOCKER === "true" 
    ? "db" 
    : process.env.DB_HOST || "localhost";
  const dbUser = process.env.DB_USER || "postgres";
  const dbPassword = process.env.DB_PASSWORD || "1234";
  const dbName = process.env.DB_NAME || "aesp";
  
  console.log("📦 Trying psql restore first...");
  try {
    // Remove restrict line from dump
    const dumpContent = fs.readFileSync(dumpPath, "utf-8");
    const cleanedDump = dumpContent.replace(/\\restrict[^\n]*\n/g, '');
    const tempDumpPath = "/tmp/cleaned_dump.sql";
    fs.writeFileSync(tempDumpPath, cleanedDump);
    
    const { stdout, stderr } = await execAsync(
      `PGPASSWORD=${dbPassword} psql -h ${dbHost} -U ${dbUser} -d ${dbName} -f ${tempDumpPath} 2>&1`
    );
    
    // Check if it succeeded (psql returns 0 on success even with warnings)
    console.log("✅ Dump restored via psql!");
    if (stderr && stderr.trim().length > 0) {
      const errorLines = stderr.split('\n').filter(l => 
        l.includes('ERROR') && !l.includes('already exists') && !l.includes('does not exist')
      );
      if (errorLines.length > 0) {
        console.log(`⚠️  Some errors (may be expected): ${errorLines.length} error lines`);
      }
    }
    return;
  } catch (err) {
    console.log("⚠️  psql method failed, trying Node.js method...");
    console.log(`   Error: ${err.message.substring(0, 200)}`);
  }
  
  // Fallback to Node.js method
  const client = await pool.connect();
  try {
    console.log("📄 Reading dump file...");
    const dumpContent = fs.readFileSync(dumpPath, "utf-8");
    
    // Remove restrict line and comments
    let cleanedDump = dumpContent.replace(/\\restrict[^\n]*\n/g, '');
    // Remove comment blocks
    cleanedDump = cleanedDump.replace(/^--.*$/gm, '');
    
    // Execute the entire dump file at once (PostgreSQL handles it better)
    console.log("🔄 Executing dump file...");
    try {
      await client.query(cleanedDump);
      console.log("✅ Dump executed successfully!");
    } catch (err) {
      // If full dump fails, try executing statement by statement
      console.log("⚠️  Full dump execution had issues, trying statement by statement...");
      console.log(`   Error: ${err.message.substring(0, 200)}`);
      
      // Split by semicolons but preserve dollar-quoted strings
      const statements = [];
      let current = '';
      let inDollarQuote = false;
      let dollarTag = '';
      
      for (let i = 0; i < cleanedDump.length; i++) {
        const char = cleanedDump[i];
        const next10 = cleanedDump.substring(i, Math.min(i + 20, cleanedDump.length));
        
        // Check for dollar quote start
        if (!inDollarQuote && char === '$') {
          const match = next10.match(/^\$([^$]*)\$/);
          if (match) {
            inDollarQuote = true;
            dollarTag = match[0];
            current += dollarTag;
            i += dollarTag.length - 1;
            continue;
          }
        }
        
        // Check for dollar quote end
        if (inDollarQuote && cleanedDump.substring(i).startsWith(dollarTag)) {
          current += dollarTag;
          i += dollarTag.length - 1;
          inDollarQuote = false;
          dollarTag = '';
          continue;
        }
        
        current += char;
        
        // End of statement
        if (!inDollarQuote && char === ';') {
          const trimmed = current.trim();
          if (trimmed.length > 10 && !trimmed.match(/^--/)) {
            statements.push(trimmed);
          }
          current = '';
        }
      }
      
      let successCount = 0;
      let skipCount = 0;
      let errorCount = 0;
      
      console.log(`📊 Executing ${statements.length} statements...`);
      
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        try {
          await client.query(stmt);
          successCount++;
          if ((i + 1) % 10 === 0) {
            console.log(`   Progress: ${i + 1}/${statements.length} statements...`);
          }
        } catch (err) {
          if (err.code === "42P07" || err.code === "42704" || 
              err.message.includes("already exists") || 
              err.message.includes("does not exist")) {
            skipCount++;
          } else {
            errorCount++;
            if (errorCount <= 5) {
              console.log(`   ⚠️  Statement ${i + 1} error: ${err.message.substring(0, 100)}`);
            }
          }
        }
      }
      
      console.log(`✅ Completed: ${successCount} succeeded, ${skipCount} skipped, ${errorCount} errors`);
    }
  } catch (err) {
    console.error("❌ Error restoring dump:", err.message);
    throw err;
  } finally {
    client.release();
  }
}

async function initFromSchema() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    const initSqlPath = path.join(__dirname, "init.sql");
    if (fs.existsSync(initSqlPath)) {
      const initSql = fs.readFileSync(initSqlPath, "utf-8");
      await client.query(initSql);
    }
    
    const fixConstraintPath = path.join(__dirname, "fix_users_role_constraint.sql");
    if (fs.existsSync(fixConstraintPath)) {
      const fixSql = fs.readFileSync(fixConstraintPath, "utf-8");
      const statements = fixSql.split(";").filter(s => s.trim().length > 0);
      for (const statement of statements) {
        try {
          await client.query(statement);
        } catch (err) {
          // Ignore if already exists
        }
      }
    }
    
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

initDatabase()
  .then(() => {
    console.log("✅ Done!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });

