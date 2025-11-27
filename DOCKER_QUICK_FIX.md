# ⚡ Quick Fix: Docker Database Connection Issues

## ✅ Đã sửa các vấn đề sau:

### 1. **File `.env.docker` thiếu `DOCKER=true`**
   - ✅ Đã thêm `DOCKER=true` vào file `backend/.env.docker`
   - File này bây giờ có đầy đủ: `DOCKER=true`, `DB_HOST=db`, `DB_USER=postgres`, etc.

### 2. **`compose.yaml` thiếu environment variables**
   - ✅ Đã thêm explicit `environment` section vào tất cả services
   - ✅ Đã thêm `DOCKER=true` và các biến DB vào `app`, `init-db`, `seed`

### 3. **Network configuration**
   - ✅ Đã tạo network `aesp_network` 
   - ✅ Tất cả services đều được gán vào network này
   - ✅ Database có hostname `db` trong network

### 4. **Healthcheck timeout**
   - ✅ Đã thêm `start_period: 10s` để database có thời gian khởi động

## 🚀 Cách chạy lại:

```bash
# 1. Dừng containers cũ
docker-compose down

# 2. Rebuild (nếu cần)
docker-compose build

# 3. Start database
docker-compose up -d db

# 4. Đợi database healthy (10-15 giây)
docker-compose ps db

# 5. Setup database (chỉ lần đầu)
docker-compose run --rm init-db

# 6. Seed admin (nếu cần)
docker-compose run --rm seed

# 7. Start app
docker-compose up -d app

# 8. Xem logs
docker-compose logs -f app
```

## 🔍 Kiểm tra nhanh:

```bash
# Kiểm tra database đang chạy
docker-compose ps db

# Kiểm tra network
docker network ls | grep aesp

# Test kết nối từ container
docker exec -it aesp-app-1 sh
# Trong container: psql -h db -U postgres -d aesp
```

## 📋 Cấu hình Database:

- **Hostname trong Docker**: `db` (không phải `localhost`)
- **Port**: `5432`
- **Database**: `aesp`
- **User**: `postgres`
- **Password**: `1234`

## ⚠️ Lưu ý quan trọng:

1. **Trong Docker, luôn dùng `db` làm hostname**, không dùng `localhost`
2. **Biến `DOCKER=true` phải được set** để services biết đang chạy trong Docker
3. **Tất cả services phải cùng network** (`aesp_network`)
4. **Database phải healthy trước** khi start các services khác

## 🐛 Nếu vẫn lỗi:

1. Xem logs: `docker-compose logs app | grep -i error`
2. Kiểm tra network: `docker network inspect aesp_aesp_network`
3. Restart: `docker-compose restart db`
4. Reset hoàn toàn: `docker-compose down -v && docker-compose up -d --build`

Xem file `DOCKER_DB_FIX.md` để biết chi tiết hơn.

