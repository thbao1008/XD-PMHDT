# Troubleshooting Guide

## Services không phản hồi Health Check

### Triệu chứng:
- Services đang chạy (ports Listen) nhưng health check timeout
- `check-health.js` báo "Timeout" hoặc "fetch failed"

### Nguyên nhân có thể:

1. **Database Connection Blocking**
   - Services đang chờ database connection
   - Database không chạy hoặc không thể kết nối
   - Connection timeout quá lâu

2. **Services bị stuck**
   - Services đang chờ một operation nào đó
   - Có deadlock hoặc infinite loop

### Giải pháp:

#### 1. Kiểm tra Database
```powershell
# Kiểm tra PostgreSQL có chạy không
Get-Service -Name "*postgres*"

# Hoặc test connection
psql -U postgres -d aesp -c "SELECT NOW();"
```

#### 2. Restart Services Clean
```powershell
cd backend/services
.\kill-all-ports-aggressive.ps1
Start-Sleep -Seconds 5
node start-all-services.js
```

#### 3. Test từng Service
```powershell
# Test User Service
cd backend/services/user-service
node src/server.js

# Trong terminal khác
Invoke-WebRequest -Uri "http://localhost:4005/health" -TimeoutSec 5
```

#### 4. Kiểm tra Logs
- Xem console output của services
- Tìm lỗi database connection
- Tìm lỗi "timeout" hoặc "connection refused"

### Health Check Timeout Settings

- `check-health.js`: 5 seconds timeout
- User Service health: 2 seconds DB timeout
- API Gateway: No timeout (should respond immediately)

### Nếu vẫn không được:

1. Kill tất cả processes: `.\kill-all-ports-aggressive.ps1`
2. Đợi 10 giây
3. Kiểm tra database có chạy không
4. Start lại services: `node start-all-services.js`
5. Đợi 15 giây rồi check health: `node check-health.js`

