import pkg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ưu tiên load .env.local khi chạy ngoài Docker, .env.docker khi chạy trong Docker
const envFile = process.env.DOCKER === "true" ? "../.env.docker" : "../.env.local";
const envPath = path.resolve(__dirname, envFile);
dotenv.config({ path: envPath });

const { Pool } = pkg;

// Nếu chạy trong Docker và DB_HOST=localhost thì đổi thành "db"
const host =
  process.env.DB_HOST === "localhost" && process.env.DOCKER === "true"
    ? "db"
    : process.env.DB_HOST || "localhost";

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: host,
  database: process.env.DB_NAME || "aesp",
  password: String(process.env.DB_PASSWORD || "1234"), // ép thành string
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  options: "-c search_path=public",
});

// test query để chắc chắn pool hoạt động
pool.query("SELECT NOW()")
  .then(res => console.log("✅ Connected to PostgreSQL: - db.js:34", res.rows[0]))
  .catch(err => console.error("❌ DB connection error: - db.js:35", err));

export default pool;
