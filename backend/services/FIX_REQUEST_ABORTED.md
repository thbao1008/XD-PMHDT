# Fix: BadRequestError - request aborted

## Vấn đề:
```
BadRequestError: request aborted
    at IncomingMessage.onAborted (raw-body/index.js:245:10)
```

## Nguyên nhân:
- Client đóng connection trước khi server xử lý xong request
- Browser/tab đóng, network timeout, hoặc client cancel request
- Express/raw-body throw error khi detect connection đã đóng

## Giải pháp đã áp dụng:

### 1. Thêm Error Handler Middleware
- Bắt và ignore "request aborted" errors
- Bắt và ignore connection errors (ECONNRESET, EPIPE, ECONNABORTED)
- Đặt error handler SAU routes (theo Express convention)

### 2. Update Process Error Handlers
- Ignore "request aborted" trong uncaughtException
- Ignore "request aborted" trong unhandledRejection
- Ignore connection errors

### 3. Suppress Deprecation Warnings
- Thêm `NODE_OPTIONS=--no-deprecation` vào start-all-services.js
- Thêm `--no-deprecation` vào package.json scripts

## Code Changes:

### user-service/src/server.js
```javascript
// Error handler - must be after routes
app.use((err, req, res, next) => {
  // Ignore "request aborted" errors
  if (err.message && (err.message.includes("request aborted") || err.message.includes("aborted"))) {
    return; // Silently ignore
  }
  // Ignore connection errors
  if (err.code === "ECONNRESET" || err.code === "EPIPE" || err.code === "ECONNABORTED") {
    return; // Silently ignore
  }
  // Handle other errors
  console.error("User Service error:", err);
  if (!res.headersSent) {
    res.status(err.status || 500).json({ 
      message: err.message || "Server error" 
    });
  }
});
```

### start-all-services.js
```javascript
const child = spawn("npm", ["run", "start"], {
  cwd: servicePath,
  env: {
    ...process.env,
    NODE_OPTIONS: "--no-deprecation" // Suppress deprecation warnings
  }
});
```

## Lưu ý:
- Error này không ảnh hưởng đến chức năng
- Chỉ là thông báo khi client disconnect
- Có thể bỏ qua an toàn
- Nên apply cho tất cả services nếu cần

## Apply cho services khác:
Nếu các services khác cũng gặp lỗi tương tự, thêm error handler tương tự vào server.js của mỗi service.

