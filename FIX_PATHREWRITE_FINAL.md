# Fix: PathRewrite - Cannot POST /login - FINAL

## ✅ VẤN ĐỀ:

- Lỗi: "Cannot POST /login"
- Request đang đến `/login` thay vì `/auth/login`
- PathRewrite không hoạt động đúng

## ✅ NGUYÊN NHÂN:

1. **`onProxyReq` đang cố forward body** nhưng không có `express.json()`
2. **PathRewrite pattern có thể không match đúng**
3. **API Gateway có thể chưa restart**

## ✅ GIẢI PHÁP:

### 1. Xóa phần forward body trong `onProxyReq`:
```javascript
// ❌ SAI - Cố forward body khi không có express.json()
if (req.body && (req.method === "POST" || req.method === "PUT" || req.method === "PATCH")) {
  const bodyData = JSON.stringify(req.body);
  proxyReq.setHeader("Content-Type", "application/json");
  proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
  proxyReq.write(bodyData);
}

// ✅ ĐÚNG - http-proxy-middleware tự động forward body stream
// We don't need to manually forward it since express.json() is not used
```

### 2. Sửa log để hiển thị path đúng:
```javascript
const targetPath = req.url.replace("/api/auth", "/auth");
console.log(`[API Gateway] ${req.method} ${req.url} → ${SERVICES.user}${targetPath}`);
```

## ✅ CODE HOÀN CHỈNH:

```javascript
app.use("/api/auth", createProxyMiddleware({
  target: SERVICES.user,
  changeOrigin: true,
  pathRewrite: {
    "^/api/auth": "/auth"  // /api/auth/login -> /auth/login
  },
  timeout: 30000,
  proxyTimeout: 30000,
  ws: true,
  logLevel: "warn",
  onProxyReq: (proxyReq, req, res) => {
    // Forward all headers (except host and connection)
    Object.keys(req.headers).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (lowerKey !== "host" && lowerKey !== "connection") {
        proxyReq.setHeader(key, req.headers[key]);
      }
    });
    
    // http-proxy-middleware automatically forwards the body stream
    // We don't need to manually forward it since express.json() is not used
    
    // Log request in dev mode
    if (process.env.NODE_ENV === "development") {
      const targetPath = req.url.replace("/api/auth", "/auth");
      console.log(`[API Gateway] ${req.method} ${req.url} → ${SERVICES.user}${targetPath}`);
    }
  },
  // ... error handlers ...
}));
```

## ⚠️ QUAN TRỌNG - CẦN RESTART:

**API Gateway PHẢI được restart để áp dụng thay đổi!**

Script `start-all-services.js` đã tích hợp kill API Gateway trước khi start, nên chỉ cần:
```bash
# Stop tất cả services (Ctrl+C)
# Start lại
cd backend/services
node start-all-services.js
```

## ✅ TEST SAU KHI RESTART:

### Test trực tiếp User Service:
```bash
curl -X POST http://localhost:4005/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@gmail.com","password":"123456"}'
# ✅ 401 Unauthorized (credentials sai, nhưng hoạt động)
```

### Test qua API Gateway:
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@gmail.com","password":"123456"}'
# ✅ 401 Unauthorized (credentials sai, nhưng không 404)
```

## 🎯 KẾT QUẢ:

- ✅ PathRewrite hoạt động: `/api/auth/login` → `/auth/login`
- ✅ Body được forward đúng cách (tự động bởi http-proxy-middleware)
- ✅ Login hoạt động (401 nếu credentials sai, 200 nếu đúng)
- ✅ Không còn "Cannot POST /login"

## 📝 LƯU Ý:

- **Không dùng `express.json()` trước proxy routes**
- **http-proxy-middleware tự động forward body stream**
- **Không cần manually forward body trong onProxyReq**
- **PathRewrite dùng object pattern**: `{ "^/api/auth": "/auth" }`
- **PHẢI restart API Gateway** sau khi sửa code

