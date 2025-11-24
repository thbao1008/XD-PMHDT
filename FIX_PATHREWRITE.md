# Fix: PathRewrite - Cannot POST /login

## Vấn đề:
- Lỗi: "Cannot POST /login"
- Request đến `/login` thay vì `/auth/login`
- PathRewrite không hoạt động đúng

## Nguyên nhân:
- PathRewrite dùng object pattern không match đúng
- Cần dùng function để rewrite path chính xác

## Giải pháp:

### ❌ SAI - Dùng object pattern:
```javascript
pathRewrite: {
  "^/api/auth": "/auth"  // Không hoạt động đúng
}
```

### ✅ ĐÚNG - Dùng function:
```javascript
pathRewrite: (path, req) => {
  // /api/auth/login -> /auth/login
  return path.replace(/^\/api\/auth/, "/auth");
}
```

## Code Changes:

### `backend/services/api-gateway/src/server.js`
```javascript
app.use("/api/auth", createProxyMiddleware({
  target: SERVICES.user,
  changeOrigin: true,
  pathRewrite: (path, req) => {
    // /api/auth/login -> /auth/login
    return path.replace(/^\/api\/auth/, "/auth");
  },
  timeout: 30000,
  proxyTimeout: 30000,
  // ...
}));
```

## Flow hoạt động:

1. **Frontend** → `POST /api/auth/login`
2. **Vite Proxy** → Forward đến `http://localhost:4000/api/auth/login`
3. **API Gateway** → PathRewrite: `/api/auth/login` → `/auth/login`
4. **User Service** → `POST /auth/login` ✅

## Testing:

### Test trực tiếp User Service:
```bash
curl -X POST http://localhost:4005/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@gmail.com","password":"123456"}'
# ✅ 401 Unauthorized (credentials sai, nhưng hoạt động)
```

### Test qua API Gateway (SAU FIX):
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@gmail.com","password":"123456"}'
# ✅ 401 Unauthorized (credentials sai, nhưng không 404)
```

## Lưu ý:

- **Dùng function cho pathRewrite** để control chính xác
- **Regex pattern phải đúng**: `/^\/api\/auth/` để match từ đầu
- **Replace với `/auth`** để giữ lại phần sau `/login`

## Next Steps:

1. **Restart API Gateway** để áp dụng thay đổi
2. Test login từ browser
3. Check logs trong console

