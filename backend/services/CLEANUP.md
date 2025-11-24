# Cleanup Summary

## Scripts Đã Xóa (Không Cần Thiết):

### Backend Services:
1. `restart-clean.ps1` - Đã tích hợp vào `start-all-services.js`
2. `restart-all.ps1` - Đã tích hợp vào `start-all-services.js`
3. `test-service-start.ps1` - Script test không cần thiết
4. `kill-all-ports.js` - Đã tích hợp vào `start-all-services.js`
5. `kill-all-ports.ps1` - Đã tích hợp vào `start-all-services.js`
6. `kill-all-ports-aggressive.ps1` - Đã tích hợp vào `start-all-services.js`
7. `test-backend.js` - Script test không cần thiết
8. `test-services.js` - Script test không cần thiết

### Root Level:
1. `test-api-gateway.ps1` - Script test không cần thiết
2. `test-all-services.ps1` - Script test không cần thiết
3. `fix-frontend-complete.ps1` - Đã tích hợp vào `scripts/start-frontend.js`
4. `restart-frontend.ps1` - Đã tích hợp vào `scripts/start-frontend.js`

### Database:
1. `backend/db/test_migration.js` - Script test migration không cần thiết

## Scripts Còn Lại (Cần Thiết):

1. `start-all-services.js` - **Script chính** để start tất cả services
   - Tự động kill tất cả processes trước khi start
   - Kill: ports, npm, node, cmd, PowerShell jobs
   - Đợi ports được release trước khi start

2. `kill-all-processes-complete.ps1` (ở root) - Script kill tất cả processes
   - Dùng khi cần kill thủ công
   - Không tự động chạy, chỉ khi cần

3. `check-health.js` - Kiểm tra health của services

4. `install-all.ps1` - Install dependencies cho tất cả services

5. `setup-env.ps1` - Setup environment variables

## Cách Sử Dụng:

### Start Backend Services:
```bash
cd backend/services
node start-all-services.js
```

Script sẽ tự động:
1. Kill tất cả processes trên service ports
2. Kill tất cả npm, node, cmd processes liên quan
3. Stop PowerShell jobs
4. Đợi 8 giây
5. Kill lại lần nữa (double-check)
6. Đợi 5 giây
7. Start tất cả services

### Kill Tất Cả Processes (Thủ Công):
```powershell
.\kill-all-processes-complete.ps1
```

### Stop Services:
- Nhấn `Ctrl+C` trong terminal chạy `start-all-services.js`
- Script sẽ tự động kill tất cả child processes
