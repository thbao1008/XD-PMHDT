export function errorHandler(err, req, res, next) {
  console.error("Error: - errorHandler.js:2", err);
  res.status(500).json({ message: "Lỗi server", error: err.message });
}
