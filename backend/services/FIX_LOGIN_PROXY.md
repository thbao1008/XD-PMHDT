# Fix: Login không hoạt động qua Vite Proxy

## Vấn đề:
- `[FE] [Vite Proxy] POST /api/auth/login k theer login`
- API Gateway timeout khi proxy đến User Service
- Vite proxy không forward request đúng cách

## Nguyên nhân:
1. **Vite proxy không forward body đúng cách** cho POST requests
2. **API Gateway timeout** khi proxy đến User Service
3. **Headers không được forward đầy đủ**

## Giải pháp đã áp dụng:

### 1. Vite Proxy Configuration (`frontend/vite.config.js`)
- Thêm `ws: true` để enable websocket proxying
- Better error handling với proper response
- Forward body cho POST/PUT requests
- Log responses trong dev mode

### 2. API Gateway Proxy (`backend/services/api-gateway/src/server.js`)
- Forward tất cả headers (trừ host và connection)
- Log requests trong dev mode
- Better error handling

## Code Changes:

### `frontend/vite.config.js`
```javascript
proxy.on("proxyReq", (proxyReq, req, res) => {
  // Ensure body is forwarded for POST/PUT requests
  if (req.body && Object.keys(req.body).length > 0) {
    const bodyData = JSON.stringify(req.body);
    proxyReq.setHeader("Content-Type", "application/json");
    proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
    proxyReq.write(bodyData);
  }
});
```

### `backend/services/api-gateway/src/server.js`
```javascript
onProxyReq: (proxyReq, req, res) => {
  // Forward all headers
  Object.keys(req.headers).forEach(key => {
    if (key !== "host" && key !== "connection") {
      proxyReq.setHeader(key, req.headers[key]);
    }
  });
}
```

## Testing:

### Test trực tiếp User Service:
```bash
curl -X POST http://localhost:4005/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"test","password":"test"}'
```

### Test qua API Gateway:
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"test","password":"test"}'
```

### Test qua Vite Proxy (từ browser):
- Mở DevTools → Network tab
- Thử login
- Check request/response

## Lưu ý:

- Vite proxy tự động forward body, nhưng cần đảm bảo headers đúng
- API Gateway cần forward tất cả headers để User Service nhận đúng
- Timeout được set 30s để tránh timeout errors
- Log trong dev mode để debug dễ hơn

