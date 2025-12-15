
﻿# AESP - Học Tập Thông Minh

Hệ thống học tập thông minh sử dụng kiến trúc microservices với AI hỗ trợ.

## 🚀 Yêu Cầu Hệ Thống

- **Docker & Docker Compose** (phiên bản mới nhất)
- **Node.js** 20+ (cho development local)
- **PostgreSQL** 15+ (tự động qua Docker)
- **Git**

## 📦 Cài Đặt & Chạy

### 1. Clone Repository
```bash
git clone <repository-url>
cd aesp
```

### 2. Chạy với Docker (Khuyến nghị)

```bash
# Build và chạy tất cả services
docker-compose up --build

# Chạy background
docker-compose up --build -d

# Kiểm tra services
docker-compose ps

# Xem logs
docker-compose logs -f
```

### 3. Chạy Development Local

```bash
# Cài đặt dependencies
npm install
cd backend/services && npm install
cd ../../frontend && npm install

# Chạy tất cả (Backend + Frontend)
npm run dev

# Hoặc chạy riêng
npm run dev:be:micro  # Backend services
npm run dev:fe        # Frontend only
```

### 4. Khởi Tạo Database

```bash
# Chạy script init database
docker-compose exec app sh init-db.sh

# Hoặc seed admin user
docker-compose exec app npm run seed:admin
```

## 🌐 Truy Cập Ứng Dụng

Sau khi chạy thành công:

- **Frontend**: http://localhost:5173
- **API Gateway**: http://localhost:4000
- **Database**: localhost:5432 (user: postgres, password: 1234)

## 🏗️ Cấu Trúc Dự Án

```
aesp/
├── frontend/              # React + Vite frontend
├── backend/
│   ├── services/          # Microservices
│   │   ├── api-gateway/   # API Gateway (port 4000)
│   │   ├── user-service/  # User management (4005)
│   │   ├── package-service/ # Learning packages (4003)
│   │   ├── purchase-service/ # Purchases (4004)
│   │   ├── mentor-service/ # Mentors (4006)
│   │   ├── learner-service/ # Learners (4007)
│   │   ├── admin-service/  # Admin panel (4008)
│   │   ├── ai-service/     # AI features (4010)
│   │   ├── file-service/   # File uploads (4011)
│   │   ├── notification-service/ # Notifications (4001)
│   │   └── community-service/ # Community (4002)
│   └── ai_models/         # AI training scripts
├── docs/                  # Documentation
├── infra/                 # Infrastructure configs
└── docker-compose.yml     # Docker orchestration
```

## 📚 API Documentation

- **API Spec**: [docs/api-spec.md](docs/api-spec.md)
- **Product Brief**: [docs/product-brief.md](docs/product-brief.md)
- **Microservices Architecture**: [docs/MICROSERVICES_ARCHITECTURE.md](docs/MICROSERVICES_ARCHITECTURE.md)

## 🔧 Troubleshooting

### Lỗi thường gặp:

1. **Port đã được sử dụng**
   ```bash
   # Kill processes using ports
   npm run fix:all
   ```

2. **Database connection failed**
   - Đảm bảo PostgreSQL container đang chạy
   - Kiểm tra logs: `docker-compose logs db`

3. **Services không start**
   - Kiểm tra logs: `docker-compose logs app`
   - Đảm bảo file .env.docker tồn tại

4. **Frontend không load**
   - Xóa node_modules và cài lại: `rm -rf node_modules && npm install`

### Commands hữu ích:

```bash
# Restart services
docker-compose restart

# Rebuild và restart
docker-compose up --build --force-recreate

# Clean up
docker-compose down -v
docker system prune -f

# Check container health
docker-compose exec app curl http://localhost:4000/health
```

## 📝 Development Scripts

```bash
# Development
npm run dev              # All services
npm run dev:be:micro     # Backend only
npm run dev:fe           # Frontend only

# Production build
npm run build

# Fix issues
npm run fix:all

# Database
npm run seed:admin       # Seed admin user
```

## 🤝 Đóng Góp

1. Fork repository
2. Tạo feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push: `git push origin feature/new-feature`
5. Tạo Pull Request

## 📄 License

This project is licensed under the MIT License.
