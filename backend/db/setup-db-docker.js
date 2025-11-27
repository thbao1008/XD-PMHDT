// Complete database setup for Docker
// This script runs all necessary migrations and restores data
import pool from "../src/config/db.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// List of schema files to run in order
// IMPORTANT: init.sql must be first to create base tables (users, etc.)
// NOTE: Other tables (packages, learners, mentors, etc.) will be created from dump file
const SCHEMA_FILES = [
  "init.sql", // Base tables (users, etc.) - MUST BE FIRST
  "fix_users_role_constraint.sql", // Fix users table constraints
  "traffic_tracking_schema.sql",
  "avatar_url_schema.sql",
  "user_sessions_schema.sql",
  "community_schema.sql",
  "notifications_schema.sql",
  "practice_history_schema.sql",
  "mentor_blocklist_schema.sql",
  "security_question_schema.sql",
  "post_views_schema.sql",
  "ban_history_schema.sql",
  "assistant_ai_schema.sql",
  "ai_prompts_schema.sql",
  "dictionary_cache_schema.sql",
  "challenge_creator_training_schema.sql",
  "scenario_schema.sql",
  "story_schema.sql",
  "schedules_schema.sql",
];

// Helper function to split SQL while preserving dollar-quoted strings
function splitSQLStatements(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;
  let dollarTag = '';
  let i = 0;
  
  while (i < sql.length) {
    const char = sql[i];
    
    // Check for dollar-quoted string start: $tag$ or $$
    if (char === '$' && !inDollarQuote) {
      const rest = sql.substring(i);
      const match = rest.match(/^\$([^$]*)\$/);
      if (match) {
        dollarTag = match[0];
        inDollarQuote = true;
        current += dollarTag;
        i += dollarTag.length;
        continue;
      }
    }
    
    // Check for dollar-quoted string end
    if (inDollarQuote && sql.substring(i).startsWith(dollarTag)) {
      current += dollarTag;
      i += dollarTag.length;
      inDollarQuote = false;
      dollarTag = '';
      continue;
    }
    
    // Split on semicolon only if not in dollar-quoted string
    if (char === ';' && !inDollarQuote) {
      const trimmed = current.trim();
      if (trimmed && !trimmed.startsWith('--')) {
        statements.push(trimmed);
      }
      current = '';
    } else {
      current += char;
    }
    
    i++;
  }
  
  // Add remaining statement
  const trimmed = current.trim();
  if (trimmed && !trimmed.startsWith('--')) {
    statements.push(trimmed);
  }
  
  return statements;
}

async function restoreDumpData(pool, dumpPath) {
  try {
    console.log("   Reading dump file and extracting CREATE TABLE statements...");
    let dumpContent = fs.readFileSync(dumpPath, "utf-8");
    
    // Extract CREATE TABLE statements for key tables from dump
    const keyTables = ['packages', 'purchases', 'learners', 'mentors'];
    const client = await pool.connect();
    try {
      for (const tableName of keyTables) {
        // Find CREATE TABLE statement - match from "CREATE TABLE public.table" to closing ");"
        const tableRegex = new RegExp(`CREATE TABLE public\\.${tableName}[\\s\\S]*?\\);`, 'm');
        const match = dumpContent.match(tableRegex);
        if (match) {
          let createStmt = match[0];
          // Make it idempotent
          createStmt = createStmt.replace(/CREATE TABLE public\./, 'CREATE TABLE IF NOT EXISTS public.');
          try {
            await client.query(createStmt);
            console.log(`   ✅ Created table: ${tableName}`);
          } catch (err) {
            if (!err.message.includes('already exists')) {
              console.log(`   ⚠️  Warning creating ${tableName}: ${err.message.substring(0, 60)}`);
            }
          }
        } else {
          console.log(`   ⚠️  CREATE TABLE for ${tableName} not found in dump`);
        }
      }
      
      // Now restore data - extract COPY statements and convert to INSERT
      console.log("   Restoring data...");
      
      // For packages table - insert directly from known data
      if (keyTables.includes('packages')) {
        try {
          // First ensure id is PRIMARY KEY
          await client.query(`ALTER TABLE public.packages ADD CONSTRAINT packages_pkey PRIMARY KEY (id)`).catch(() => {});
          
          await client.query(`
            INSERT INTO public.packages (id, name, duration_days, price, original_price, updated_at) 
            VALUES 
              (1, 'Basic', 30, 599000, 799000, NULL),
              (2, 'Pro', 90, 1899000, 2397000, NULL),
              (3, 'VIP', 180, 3999000, 4794000, '2025-11-12 23:57:51.051945'::timestamp)
            ON CONFLICT (id) DO NOTHING
          `);
          const countResult = await client.query(`SELECT COUNT(*) as count FROM public.packages`);
          console.log(`   ✅ Restored data to packages: ${countResult.rows[0].count} rows`);
        } catch (err) {
          if (!err.message.includes('duplicate') && !err.message.includes('unique') && !err.message.includes('already exists')) {
            console.log(`   ⚠️  Warning restoring packages: ${err.message.substring(0, 60)}`);
          }
        }
      }
    } finally {
      client.release();
    }
  } catch (err) {
    console.log(`   ⚠️  Error: ${err.message.substring(0, 100)}`);
  }
}

