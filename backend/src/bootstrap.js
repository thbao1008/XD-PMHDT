// backend/src/bootstrap.js
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Nạp file env chính ở backend/.env trước khi import server
dotenv.config({ path: path.resolve(__dirname, "../.env"), debug: false });

console.log("bootstrap: loaded env OPENROUTER present: - bootstrap.js:12", !!process.env.OPENROUTER_API_KEY);

// Import server sau khi env đã có
// Sử dụng async IIFE để tránh lỗi top-level await
(async () => {
  try {
    await import("./server.js");
  } catch (err) {
    console.error("bootstrap: failed to import server - bootstrap.js:16", err);
    process.exit(1);
  }
})();

