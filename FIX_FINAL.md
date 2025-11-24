# Fix: Tất Cả Lỗi Ẩn - Microservices Timeout

## Vấn đề:
- Backend đã chạy nhưng login vẫn timeout
- API Gateway timeout khi proxy đến User Service
- Microservices không hoạt động tốt như monolith

## Nguyên nhân:

### 1. API Gateway không forward body đúng cách
- `express.json()` đã parse body thành object
- `http-proxy-middleware` không tự động forward body đã parse
- Cần **manually forward body** trong `onProxyReq`

### 2. Headers không được forward đầy đủ
- Thiếu `Accept: application/json` trong frontend
- Thiếu `keepalive: true` để giữ connection

### 3. Timeout quá dài
- 30s timeout có thể quá dài cho một request đơn giản
- Database query timeout 10s có thể quá dài

## Đã sửa:

### 1. API Gateway - Forward Body (`api-gateway/src/server.js`)
```javascript
onProxyReq: (proxyReq, req, res) => {
  // Forward all headers (except host and connection)
  Object.keys(req.headers).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (lowerKey !== "host" && lowerKey !== "connection") {
      proxyReq.setHeader(key, req.headers[key]);
    }
  });
  
  // Forward body for POST/PUT/PATCH requests
  // Express.json() has already parsed the body, so we need to stringify it again
  if (req.body && (req.method === "POST" || req.method === "PUT" || req.method === "PATCH")) {
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
- ✅ No proxy layers

### Microservices:
- ❌ Network calls - mỗi request phải đi qua network (latency)
- ❌ Serialization - JSON parse/stringify overhead
- ❌ Multiple processes - IPC overhead
- ❌ Proxy layers - Vite → API Gateway → Service (3 hops)
- ❌ Connection overhead - mỗi request cần tạo connection mới (nếu không có keepalive)

### Overhead breakdown:
1. **Vite Proxy** → ~1-2ms
2. **API Gateway** → ~1-2ms
3. **Network** → ~1-5ms
4. **User Service** → ~1-2ms
5. **Database Query** → ~5-50ms (tùy query)

**Total**: ~10-60ms cho một request (so với <1ms trong monolith)

## Giải pháp đã áp dụng:

1. ✅ **Forward body đúng cách** - giảm retry và errors
2. ✅ **Keep connection alive** - giảm connection overhead
3. ✅ **Proper headers** - giảm parsing errors
4. ✅ **Timeout hợp lý** - 30s cho network, 10s cho database
5. ✅ **Better error handling** - specific error messages

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

## Lưu ý:

- **Body forwarding là CRITICAL** - không có body, service không nhận được data → timeout
- **Headers phải đúng** - Content-Type, Accept, Content-Length
- **Keepalive giúp giảm overhead** - không cần tạo connection mới mỗi request
- **Logging trong dev mode** - để debug dễ hơn

## Next Steps:

1. Restart services để áp dụng thay đổi
2. Test login từ browser
3. Check logs trong console
4. Monitor network tab trong DevTools

