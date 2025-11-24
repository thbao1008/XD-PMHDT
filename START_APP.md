# 🚀 Hướng Dẫn Chạy Backend và Frontend

## 📋 Yêu Cầu

- Node.js (v18+)
- PostgreSQL database đang chạy
- Redis (nếu sử dụng queue handlers)
- Python (cho AI services nếu cần)

## 🔧 Bước 1: Cài Đặt Dependencies

### Cài đặt dependencies cho root và frontend
```bash
# Từ thư mục root
npm install
```

### Cài đặt dependencies cho tất cả microservices
```bash
cd backend/services
npm run install:all
```

## 🎯 Bước 2: Cấu Hình Environment Variables

### Backend Services
Mỗi service cần file `.env` riêng. Đảm bảo có:
- `DATABASE_URL` - Connection string cho PostgreSQL
- `JWT_SECRET` - Secret key cho JWT tokens
- `PORT` - Port cho từng service (hoặc dùng default)
- Các API keys khác (OpenRouter, etc.)

### Frontend
Tạo file `frontend/.env` (optional):
```env
VITE_API_BASE=http://localhost:4000/api
```

## 🖥️ Bước 3: Chạy Backend (Microservices)

### Cách 1: Chạy Tất Cả Services Cùng Lúc (Khuyến Nghị)
```bash
cd backend/services
node start-all-services.js
```

Script này sẽ start tất cả 11 services:
- ✅ API Gateway (port 4000)
- ✅ Notification Service (port 4001)
- ✅ Community Service (port 4002)
- ✅ Package Service (port 4003)
- ✅ Purchase Service (port 4004)
- ✅ User Service (port 4005)
- ✅ Mentor Service (port 4006)
- ✅ Learner Service (port 4007)
- ✅ Admin Service (port 4008)
- ✅ AI Service (port 4010)
- ✅ File Service (port 4011)

**Lưu ý**: Nhấn `Ctrl+C` để dừng tất cả services.

### Cách 2: Chạy Từng Service Riêng Lẻ
```bash
# Terminal 1 - API Gateway
cd backend/services/api-gateway
npm run dev

# Terminal 2 - User Service
cd backend/services/user-service
npm run dev

# Terminal 3 - Learner Service
cd backend/services/learner-service
npm run dev

# ... (tương tự cho các services khác)
```

## 🎨 Bước 4: Chạy Frontend

### Mở terminal mới (giữ backend đang chạy)
```bash
# Từ thư mục root
npm run dev:fe
```

Hoặc:
```bash
cd frontend
npm run dev
```

Frontend sẽ chạy trên: **http://localhost:5173**

## ✅ Bước 5: Kiểm Tra Health

### Kiểm tra tất cả services
```bash
cd backend/services
node check-health.js
```

### Kiểm tra từng service
```bash
# API Gateway
curl http://localhost:4000/health

# User Service
curl http://localhost:4005/health

# Learner Service
curl http://localhost:4007/health

# ... (tương tự cho các services khác)
```

## 🔍 Bước 6: Test Application

1. **Mở trình duyệt**: http://localhost:5173
2. **Test login**: Đăng nhập với tài khoản admin/mentor/learner
3. **Test các features**:
   - Learner: Challenges, Speaking Practice, Story Mode
   - Mentor: Create Challenges, Assess Submissions
   - Admin: Dashboard, User Management

## 📝 Scripts Tiện Lợi

### Chạy cả Backend và Frontend cùng lúc
```bash
# Từ thư mục root
npm run dev:all
```

**Lưu ý**: Script này sẽ chạy monolithic backend cũ. Để chạy microservices, dùng `start-all-services.js` như trên.

### Chạy chỉ Backend (Monolithic - Cũ)
```bash
npm run dev:be
```

### Chạy chỉ Frontend
```bash
npm run dev:fe
```

## 🐛 Troubleshooting

### Lỗi Port Đã Được Sử Dụng
```bash
# Windows - Tìm process đang dùng port
netstat -ano | findstr :4000

# Kill process
taskkill /PID <PID> /F
```

### Lỗi Database Connection
- Kiểm tra PostgreSQL đang chạy
- Kiểm tra `DATABASE_URL` trong `.env`
- Kiểm tra database đã được tạo chưa

### Lỗi Missing Dependencies
```bash
# Reinstall tất cả
cd backend/services
npm run install:all
```

### Lỗi CORS
- Đảm bảo API Gateway đang chạy
- Kiểm tra CORS config trong API Gateway

## 📊 Ports Summary

| Service | Port | URL |
|---------|------|-----|
| API Gateway | 4000 | http://localhost:4000 |
| Notification Service | 4001 | http://localhost:4001 |
| Community Service | 4002 | http://localhost:4002 |
| Package Service | 4003 | http://localhost:4003 |
| Purchase Service | 4004 | http://localhost:4004 |
| User Service | 4005 | http://localhost:4005 |
| Mentor Service | 4006 | http://localhost:4006 |
| Learner Service | 4007 | http://localhost:4007 |
| Admin Service | 4008 | http://localhost:4008 |
| AI Service | 4010 | http://localhost:4010 |
| File Service | 4011 | http://localhost:4011 |
| Frontend | 5173 | http://localhost:5173 |

## 🎯 Quick Start (Tóm Tắt)

```bash
# 1. Install dependencies
npm install
cd backend/services && npm run install:all

# 2. Start backend (terminal 1)
cd backend/services
node start-all-services.js

# 3. Start frontend (terminal 2)
cd ../..
npm run dev:fe

# 4. Open browser
# http://localhost:5173
```

## ✅ Checklist

- [ ] Dependencies đã được cài đặt
- [ ] Database đang chạy và có schema
- [ ] Environment variables đã được cấu hình
- [ ] Tất cả backend services đang chạy
- [ ] Frontend đang chạy
- [ ] Health checks pass
- [ ] Có thể login và sử dụng app

---

**Happy Coding! 🚀**

