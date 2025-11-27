// Script to check database health and data
import pool from "../src/config/db.js";

async function checkDatabaseHealth() {
  try {
    console.log("🔍 Checking database health...\n");
    
    // Check connection
    try {
      await pool.query("SELECT NOW()");
      console.log("✅ Database connection: OK");
    } catch (err) {
      console.error("❌ Database connection: FAILED", err.message);
      process.exit(1);
    }
    
    // Check tables
    const tables = [
      'users', 'packages', 'learners', 'mentors', 
      'purchases', 'user_sessions', 'mentor_sessions'
    ];
    
    console.log("\n📊 Table Status:");
    for (const table of tables) {
      try {
        const result = await pool.query(
          `SELECT COUNT(*) as count FROM ${table}`
        );
        const count = parseInt(result.rows[0].count);
        const status = count > 0 ? "✅" : "⚠️ ";
        console.log(`  ${status} ${table}: ${count} rows`);
      } catch (err) {
        console.log(`  ❌ ${table}: ERROR - ${err.message}`);
      }
    }
    
    // Check users
    console.log("\n👥 Users:");
    try {
      const users = await pool.query(
        "SELECT id, email, role, status FROM users LIMIT 10"
      );
      if (users.rows.length === 0) {
        console.log("  ⚠️  No users found");
      } else {
        users.rows.forEach(u => {
          console.log(`  - ${u.email} (${u.role}, ${u.status})`);
        });
      }
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
    }
    
    // Check packages
    console.log("\n📦 Packages:");
    try {
      const packages = await pool.query(
        "SELECT id, name, price, duration_days FROM packages ORDER BY price"
      );
      if (packages.rows.length === 0) {
        console.log("  ⚠️  No packages found - Packages should be restored from dump file");
      } else {
        packages.rows.forEach(p => {
          console.log(`  - ${p.name}: ${p.price.toLocaleString()}đ (${p.duration_days} days)`);
        });
      }
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
    }
    
    // Check user_sessions
    console.log("\n🔐 Sessions:");
    try {
      const sessions = await pool.query(
        "SELECT COUNT(*) as count FROM user_sessions WHERE is_active = true"
      );
      const activeSessions = parseInt(sessions.rows[0].count);
      console.log(`  Active sessions: ${activeSessions}`);
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
    }
    
    console.log("\n✅ Database health check completed!");
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    await pool.end();
    process.exit(1);
  }
}

checkDatabaseHealth();

