# AESP Microservices

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Setup Environment (Optional)
Nếu có file `.env.local` hoặc `.env.docker`, copy vào `backend/services/`:
```powershell
.\setup-env.ps1
```

### 3. Start All Services

**Cách 1: Simple (khuyến nghị - hiển thị lỗi rõ ràng)**
```bash
node start-simple.js
```

**Cách 2: Standard**
```bash
node start-all-services.js
```

**Cách 3: PowerShell**
```powershell
.\start-all-services.ps1
```

### 4. Check Health
```bash
node check-health.js
```

## 📋 Services

| Service | Port | Description |
|---------|------|-------------|
| API Gateway | 4000 | Entry point for all requests |
| Notification | 4001 | Notifications |
| Community | 4002 | Community features |
| Package | 4003 | Learning packages |
| Purchase | 4004 | Purchases |
| User | 4005 | Authentication & Users |
| Mentor | 4006 | Mentor features |
| Learner | 4007 | Learner features |
| Admin | 4008 | Admin features |
| AI | 4010 | AI services |
| File | 4011 | File uploads |

## 🔧 Troubleshooting

### Services không start
1. Kiểm tra PostgreSQL đang chạy
2. Kiểm tra ports không bị conflict
3. Xem logs của từng service để biết lỗi

### Test từng service
```powershell
.\test-service-start.ps1 [service-name]
# Ví dụ: .\test-service-start.ps1 mentor
```

## 📝 Notes

- Services đọc `.env.local` hoặc `.env.docker` từ `backend/services/`
- Database default: `localhost:5432`, user: `postgres`, db: `aesp`, password: `1234`
- Có thể override bằng environment variables
