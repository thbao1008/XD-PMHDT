// Script to add updated_at column to mentor_resources table
import pool from "../src/config/db.js";

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check if column exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'mentor_resources' 
      AND column_name = 'updated_at'
    `);

    if (checkResult.rows.length === 0) {
      console.log("Adding updated_at column to mentor_resources...");
      
      // Add the column
      await client.query(`
        ALTER TABLE mentor_resources 
        ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()
      `);

      // Update existing rows
      const hasCreatedAt = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'mentor_resources' 
        AND column_name = 'created_at'
      `);

      if (hasCreatedAt.rows.length > 0) {
        await client.query(`
          UPDATE mentor_resources 
          SET updated_at = created_at 
          WHERE updated_at IS NULL
        `);
      }

      await client.query("COMMIT");
      console.log("✅ Migration completed: updated_at column added to mentor_resources");
    } else {
      console.log("ℹ️  Column updated_at already exists in mentor_resources");
    }
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Migration error:", err);
    throw err;
  } finally {
    client.release();
  }
}

runMigration().catch((err) => {
  console.error("Failed to run migration:", err);
  process.exit(1);
});