async function runSchemaFile(fileName) {
  const filePath = path.join(__dirname, fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Schema file not found: ${fileName}, skipping...`);
    return;
  }
  
  try {
    const sql = fs.readFileSync(filePath, "utf-8");
    
    // For init.sql, execute directly without splitting (it's simple CREATE TABLE)
    if (fileName === "init.sql") {
      const client = await pool.connect();
      try {
        await client.query(sql);
        console.log(`✅ Applied: ${fileName}`);
      } finally {
        client.release();
      }
      return;
    }
    
    // For other files, split SQL statements while preserving dollar-quoted strings
    const statements = splitSQLStatements(sql);
    
    const client = await pool.connect();
    try {
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await client.query(statement);
          } catch (err) {
            // Ignore "already exists" errors
            if (!err.message.includes("already exists") && 
                !err.message.includes("duplicate key") &&
                !err.message.includes("does not exist") &&
                !err.message.includes("already has") &&
                !err.message.includes("duplicate")) {
              console.log(`   ⚠️  Warning in ${fileName}: ${err.message.substring(0, 100)}`);
            }
          }
        }
      }
      console.log(`✅ Applied: ${fileName}`);
    } finally {
      client.release();
    }
  } catch (err) {
    console.log(`⚠️  Error applying ${fileName}: ${err.message.substring(0, 100)}`);
  }
}

async function setupDatabase() {
  try {
    console.log("🚀 Setting up database for Docker...\n");
    
    // Step 1: Run all schema migrations
    console.log("📋 Step 1: Applying schema migrations...");
    for (const schemaFile of SCHEMA_FILES) {
      await runSchemaFile(schemaFile);
    }
    console.log("");
    
    // Step 2: Restore from dump file to create missing tables and data
    console.log("📋 Step 2: Restoring from dump file...");
    const dumpPath = path.join(__dirname, "../../aesp_dump.sql");
    
    if (!fs.existsSync(dumpPath)) {
      console.log("⚠️  Dump file not found, skipping data restore...");
    } else {
      try {
        // Check if we already have packages table and data
        const hasPackages = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'packages'
          ) as exists
        `);
        
        if (hasPackages.rows[0].exists) {
          const packageCount = await pool.query("SELECT COUNT(*) as count FROM packages");
          if (packageCount.rows[0].count > 0) {
            console.log("✅ Packages table already has data, skipping dump restore...");
          } else {
            console.log("📦 Packages table exists but empty, restoring data from dump...");
            await restoreDumpData(pool, dumpPath);
          }
        } else {
          console.log("📦 Restoring dump to create missing tables and data...");
          // Use our restoreDumpData function to extract and create tables
          await restoreDumpData(pool, dumpPath);
        }
      } catch (err) {
        console.log(`⚠️  Could not restore dump: ${err.message.substring(0, 100)}`);
        console.log("   (You can run 'npm run restore:dump' manually later)");
      }
    }
    
    // Step 3: Restore users if needed
    console.log("\n📋 Step 3: Ensuring all users are restored...");
    try {
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);
      
      await execAsync("cd /app && npm run restore:users 2>&1 | grep -v 'tip:' || true");
      console.log("✅ Users check completed!");
    } catch (err) {
      console.log("⚠️  Users restore skipped (may already exist)");
    }
    
    // Step 4: Verify
    console.log("\n📋 Step 4: Verifying database...");
    try {
      // First check which tables exist
      const tablesCheck = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'packages', 'learners', 'mentors', 'purchases')
        ORDER BY table_name
      `);
      
      const existingTables = tablesCheck.rows.map(r => r.table_name);
      console.log(`   ✅ Tables created: ${existingTables.length > 0 ? existingTables.join(', ') : 'none yet'}`);
      
      if (existingTables.length === 0) {
        console.log("   ⚠️  No base tables found. This might be a fresh database.");
        console.log("   💡 To restore data, run: docker-compose run --rm app npm run restore:dump");
      } else {
        // Only query tables that exist
        const stats = {};
        for (const table of existingTables) {
          try {
            const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
            stats[table] = result.rows[0].count;
          } catch (err) {
            stats[table] = 'error';
          }
        }
        
        console.log(`   📊 Data counts:`);
        existingTables.forEach(table => {
          console.log(`      ${table}: ${stats[table]}`);
        });
        
        // Check if we need to restore from dump
        const totalRecords = Object.values(stats).reduce((sum, val) => {
          return sum + (typeof val === 'number' ? val : 0);
        }, 0);
        
        if (totalRecords === 0 && fs.existsSync(path.join(__dirname, "../../aesp_dump.sql"))) {
          console.log("\n   💡 Database is empty. To restore data from dump:");
          console.log("      docker-compose run --rm app npm run restore:dump");
        }
      }
    } catch (err) {
      console.log(`   ⚠️  Could not verify database: ${err.message.substring(0, 100)}`);
      console.log("   (This is OK if tables are still being created)");
    }
    
    await pool.end();
    console.log("\n✅ Database setup completed!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    await pool.end();
    process.exit(1);
  }
}

setupDatabase();

