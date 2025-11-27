# 🔧 Hướng Dẫn Xử Lý Lỗi - AESP

## 📋 Mục Lục

1. [Lỗi Port Đã Được Sử Dụng](#lỗi-port-đã-được-sử-dụng)
2. [Lỗi Database Connection](#lỗi-database-connection)
3. [Lỗi Module Không Tìm Thấy](#lỗi-module-không-tìm-thấy)
4. [Lỗi Dependencies](#lỗi-dependencies)
5. [Lỗi Frontend](#lỗi-frontend)
6. [Lỗi Backend Services](#lỗi-backend-services)
7. [Lỗi AI Services](#lỗi-ai-services)
8. [Lỗi Windows Specific](#lỗi-windows-specific)

---

## 🔴 Lỗi Port Đã Được Sử Dụng

### Triệu Chứng:
```
Error: listen EADDRINUSE: address already in use :::4000
```

### Giải Pháp:

**Tự động (Khuyến nghị):**
Script `start-all-services.js` và `start-frontend.js` sẽ tự động kill processes trên ports. Nếu vẫn lỗi:

**Thủ công (Windows PowerShell as Administrator):**

```powershell
# Kill tất cả ports của services
$ports = @(4000, 4001, 4002, 4003, 4004, 4005, 4006, 4007, 4008, 4010, 4011, 5173)
foreach ($port in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conns) {
        $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($pid in $pids) {
            if ($pid) {
                taskkill /F /T /PID $pid
            }
        }
    }
}
```

**Hoặc dùng script có sẵn:**
```powershell
cd backend/services
.\force-kill-ports.ps1
```

---

## 🔴 Lỗi Database Connection

### Triệu Chứng:
```
Error: connect ECONNREFUSED 127.0.0.1:5432
PostgreSQL is not running!
```

### Giải Pháp:

**1. Kiểm tra PostgreSQL đang chạy:**

```powershell
Get-Service -Name "postgresql-x64-18"
```

**2. Start PostgreSQL (PowerShell as Administrator):**

```powershell
Start-Service -Name "postgresql-x64-18"
```

**3. Kiểm tra port 5432:**

```powershell
Get-NetTCPConnection -LocalPort 5432 -State Listen
```

**4. Nếu service không tồn tại:**

- Cài đặt PostgreSQL
- Hoặc kiểm tra tên service: `Get-Service | Where-Object {$_.Name -like "*postgres*"}`

**5. Kiểm tra connection string:**

Xem file `.env` trong `backend/services/[service-name]/.env`

---

## 🔴 Lỗi Module Không Tìm Thấy

### Triệu Chứng:
```
Error: Cannot find module 'xxx'
```

### Giải Pháp:

**1. Cài đặt lại dependencies:**

```bash
# Root
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
cd ..

# Backend Services
cd backend/services
rm -rf node_modules package-lock.json
npm install
cd ../..
```

**2. Kiểm tra package.json:**

Đảm bảo module được khai báo trong `dependencies` hoặc `devDependencies`

**3. Clear npm cache:**

```bash
npm cache clean --force
```

**4. Kiểm tra Node.js version:**

```bash
node --version  # Nên >= 18.x
```

---

## 🔴 Lỗi Dependencies

### Triệu Chứng:
```
npm ERR! peer dep missing
npm ERR! conflict
```

### Giải Pháp:

**1. Xóa và cài lại:**

```bash
# Xóa tất cả node_modules
rm -rf node_modules frontend/node_modules backend/services/node_modules

# Xóa package-lock.json
rm -f package-lock.json frontend/package-lock.json backend/services/package-lock.json

# Cài lại
npm install
cd frontend && npm install && cd ..
cd backend/services && npm install && cd ../..
```

**2. Fix conflicts:**

```bash
npm install --legacy-peer-deps
```

**3. Kiểm tra version conflicts:**

Xem file `check-dependency-conflicts.js` ở root

---

## 🔴 Lỗi Frontend

### Triệu Chứng:
- Frontend không start
- Vite errors
- Port 5173 bị chiếm

### Giải Pháp:

**1. Kill port 5173:**

```powershell
$conns = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if ($conns) {
    $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($pid in $pids) {
        taskkill /F /T /PID $pid
    }
}
```

**2. Kiểm tra files cần thiết:**

```bash
cd frontend
# Đảm bảo có:
# - index.html
# - src/main.jsx
# - vite.config.js
# - package.json
```

**3. Reinstall dependencies:**

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**4. Clear Vite cache:**

```bash
cd frontend
rm -rf node_modules/.vite
```

**5. Kiểm tra vite.config.js:**

Đảm bảo config đúng, xem `frontend/vite.config.js`

---

## 🔴 Lỗi Backend Services

### Triệu Chứng:
- Service không start
- Service crash ngay sau khi start
- API Gateway không respond

### Giải Pháp:

**1. Kiểm tra logs:**

Xem logs trong terminal nơi chạy `start-all-services.js`

**2. Kiểm tra từng service:**

```bash
cd backend/services/[service-name]
npm run dev
```

**3. Kiểm tra .env files:**

Mỗi service cần file `.env` với config đúng:
- Database connection
- Port
- API keys (nếu có)

**4. Kiểm tra database:**

Đảm bảo PostgreSQL đang chạy và database đã được tạo

**5. Restart tất cả:**

```bash
# Dừng tất cả (Ctrl+C)
# Kill ports
# Start lại
npm run dev:be:micro
```

**6. Kiểm tra API Gateway:**

```bash
curl http://localhost:4000/health
```

---

## 🔴 Lỗi AI Services

### Triệu Chứng:
- AI service không start
- Python errors
- CUDA/GPU errors

### Giải Pháp:

**1. Kiểm tra Python:**

```bash
python --version  # Nên >= 3.8
```

**2. Cài đặt Python dependencies:**

```bash
cd backend/ai_models
pip install -r requirements_assistant_ai.txt
```

**3. Kiểm tra CUDA (nếu dùng GPU):**

```bash
npm run aiesp:gpu:check
```

**4. Fix PyTorch CUDA:**

```bash
npm run fix:pytorch
```

**5. Kiểm tra AI service:**

```bash
npm run check:assistant
npm run check:current-ai
```

---

## 🔴 Lỗi Windows Specific

### Triệu Chứng:
- PowerShell errors
- Permission denied
- Process không kill được

### Giải Pháp:

**1. Chạy PowerShell as Administrator:**

Right-click PowerShell → "Run as Administrator"

**2. Set Execution Policy:**

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**3. Kill processes manually:**

```powershell
# Tìm process
Get-Process -Name node | Where-Object {$_.Path -like "*aesp*"}

# Kill process
Stop-Process -Name node -Force
```

**4. Kiểm tra ports:**

```powershell
Get-NetTCPConnection -LocalPort 4000,5173 -State Listen | Format-Table
```

**5. Restart services:**

```powershell
# Restart PostgreSQL
Restart-Service -Name "postgresql-x64-18"
```

---

## 🆘 Vẫn Không Fix Được?

### 1. Xem Logs Chi Tiết:

```bash
# Backend
cd backend/services
node start-all-services.js

# Frontend
cd frontend
node start-frontend.js
```

### 2. Kiểm tra System Requirements:

- Node.js >= 18.x
- PostgreSQL >= 14.x
- Python >= 3.8
- Đủ RAM (recommend 8GB+)
- Ports 4000-4011, 5173, 5432 free

### 3. Clean Install:

```bash
# Xóa tất cả
rm -rf node_modules frontend/node_modules backend/services/node_modules
rm -f package-lock.json frontend/package-lock.json backend/services/package-lock.json

# Cài lại
npm install
cd frontend && npm install && cd ..
cd backend/services && npm install && cd ../..
```

### 4. Kiểm tra Documentation:

- `QUICK_START_GUIDE.md` - Hướng dẫn chạy
- `backend/services/README.md` - Backend docs
- `backend/services/TROUBLESHOOTING.md` - Backend troubleshooting
- `docs/` - Tài liệu chi tiết

### 5. Kiểm tra Issues:

Xem các file fix đã có:
- `FIX_*.md` - Các fix đã áp dụng
- `CLEANUP_SUMMARY.md` - Cleanup đã làm
- `PROCESS_CLEANUP_GUIDE.md` - Hướng dẫn cleanup

---

## 📝 Checklist Khi Gặp Lỗi

- [ ] PostgreSQL đang chạy?
- [ ] Ports đã free?
- [ ] Dependencies đã cài đầy đủ?
- [ ] Node.js version đúng?
- [ ] .env files đã config đúng?
- [ ] Logs có thông báo gì?
- [ ] Đã thử restart?
- [ ] Đã thử clean install?

---

## 💡 Tips Phòng Tránh Lỗi

1. **Luôn chạy PostgreSQL trước** khi start services
2. **Dùng script start** thay vì start thủ công
3. **Kiểm tra logs** khi có lỗi
4. **Giữ dependencies updated**
5. **Backup .env files** trước khi thay đổi
6. **Dùng Ctrl+C** để dừng services, không kill process trực tiếp

---

**Cập nhật lần cuối:** $(Get-Date -Format "yyyy-MM-dd")

