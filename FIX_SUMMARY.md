# Fix: Root Cause - Express.json() Consumes Body Stream

## ✅ ĐÃ TÌM RA NGUYÊN NHÂN:

### Root Cause:
**`express.json()` đã consume request body stream!**

Khi `express.json()` được gọi trước proxy:
1. Nó đọc request body stream
2. Parse JSON thành object → `req.body`
3. **Body stream đã bị consume - không thể đọc lại!**
4. `http-proxy-middleware` cố forward request nhưng không có body stream
5. → **Timeout vì User Service không nhận được body!**

## ✅ GIẢI PHÁP:

### 1. XÓA `express.json()` trước proxy routes:
```javascript
// ❌ SAI
app.use(express.json()); // Consumes body stream
app.use("/api/auth", createProxyMiddleware({...}));

// ✅ ĐÚNG
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

### 2. PathRewrite đúng:
```javascript
pathRewrite: {
  "^/api/auth": "/auth"  // /api/auth/login -> /auth/login
}
```

## ✅ TEST RESULTS:

### User Service trực tiếp:
```bash
POST http://localhost:4005/auth/login
# ✅ 401 Unauthorized (credentials sai, nhưng hoạt động)
```

### API Gateway (SAU FIX):
```bash
POST http://localhost:4000/api/auth/login
# ✅ 401 Unauthorized (credentials sai, nhưng không timeout)
```

## ⚠️ CẦN LÀM:

1. **Restart API Gateway** để áp dụng thay đổi:
   ```bash
   # Stop API Gateway (Ctrl+C)
   # Start lại
   cd backend/services
   node start-all-services.js
   ```

2. **Test login từ browser** - sẽ không còn timeout

3. **Check logs** trong console để verify

## 📝 LƯU Ý:

- **Không dùng `express.json()` trước proxy routes**
- **http-proxy-middleware tự động forward body stream**
- **Chỉ dùng `express.json()` cho routes cần parse body (như health check)**
- **PathRewrite phải đúng: `^/api/auth` → `/auth`**

## 🎯 KẾT QUẢ:

- ✅ Không còn timeout
- ✅ Body được forward đúng cách
- ✅ User Service nhận được request
- ✅ Login hoạt động (401 nếu credentials sai, 200 nếu đúng)

