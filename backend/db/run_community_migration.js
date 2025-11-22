// backend/db/run_community_migration.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../src/config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log("🔄 Đang chạy migration cho community schema...");
    
    const sql = fs.readFileSync(
      path.join(__dirname, "community_schema.sql"),
      "utf8"
    );
    
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    
    console.log("✅ Migration thành công!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Lỗi migration:", err);
    throw err;
  } finally {
    client.release();
  }
}

runMigration()
  .then(() => {
    console.log("✅ Hoàn tất!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Migration thất bại:", err);
    process.exit(1);
  });


import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../src/config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log("🔄 Đang chạy migration cho community schema...");
    
    const sql = fs.readFileSync(
      path.join(__dirname, "community_schema.sql"),
      "utf8"
    );
    
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    
    console.log("✅ Migration thành công!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Lỗi migration:", err);
    throw err;
  } finally {
    client.release();
  }
}

runMigration()
  .then(() => {
    console.log("✅ Hoàn tất!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Migration thất bại:", err);
    process.exit(1);
  });


import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../src/config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log("🔄 Đang chạy migration cho community schema...");
    
    const sql = fs.readFileSync(
      path.join(__dirname, "community_schema.sql"),
      "utf8"
    );
    
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    
    console.log("✅ Migration thành công!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Lỗi migration:", err);
    throw err;
  } finally {
    client.release();
  }
}

runMigration()
  .then(() => {
    console.log("✅ Hoàn tất!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Migration thất bại:", err);
    process.exit(1);
  });


