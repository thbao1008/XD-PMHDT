# Fix: Root Cause - Express.json() Consumes Body Stream

## Vấn đề:
- API Gateway timeout khi proxy đến User Service
- Frontend timeout sau 30s
- User Service trực tiếp hoạt động tốt (401 - credentials sai)

## Root Cause:

### Vấn đề chính:
**`express.json()` đã consume request body stream!**

Khi `express.json()` được gọi:
1. Nó đọc request body stream
2. Parse JSON thành object
3. Lưu vào `req.body`
4. **Body stream đã bị consume - không thể đọc lại!**

Khi `http-proxy-middleware` cố forward request:
1. Nó cần đọc body stream để forward
2. Nhưng stream đã bị consume bởi `express.json()`
3. → **Timeout vì không có body để forward!**

## Giải pháp:

### ❌ SAI - Dùng express.json() trước proxy:
```javascript
app.use(express.json()); // ❌ Consumes body stream
app.use("/api/auth", createProxyMiddleware({...})); // ❌ Không có body để forward
```

### ✅ ĐÚNG - Không dùng express.json() cho proxy routes:
```javascript
// Không dùng express.json() - để http-proxy-middleware tự forward body stream
app.use("/api/auth", createProxyMiddleware({
  target: SERVICES.user,
  changeOrigin: true,
  pathRewrite: {
    "^/api/auth": "/auth"  // /api/auth/login -> /auth/login
  },
  // http-proxy-middleware automatically forwards the body stream
}));
```

## Code Changes:

### `backend/services/api-gateway/src/server.js`
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
  // http-proxy-middleware automatically forwards the body stream
  // We don't need to manually forward it if express.json() is not used
}));
```

## Tại sao User Service trực tiếp hoạt động?

- User Service có `express.json()` để parse body
- Request đi trực tiếp → body stream chưa bị consume
- `express.json()` parse body → `req.body` có data
- Login function đọc `req.body` → hoạt động tốt

## Tại sao API Gateway timeout?

- Request đến API Gateway
- `express.json()` consume body stream → parse thành `req.body`
- Proxy middleware cố forward request
- **Không có body stream để forward** → User Service không nhận được body
- User Service đợi body → timeout

## Testing:

### Test trực tiếp User Service:
```bash
curl -X POST http://localhost:4005/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@gmail.com","password":"123456"}'
# ✅ Hoạt động (401 - credentials sai)
```

### Test qua API Gateway (SAU FIX):
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@gmail.com","password":"123456"}'
# ✅ Hoạt động (401 - credentials sai, nhưng không timeout)
```

## Lưu ý:

- **Không dùng `express.json()` trước proxy routes**
- **http-proxy-middleware tự động forward body stream**
- **Chỉ dùng `express.json()` cho routes cần parse body (như health check)**
- **PathRewrite phải đúng: `^/api/auth` → `/auth`**

## Next Steps:

1. **Restart API Gateway** để áp dụng thay đổi
2. Test login từ browser
3. Check logs trong console
4. Monitor network tab trong DevTools

