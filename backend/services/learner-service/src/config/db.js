import pkg from "pg";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try multiple .env locations: backend/ai_models/.env, backend/.env.local, backend/.env.docker
const backendRoot = path.resolve(__dirname, "..", "..", "..", "..");
const envPaths = [
  path.resolve(backendRoot, "ai_models", ".env"), // Primary location
  path.resolve(backendRoot, ".env.local"),
  path.resolve(backendRoot, ".env.docker"),
  path.resolve(backendRoot, ".env")
];

let loaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`✅ Loaded .env from: ${envPath}`);
    loaded = true;
    break;
  }
}

if (!loaded) {
  console.warn(`⚠️ .env file not found. Tried: ${envPaths.join(", ")}`);
  dotenv.config(); // Try default locations
}

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
});

pool.query("SELECT NOW()")
  .then(res => console.log("✅ Learner Service connected to PostgreSQL:", res.rows[0]))
  .catch(err => console.error("❌ Learner Service DB connection error:", err));

export default pool;

