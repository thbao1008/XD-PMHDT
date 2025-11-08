// src/middleware/requestLogger.js
export function requestLogger(req, res, next) {
  console.log("========== REQUEST DEBUG ========== - requestLogger.js:3");
  console.log("📌 Method: - requestLogger.js:4", req.method);
  console.log("📌 URL: - requestLogger.js:5", req.originalUrl);
  console.log("📌 Params: - requestLogger.js:6", req.params);
  console.log("📌 Query: - requestLogger.js:7", req.query);
  console.log("📌 Body: - requestLogger.js:8", req.body);
  console.log("=================================== - requestLogger.js:9");
  next();
}
