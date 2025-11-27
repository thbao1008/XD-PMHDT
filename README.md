
﻿# AESP (microservices scaffold)

Các file tạo sẵn: docker-compose.yml, Dockerfile mẫu, infra/nginx/frontend.conf, services/*/Dockerfile, services/auth/.env.example

Chạy local:
1. Cài Docker và Docker Compose.
2. Vào D:\aesp
3. Xây và chạy: docker-compose up --build -d
4. Sau đó: docker compose exec app npm run seed:admin
5. Kiểm tra: docker-compose ps ; docker-compose logs -f reverse-proxy
6. Tắt: docker compose down -v

Lưu ý:
- Tạo file .env riêng cho mỗi service từ .env.example và đặt giá trị thực tế.
- Mỗi service cần code trong services/<service>/src, file entry chạy server tại src/server.js

# XD-PMHDT

## 🚀 Quick Start

### Chạy Development (Khuyến nghị):

```bash
# Chạy tất cả (Backend + Frontend)
npm run dev

# Hoặc chạy riêng
npm run dev:be:micro  # Backend services only
npm run dev:fe        # Frontend only
```

### Xử lý lỗi:

```bash
# Fix tất cả lỗi thường gặp
npm run fix:all
```

## 📚 Tài Liệu

- **QUICK_START_GUIDE.md** - Hướng dẫn chi tiết cách chạy ứng dụng
- **TROUBLESHOOTING.md** - Hướng dẫn xử lý các lỗi thường gặp
- **docs/** - Tài liệu kỹ thuật chi tiết

## 🏗️ Cấu Trúc

- `frontend/` - React frontend với Vite
- `backend/services/` - Microservices backend
- `backend/ai_models/` - AI models và training scripts

## 📝 Scripts Chính

- `npm run dev` - Chạy tất cả (backend + frontend)
- `npm run dev:be:micro` - Chạy backend services
- `npm run dev:fe` - Chạy frontend
- `npm run fix:all` - Fix tất cả lỗi thường gặp
- `npm run build` - Build production

Xem **QUICK_START_GUIDE.md** để biết thêm chi tiết.
