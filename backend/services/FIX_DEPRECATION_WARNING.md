# Fix: util._extend Deprecation Warning

## Vấn đề:
```
(node:xxxx) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. 
Please use Object.assign() instead.
```

## Nguyên nhân:
- `http-proxy-middleware` version cũ (< 3.0.0) sử dụng `util._extend` (deprecated API)
- Hoặc dependency của `http-proxy-middleware` vẫn dùng `util._extend`

## Giải pháp đã áp dụng:

### 1. Update `http-proxy-middleware` lên v3.0.5
```json
"http-proxy-middleware": "^3.0.5"
```

### 2. Thêm `--no-deprecation` flag vào start script
```json
"scripts": {
  "start": "node --no-deprecation src/server.js",
  "dev": "node --watch --no-deprecation src/server.js"
}
```

### 3. Reinstall dependencies
```bash
cd backend/services/api-gateway
rm -rf node_modules
npm install
```

## Kiểm tra:

### Xem version đã được update chưa:
```bash
cd backend/services/api-gateway
npm list http-proxy-middleware
```

### Test start service:
```bash
npm run start
```

Nếu vẫn còn warning, có thể do:
- Dependency khác của `http-proxy-middleware` vẫn dùng `util._extend`
- Cache của Node.js
- Cần restart service

## Alternative: Suppress tất cả deprecation warnings

Nếu muốn suppress tất cả deprecation warnings cho tất cả services:

### Option 1: Set NODE_OPTIONS trong start-all-services.js
```javascript
const child = spawn("npm", ["run", "start"], {
  cwd: servicePath,
  stdio: ["ignore", "inherit", "inherit"],
  shell: true,
  env: {
    ...process.env,
    NODE_OPTIONS: "--no-deprecation"
  }
});
```

### Option 2: Set trong package.json của mỗi service
```json
"scripts": {
  "start": "node --no-deprecation src/server.js"
}
```

## Lưu ý:
- Warning này không ảnh hưởng đến chức năng
- Chỉ là cảnh báo về API deprecated
- Có thể bỏ qua nếu không muốn suppress

