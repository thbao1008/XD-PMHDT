import pkg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envFile = process.env.DOCKER === "true" ? "../../.env.docker" : "../../.env.local";
const envPath = path.resolve(__dirname, envFile);
dotenv.config({ path: envPath });

const { Pool } = pkg;

const host =
  process.env.DB_HOST === "localhost" && process.env.DOCKER === "true"
    ? "db"
    : process.env.DB_HOST || "localhost";

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: host,
  database: process.env.DB_NAME || "aesp",
  password: String(process.env.DB_PASSWORD || "1234"),
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  options: "-c search_path=public",
  connectionTimeoutMillis: 10000, // 10 seconds timeout
  idleTimeoutMillis: 30000,
  max: 20, // Maximum number of clients in the pool
  min: 2, // Minimum number of clients in the pool
});

// Test connection with timeout - don't block startup
setTimeout(() => {
  pool.query("SELECT NOW()")
    .then(res => console.log("✅ User Service connected to PostgreSQL:", res.rows[0]))
    .catch(err => {
      console.error("❌ User Service DB connection error:", err.message);
      console.error("   Service will continue but DB operations may fail");
      // Don't exit - let service start anyway, health check will show DB status
    });
}, 100); // Run async, don't block

export default pool;

