// Fix learner password - run from container
import pool from "../src/config/db.js";
import bcrypt from "bcryptjs";

async function fixPassword() {
  try {
    const email = "learner@gmail.com";
    const password = "aesp";
    
    console.log(`🔄 Fixing password for ${email}...`);
    
    // Generate hash
    const hash = await bcrypt.hash(password, 10);
    console.log(`   Generated hash: ${hash.substring(0, 30)}... (length: ${hash.length})`);
    
    // Update in database
    const result = await pool.query(
      "UPDATE users SET password = $1 WHERE email = $2 RETURNING id, email",
      [hash, email]
    );
    
    if (result.rows.length === 0) {
      console.log(`❌ User not found!`);
      process.exit(1);
    }
    
    // Verify it was saved
    const verify = await pool.query(
      "SELECT password, LENGTH(password) as len FROM users WHERE email = $1",
      [email]
    );
    
    const savedHash = verify.rows[0].password;
    const savedLen = verify.rows[0].len;
    
    console.log(`   Saved hash: ${savedHash.substring(0, 30)}... (length: ${savedLen})`);
    
    if (savedLen !== 60) {
      console.log(`   ❌ ERROR: Hash length is ${savedLen}, expected 60!`);
      process.exit(1);
    }
    
    // Test password match
    const match = await bcrypt.compare(password, savedHash);
    console.log(`   Password match test: ${match ? "✅ PASS" : "❌ FAIL"}`);
    
    if (!match) {
      console.log(`   ❌ Password verification failed!`);
      process.exit(1);
    }
    
    console.log(`✅ Password fixed successfully!`);
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    await pool.end();
    process.exit(1);
  }
}

fixPassword();

