// Script to reset learner password to 'aesp'
import pool from "../src/config/db.js";
import bcrypt from "bcryptjs";

async function resetLearnerPassword() {
  try {
    const email = "learner@gmail.com";
    const newPassword = "aesp";
    
    console.log(`🔄 Resetting password for ${email}...`);
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // First verify the hash
    const testMatch = await bcrypt.compare(newPassword, hashedPassword);
    console.log(`   Hash verification: ${testMatch ? "✅ Valid" : "❌ Invalid"}`);
    console.log(`   Hash: ${hashedPassword.substring(0, 30)}...`);
    
    const result = await pool.query(
      "UPDATE users SET password = $1, updated_at = NOW() WHERE email = $2 RETURNING id, email, role",
      [hashedPassword, email]
    );
    
    // Verify it was saved correctly
    const verify = await pool.query("SELECT password, LENGTH(password) as len FROM users WHERE email = $1", [email]);
    if (verify.rows[0].len !== 60) {
      console.log(`   ⚠️  WARNING: Password hash length is ${verify.rows[0].len}, expected 60!`);
      console.log(`   Hash in DB: ${verify.rows[0].password.substring(0, 30)}...`);
    } else {
      const verifyMatch = await bcrypt.compare(newPassword, verify.rows[0].password);
      console.log(`   ✅ Password saved correctly: ${verifyMatch ? "Verified" : "NOT VERIFIED"}`);
    }
    
    if (result.rows.length === 0) {
      console.log(`❌ User ${email} not found!`);
      process.exit(1);
    }
    
    console.log(`✅ Password reset for ${email}`);
    console.log(`   User: ${result.rows[0].email} (${result.rows[0].role})`);
    console.log(`   New password: ${newPassword}`);
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    await pool.end();
    process.exit(1);
  }
}

resetLearnerPassword();

