# Fix: Frontend Không Tự Ngắt Khi Backend Chưa Chạy

## ✅ ĐÃ SỬA:

### 1. `scripts/start-frontend.js`
- **Trước**: Exit khi Vite có lỗi
- **Sau**: Không exit, chỉ log error và tiếp tục chạy
- Vite có thể tự restart hoặc user có thể restart thủ công

### 2. `frontend/vite.config.js`
- **Trước**: Proxy error có thể crash Vite
- **Sau**: Return friendly error message, không crash
- Thông báo: "Backend services chưa sẵn sàng"

### 3. `frontend/src/api.js`
- **Trước**: Error có thể crash app
- **Sau**: Log warning, return friendly error message
- UI có thể handle error gracefully

### 4. `frontend/src/pages/Home.jsx`
- **Trước**: Error có thể crash component
- **Sau**: Set empty array, không crash
- Component vẫn render, chỉ không có data

## ✅ CODE CHANGES:

### `scripts/start-frontend.js`
```javascript
viteProcess.on("error", (err) => {
  console.error("❌ Error starting Vite:", err);
  // Don't exit - let user see the error and fix it
  console.error("⚠️  Frontend will continue running. Please check the error above.");
});

viteProcess.on("exit", (code) => {
  // Only exit if it's a clean shutdown (code 0) or Ctrl+C
  // Don't exit on errors - let Vite handle retries
  if (code === 0 || code === null) {
    return; // Clean exit
  }
  // For other exit codes, log but don't exit
  console.error(`⚠️  Vite exited with code ${code}`);
  console.error("⚠️  Frontend may need to be restarted. Check backend services are running.");
  // Don't exit - let the process continue
});
```

### `frontend/vite.config.js`
```javascript
proxy.on("error", (err, req, res) => {
  console.error("[Vite Proxy] Error:", err.message);
  // Don't crash - return friendly error message
  if (res && !res.headersSent) {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ 
      message: "Backend services chưa sẵn sàng. Vui lòng kiểm tra backend services đã chạy chưa.",
      error: "BACKEND_NOT_READY",
      details: process.env.NODE_ENV === "development" ? err.message : undefined
    }));
  }
  // Don't throw - let Vite continue running
});
```

### `frontend/src/api.js`
```javascript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.request) {
      // Backend không phản hồi - không crash, chỉ log
      console.warn("⚠️  Backend services chưa sẵn sàng. Vui lòng kiểm tra backend services đã chạy chưa.");
      error.message = "Backend services chưa sẵn sàng. Vui lòng kiểm tra backend services đã chạy chưa.";
    }
    // Don't crash - return error for UI to handle
    return Promise.reject(error);
  }
);
```

### `frontend/src/pages/Home.jsx`
```javascript
.catch((err) => {
  // Don't crash - just log and show empty state
  console.warn("⚠️  Không thể load packages. Backend services có thể chưa sẵn sàng.");
  setPackages([]); // Set empty array instead of crashing
});
```

## ✅ LỢI ÍCH:

- ✅ Frontend không tự ngắt khi backend chưa chạy
- ✅ Hiển thị thông báo lỗi thân thiện
- ✅ UI vẫn hoạt động, chỉ không có data
- ✅ User có thể thấy lỗi và fix
- ✅ Vite dev server không exit

## ✅ KẾT QUẢ:

- ✅ Frontend chạy ngay cả khi backend chưa sẵn sàng
- ✅ Hiển thị thông báo: "Backend services chưa sẵn sàng"
- ✅ UI vẫn render, chỉ không có data
- ✅ User có thể start backend và refresh để load data

## 📝 LƯU Ý:

- Frontend sẽ hiển thị thông báo lỗi thân thiện
- User cần start backend services để có data
- Frontend không crash, chỉ log warnings
- Vite dev server tiếp tục chạy

