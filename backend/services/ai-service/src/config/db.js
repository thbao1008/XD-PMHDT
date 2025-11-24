import pkg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
const projectRoot = path.resolve(__dirname, "..", "..", "..", "..");
const envPath = path.resolve(projectRoot, ".env");
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
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.query("SELECT NOW()")
  .then(res => console.log("✅ AI Service connected to PostgreSQL:", res.rows[0]))
  .catch(err => console.error("❌ AI Service DB connection error:", err));

pool.on("error", (err) => {
  console.error("Unexpected error on idle client - ai-service db.js", err);
  process.exit(-1);
});

export default pool;

