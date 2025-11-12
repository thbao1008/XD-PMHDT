import pkg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const { Pool } = pkg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT) || 5432,
});

// test query để chắc chắn pool hoạt động
pool.query("SELECT NOW()")
  .then(res => console.log("✅ Connected to PostgreSQL: - db.js:25", res.rows[0]))
  .catch(err => console.error("❌ DB connection error: - db.js:26", err));

export default pool;
