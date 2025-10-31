import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,   // phải là string
  port: process.env.DB_PORT,
});


// Test kết nối
pool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL - db.js:18"))
  .catch(err => console.error("❌ DB connection error: - db.js:19", err));

export default pool;
