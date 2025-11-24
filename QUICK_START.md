# ⚡ Quick Start Guide

## 🚀 Cách Nhanh Nhất (1 Lệnh) - KHUYẾN NGHỊ

**⚠️ QUAN TRỌNG: Start PostgreSQL trước!**

```powershell
# Run as Administrator
cd backend/services
.\start-postgresql.ps1
```

**Sau đó chạy tất cả (Backend + Frontend) cùng lúc:**
```powershell
.\start-all.ps1
```

Script này sẽ:
- ✅ Tự động kill tất cả processes cũ
- ✅ Start tất cả backend services
- ✅ Start frontend
- ✅ Hiển thị URLs và cách kiểm tra

## 🚀 Chạy Thủ Công (3 Bước)

### ⚠️ BƯỚC 0: Start PostgreSQL (BẮT BUỘC)

**Nếu PostgreSQL chưa chạy, tất cả services sẽ lỗi kết nối database!**

```powershell
# Run as Administrator
cd backend/services
.\start-postgresql.ps1
```

Hoặc thủ công:
```powershell
# Run as Administrator
Start-Service -Name "postgresql-x64-18"
```

Kiểm tra:
```powershell
Get-NetTCPConnection -LocalPort 5432
```

Xem thêm: `backend/services/START_DATABASE.md`

### ⚠️ BƯỚC 0.5: Nếu gặp lỗi "Port already in use"

**Chạy script này trước để kill tất cả processes cũ:**
```powershell
cd backend/services
.\kill-all-ports.ps1
```

Hoặc dùng script tự động restart:
```powershell
cd backend/services
.\restart-all.ps1
```

### Bước 1: Start Backend (Microservices)
```bash
cd backend/services
node start-all-services.js
```

**Lưu ý**: 
- Script sẽ tự động kill các processes cũ trước khi start (dùng `taskkill` để kill toàn bộ process tree)
- Script dùng `npm run start` (không watch) để tránh port conflicts
- Nếu vẫn lỗi "Port already in use", chạy `.\kill-all-ports.ps1` trước (hoặc `.\kill-all-ports-aggressive.ps1` nếu cần kill mạnh hơn)

### Bước 2: Start Frontend (Terminal mới)

**Cách 1: Từ thư mục root**
```bash
npm run dev:fe
```

**Cách 2: Từ thư mục frontend**
```bash
cd frontend
npm install  # Chỉ cần chạy lần đầu
npm run dev
```

**Cách 3: Chạy cả Backend và Frontend cùng lúc**
```bash
npm run dev:micro
```

## 📍 URLs

- **Frontend**: http://localhost:5173
- **API Gateway**: http://localhost:4000

## ✅ Kiểm Tra

```bash
# Health check
cd backend/services
node check-health.js
```

## 🐛 Troubleshooting

### Frontend 404 Error

Nếu gặp lỗi `404 Not Found` trên `http://localhost:5173`:

```powershell
# Cách nhanh nhất - Restart frontend
.\restart-frontend.ps1
```

Hoặc thủ công:
```powershell
# Kill processes trên port 5173
cd backend/services
.\kill-all-ports.ps1

# Start lại frontend (từ root)
cd ..\..
npm run dev:fe
```

**Lưu ý**: Frontend phải chạy từ thư mục root với `npm run dev:fe` để sử dụng đúng config.

### Services Timeout

Nếu một số services bị timeout:
1. Đợi thêm 10-20 giây để services khởi động xong
2. Chạy lại health check
3. Kiểm tra logs của service đó để xem lỗi

### Test Tất Cả Services

```powershell
# Test tất cả services
.\test-all-services.ps1
```

---

Xem chi tiết trong `START_APP.md`

