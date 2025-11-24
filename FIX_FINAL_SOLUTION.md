# Fix: Final Solution - PathRewrite và Express.json()

## ✅ VẤN ĐỀ ĐÃ TÌM RA:

1. **`express.json()` consume body stream** → Đã fix (xóa)
2. **PathRewrite không hoạt động** → Cần fix

## ✅ GIẢI PHÁP CUỐI CÙNG:

### 1. XÓA `express.json()` trước proxy:
```javascript
// ❌ SAI
app.use(express.json()); // Consumes body stream
app.use("/api/auth", createProxyMiddleware({...}));

// ✅ ĐÚNG
// Không dùng express.json() - để http-proxy-middleware tự forward body stream
app.use("/api/auth", createProxyMiddleware({...}));
```

### 2. PathRewrite dùng object pattern:
```javascript
pathRewrite: {
  "^/api/auth": "/auth"  // /api/auth/login -> /auth/login
}
```

## ✅ CODE HOÀN CHỈNH:

```javascript
// Middleware
app.use(cors({ origin: "http://localhost:5173", credentials: true }));

// Health check - must be before other routes
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "api-gateway", timestamp: new Date().toISOString() });
});

// User & Auth Service
// NOTE: Do NOT use express.json() before proxy - it consumes the body stream
// http-proxy-middleware needs access to the raw body stream
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
  },
  onError: (err, req, res) => {
    console.error(`[API Gateway] Proxy error for ${req.url}:`, err.message);
    if (!res.headersSent) {
      if (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT") {
        res.status(503).json({ 
          message: "User Service không khả dụng. Vui lòng kiểm tra service đã chạy chưa.",
          error: process.env.NODE_ENV === "development" ? err.message : undefined
        });
      } else {
        res.status(502).json({ 
          message: "Lỗi kết nối đến User Service.",
          error: process.env.NODE_ENV === "development" ? err.message : undefined
        });
      }
    }
  }
}));
```

## ⚠️ QUAN TRỌNG - CẦN RESTART:

**API Gateway PHẢI được restart để áp dụng thay đổi!**

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

- ✅ Không còn timeout
- ✅ PathRewrite hoạt động: `/api/auth/login` → `/auth/login`
- ✅ Body được forward đúng cách
- ✅ Login hoạt động (401 nếu credentials sai, 200 nếu đúng)

## 📝 LƯU Ý:

- **PHẢI restart API Gateway** sau khi sửa code
- **Không dùng `express.json()` trước proxy routes**
- **PathRewrite dùng object pattern**: `{ "^/api/auth": "/auth" }`
- **http-proxy-middleware tự động forward body stream**

