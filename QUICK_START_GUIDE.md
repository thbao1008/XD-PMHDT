# 🚀 Hướng Dẫn Chạy Ứng Dụng AESP

## 📋 Yêu Cầu Hệ Thống

- **Node.js**: >= 18.x
- **PostgreSQL**: >= 14.x (đang chạy trên port 5432)
- **npm**: >= 9.x
- **Python**: >= 3.8 (cho AI models)
- **OS**: Windows 10/11 (hoặc Linux/Mac)

## 🔧 Cài Đặt Ban Đầu

### 1. Cài đặt Dependencies

```bash
# Cài đặt dependencies cho root
npm install

# Cài đặt dependencies cho frontend
cd frontend
npm install
cd ..

# Cài đặt dependencies cho backend services
cd backend/services
npm install
cd ../..
```

### 2. Cấu Hình Database

Đảm bảo PostgreSQL đang chạy:

**Windows (PowerShell as Administrator):**
```powershell
Start-Service -Name "postgresql-x64-18"
```

**Hoặc kiểm tra:**
```powershell
Get-Service -Name "postgresql-x64-18"
```

Xem chi tiết: `backend/services/START_DATABASE.md`

## 🎯 Các Cách Chạy Ứng Dụng

### Option 1: Chạy Tất Cả (Backend + Frontend) - Khuyến Nghị

```bash
npm run dev
```

Hoặc:

```bash
npm run dev:all
```

Lệnh này sẽ chạy:
- ✅ Tất cả microservices (backend)
- ✅ Frontend (Vite dev server)

### Option 2: Chạy Riêng Lẻ

#### Chạy Backend Services:

```bash
npm run dev:be:micro
```

Hoặc:

```bash
cd backend/services
node start-all-services.js
```

**Services sẽ chạy trên:**
- API Gateway: http://localhost:4000
- Notification Service: http://localhost:4001
- Community Service: http://localhost:4002
- Package Service: http://localhost:4003
- Purchase Service: http://localhost:4004
- User Service: http://localhost:4005
- Mentor Service: http://localhost:4006
- Learner Service: http://localhost:4007
- Admin Service: http://localhost:4008
- AI Service: http://localhost:4010
- File Service: http://localhost:4011

#### Chạy Frontend:

```bash
npm run dev:fe
```

Hoặc:

```bash
cd frontend
node start-frontend.js
```

**Frontend sẽ chạy trên:** http://localhost:5173

## 🛑 Dừng Ứng Dụng

Nhấn `Ctrl+C` trong terminal đang chạy để dừng tất cả services.

## 🔍 Kiểm Tra Trạng Thái

### Kiểm tra Ports đang sử dụng (Windows):

```powershell
Get-NetTCPConnection -LocalPort 4000,4001,4002,4003,4004,4005,4006,4007,4008,4010,4011,5173 -State Listen
```

### Kiểm tra PostgreSQL:

```powershell
Get-NetTCPConnection -LocalPort 5432 -State Listen
```

## 🐛 Xử Lý Lỗi

Xem file `TROUBLESHOOTING.md` ở root để biết cách fix các lỗi thường gặp.

### Lỗi Thường Gặp:

1. **Port đã được sử dụng**
   - Script sẽ tự động kill process trên port đó
   - Nếu vẫn lỗi, xem `TROUBLESHOOTING.md`

2. **PostgreSQL không chạy**
   - Script sẽ cảnh báo nếu PostgreSQL không chạy
   - Start PostgreSQL trước khi chạy services

3. **Dependencies chưa cài**
   - Chạy `npm install` trong từng thư mục cần thiết
   - Frontend: `cd frontend && npm install`
   - Backend: `cd backend/services && npm install`

4. **Module không tìm thấy**
   - Xóa `node_modules` và `package-lock.json`
   - Chạy lại `npm install`

## 📚 Tài Liệu Tham Khảo

- **Backend Services**: `backend/services/README.md`
- **Database Setup**: `backend/services/START_DATABASE.md`
- **Troubleshooting**: `TROUBLESHOOTING.md` (root)
- **API Documentation**: `docs/api-spec.md`
- **Architecture**: `docs/MICROSERVICES_ARCHITECTURE.md`

## 🎨 Scripts Khác

### Build Production:

```bash
npm run build
```

### Chạy AI Training:

```bash
npm run aiesp:learn
npm run aiesp:train:goals
npm run aiesp:gpu:train
```

### Seed Data:

```bash
npm run seed:admin
npm run generate:learners
```

## 💡 Tips

1. **Lần đầu chạy**: Script sẽ tự động kill các process cũ trên ports
2. **Auto-reload**: Services tự động reload khi code thay đổi
3. **Logs**: Xem logs trực tiếp trong terminal
4. **Ctrl+C**: Dừng tất cả services một cách graceful

## ⚠️ Lưu Ý

- Đảm bảo PostgreSQL đang chạy trước khi start services
- Ports 4000-4011 và 5173 phải free hoặc script sẽ tự động kill
- Trên Windows, có thể cần chạy PowerShell as Administrator để kill processes

