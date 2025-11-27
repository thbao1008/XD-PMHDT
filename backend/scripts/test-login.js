// Script to test login and verify password
import bcrypt from "bcryptjs";
import pool from "../src/config/db.js";

async function testLogin() {
  try {
    console.log("🧪 Testing login credentials...\n");
    
    const testUsers = [
      { email: "admin@gmail.com", password: "aesp" },
      { email: "ntb100804@gmail.com", password: "aesp" },
      { email: "testadmin@gmail.com", password: "aesp" }
    ];
    
    for (const test of testUsers) {
      console.log(`📋 Testing: ${test.email}`);
      
      // Get user from database
      const result = await pool.query(
        "SELECT id, email, password, role, status FROM users WHERE email = $1",
        [test.email]
      );
      
      if (result.rows.length === 0) {
        console.log(`  ❌ User not found in database`);
        continue;
      }
      
      const user = result.rows[0];
      console.log(`  ✅ User found: ID=${user.id}, Role=${user.role}, Status=${user.status}`);
      
      // Test password
      try {
        const match = await bcrypt.compare(test.password, user.password);
        console.log(`  ${match ? "✅" : "❌"} Password match: ${match}`);
        
        if (!match) {
          console.log(`  ⚠️  Password "${test.password}" does not match stored hash`);
          console.log(`  💡 Try resetting password or check if password was changed`);
        }
      } catch (err) {
        console.log(`  ❌ Error comparing password: ${err.message}`);
      }
      
      console.log("");
    }
    
    await pool.end();
    console.log("✅ Login test completed!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    await pool.end();
    process.exit(1);
  }
}

testLogin();

