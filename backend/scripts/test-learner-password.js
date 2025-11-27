// Test learner password
import pool from "../src/config/db.js";
import bcrypt from "bcryptjs";

async function testPassword() {
  try {
    const email = "learner@gmail.com";
    const testPasswords = ["aesp", "123456", "password", "learner"];
    
    const result = await pool.query("SELECT id, email, password FROM users WHERE email = $1", [email]);
    
    if (result.rows.length === 0) {
      console.log(`❌ User ${email} not found!`);
      process.exit(1);
    }
    
    const user = result.rows[0];
    console.log(`✅ User found: ${user.email} (ID: ${user.id})`);
    console.log(`   Password hash: ${user.password.substring(0, 30)}...`);
    console.log(`   Hash length: ${user.password.length}`);
    
    console.log("\n🔐 Testing passwords:");
    for (const pwd of testPasswords) {
      const match = await bcrypt.compare(pwd, user.password);
      console.log(`   ${pwd}: ${match ? "✅ MATCH" : "❌ no match"}`);
    }
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    await pool.end();
    process.exit(1);
  }
}

testPassword();

