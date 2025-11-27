// Script to restore users from dump file
import pool from "../src/config/db.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function restoreUsers() {
  try {
    console.log("🔄 Restoring users from dump file...");
    
    const dumpPath = path.join(__dirname, "../../aesp_dump.sql");
    
    if (!fs.existsSync(dumpPath)) {
      console.error("❌ Dump file not found!");
      process.exit(1);
    }
    
    const dumpContent = fs.readFileSync(dumpPath, "utf-8");
    
    // Extract users data from COPY statement
    const copyMatch = dumpContent.match(/COPY public\.users[^;]+FROM stdin;([\s\S]+?)\\\./);
    
    if (!copyMatch) {
      console.error("❌ Could not find users data in dump file");
      process.exit(1);
    }
    
    const usersData = copyMatch[1].trim();
    const lines = usersData.split('\n').filter(line => line.trim());
    
    console.log(`📊 Found ${lines.length} users in dump file`);
    
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      
      let inserted = 0;
      let skipped = 0;
      
      for (const line of lines) {
        // Parse tab-separated values
        const parts = line.split('\t');
        
        if (parts.length < 10) {
          console.log(`⚠️  Skipping invalid line: ${line.substring(0, 50)}...`);
          skipped++;
          continue;
        }
        
        const [id, name, email, phone, dob, password, role, status, created_at, updated_at] = parts;
        
        try {
          // Check if user already exists
          const existing = await client.query("SELECT id FROM users WHERE id = $1 OR email = $2", [id, email]);
          
          if (existing.rows.length > 0) {
            // Update existing user
            await client.query(
              `UPDATE users 
               SET name = $1, phone = $2, dob = $3, password = $4, role = $5, status = $6, 
                   created_at = $7, updated_at = $8
               WHERE id = $9 OR email = $10`,
              [name, phone || null, dob || null, password, role, status, created_at || null, updated_at || null, id, email]
            );
            console.log(`✅ Updated user: ${email} (id: ${id})`);
          } else {
            // Insert new user
            await client.query(
              `INSERT INTO users (id, name, email, phone, dob, password, role, status, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
              [id, name, email, phone || null, dob || null, password, role, status, created_at || null, updated_at || null]
            );
            console.log(`✅ Inserted user: ${email} (id: ${id})`);
            inserted++;
          }
        } catch (err) {
          if (err.code === "23505") {
            console.log(`⚠️  User ${email} already exists, skipping...`);
            skipped++;
          } else {
            console.error(`❌ Error inserting user ${email}:`, err.message);
            throw err;
          }
        }
      }
      
      // Update sequence
      const maxId = await client.query("SELECT MAX(id) as max_id FROM users");
      if (maxId.rows[0].max_id) {
        await client.query(`SELECT setval('users_id_seq', $1)`, [maxId.rows[0].max_id]);
        console.log(`✅ Updated users_id_seq to ${maxId.rows[0].max_id}`);
      }
      
      await client.query("COMMIT");
      
      console.log(`\n✅ Restore completed!`);
      console.log(`   Inserted: ${inserted}`);
      console.log(`   Skipped: ${skipped}`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    await pool.end();
    process.exit(1);
  }
}

restoreUsers();

