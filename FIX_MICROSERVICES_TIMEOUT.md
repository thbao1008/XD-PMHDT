# Fix: Microservices Timeout - Tìm và Sửa Lỗi Ẩn

## Vấn đề:
- Backend đã chạy nhưng login vẫn timeout
- Microservices không hoạt động tốt như monolith
- Request timeout sau 30s

## Nguyên nhân tìm được:

### 1. API Gateway không forward body đúng cách
- `http-proxy-middleware` cần forward body manually cho POST requests
- Body không được forward → User Service không nhận được data → Timeout

### 2. Frontend fetch thiếu headers
- Thiếu `Accept: application/json`
- Thiếu `keepalive: true` để giữ connection

### 3. Express body parser có thể conflict
- Cần đảm bảo body được parse trước khi proxy

## Đã sửa:

### 1. API Gateway - Forward Body (`api-gateway/src/server.js`)
```javascript
onProxyReq: (proxyReq, req, res) => {
  // Forward all headers
  Object.keys(req.headers).forEach(key => {
    if (key !== "host" && key !== "connection" && key !== "content-length") {
      proxyReq.setHeader(key, req.headers[key]);
    }
  });
  
  // Forward body for POST/PUT requests
  if (req.body && Object.keys(req.body).length > 0) {
    const bodyData = JSON.stringify(req.body);
    proxyReq.setHeader("Content-Type", "application/json");
    proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
    proxyReq.write(bodyData);
  }
}
```

### 2. Frontend - Better Headers (`authService.js`)
```javascript
const res = await fetch(`${BASE_URL}/login`, {
  method: "POST",
  headers: { 
    "Content-Type": "application/json",
    "Accept": "application/json"
  },
  body: JSON.stringify({ identifier, password }),
  signal: controller.signal,
  credentials: "include",
  keepalive: true, // Keep connection alive
});
```

## Tại sao Microservices chậm hơn Monolith?

### Monolith:
- ✅ Direct function calls - không có network overhead
- ✅ Shared memory - không cần serialize/deserialize
- ✅ Single process - không có IPC overhead

### Microservices:
- ❌ Network calls - mỗi request phải đi qua network
- ❌ Serialization - JSON parse/stringify overhead
- ❌ Multiple processes - IPC overhead
- ❌ Proxy layers - Vite → API Gateway → Service

### Giải pháp:
1. ✅ Forward body đúng cách - giảm retry
2. ✅ Keep connection alive - giảm connection overhead
3. ✅ Proper headers - giảm parsing errors
4. ✅ Timeout hợp lý - tránh treo quá lâu

## Testing:

### Test trực tiếp User Service:
```bash
curl -X POST http://localhost:4005/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@gmail.com","password":"123456"}'
```

### Test qua API Gateway:
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@gmail.com","password":"123456"}'
```

### Test qua Browser:
- Mở DevTools → Network tab
- Thử login
- Check request/response
- Check timing

## Lưu ý:

- **Body forwarding là critical** - không có body, service không nhận được data
- **Headers phải đúng** - Content-Type, Accept, Content-Length
- **Keepalive giúp giảm overhead** - không cần tạo connection mới mỗi request
- **Timeout hợp lý** - 30s cho network requests, 10s cho database queries

