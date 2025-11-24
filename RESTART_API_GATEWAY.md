# ⚠️ QUAN TRỌNG: RESTART API GATEWAY

## Vấn đề:
- PathRewrite đã được sửa nhưng vẫn 404
- API Gateway cần được **restart** để áp dụng thay đổi

## ✅ CÁCH RESTART:

### Option 1: Restart tất cả services (Khuyên dùng)
```bash
# Stop tất cả services (Ctrl+C trong terminal chạy start-all-services.js)
# Start lại
cd backend/services
node start-all-services.js
```

Script sẽ tự động:
1. Kill API Gateway (port 4000)
2. Kill tất cả services khác
3. Start lại tất cả services (bao gồm API Gateway)

### Option 2: Restart chỉ API Gateway
```bash
# Kill API Gateway
# Windows PowerShell:
Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue | 
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Start lại API Gateway
cd backend/services/api-gateway
npm run dev
```

## ✅ SAU KHI RESTART:

Test lại:
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"test","password":"test"}'
```

Kết quả mong đợi:
- ✅ 401 Unauthorized (credentials sai, nhưng route đúng)
- ❌ Không còn 404 Not Found

## 📝 LƯU Ý:

- **Mỗi lần sửa code API Gateway, PHẢI restart**
- Script `start-all-services.js` đã tích hợp kill API Gateway trước khi start
- Chỉ cần chạy `node start-all-services.js` là đủ

