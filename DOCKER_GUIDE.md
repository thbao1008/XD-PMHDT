
## 🚀 Cách sử dụng Docker

### 1. Start tất cả services (compose.yaml)

```bash
# Start tất cả services (app, seed, db)
docker-compose up -d

# Xem logs
docker-compose logs -f

# Stop tất cả
docker-compose down
```

### 2. Start chỉ database

```bash
# Start chỉ database
docker-compose up -d db

# Kiểm tra database
docker-compose ps db
```

### 3. Start microservices (backend/services/docker-compose.yml)

```bash
cd backend/services
docker-compose up -d

# Xem logs
docker-compose logs -f
```

### 4. Các lệnh Docker hữu ích

```bash
# Xem tất cả containers
docker ps -a

# Xem logs của container
docker logs <container-name> -f

# Xem logs của container (last 50 lines)
docker logs <container-name> --tail 50

# Restart container
docker restart <container-name>

# Stop container
docker stop <container-name>

# Start container
docker start <container-name>

# Xóa container
docker rm <container-name>

# Xóa image
docker rmi <image-name>

# Xem resource usage
docker stats

# Xem chi tiết container
docker inspect <container-name>
```

## ⚠️ Vấn đề hiện tại

### Container `aesp-seed-1` bị lỗi

**Lỗi**: `Cannot find package 'bcryptjs'`

**Nguyên nhân**: Package `bcryptjs`, `pg`, `dotenv` chưa được cài đặt trong container

**✅ Đã fix**: Đã thêm các dependencies vào `package.json`:
- `bcryptjs`: ^2.4.3
- `pg`: ^8.11.3  
- `dotenv`: ^16.4.5

**Giải pháp**:

1. **Option 1: Rebuild image (Khuyến nghị)**
```bash
# Rebuild image với dependencies mới
docker-compose build

# Xóa containers cũ
docker-compose down

# Start lại tất cả
docker-compose up -d

# Chạy seed lại
docker-compose up seed
```

2. **Option 2: Cài đặt dependencies trong container hiện tại**
```bash
# Vào container app
docker exec -it aesp-app-1 sh

# Cài đặt dependencies
npm install bcryptjs pg dotenv

# Hoặc cài đặt tất cả từ package.json
npm install

# Exit container
exit

# Chạy seed lại
docker-compose up seed
```

3. **Option 3: Cài đặt local và rebuild**
```bash
# Cài đặt dependencies local trước
npm install

# Rebuild image
docker-compose build --no-cache

# Start lại
docker-compose up -d
```

### Container `aesp-app-1` chưa start

**Trạng thái**: Created (chưa start)

**Giải pháp**:
```bash
# Start container
docker start aesp-app-1

# Hoặc dùng docker-compose
docker-compose up -d app
```

## 📋 Workflow đề xuất

### Development

```bash
# 1. Start database
docker-compose up -d db

# 2. Chờ database healthy (khoảng 10-15 giây)
docker-compose ps db

# 3. Seed data (nếu cần)
docker-compose up seed

# 4. Start app
docker-compose up -d app

# 5. Xem logs
docker-compose logs -f app
```

### Production

```bash
# Build và start tất cả
docker-compose up -d --build

# Kiểm tra status
docker-compose ps

# Xem logs
docker-compose logs -f
```

## 🔧 Troubleshooting

### Container không start

```bash
# Xem logs để biết lỗi
docker logs <container-name>

# Kiểm tra resource
docker stats

# Kiểm tra network
docker network ls
```

### Port đã được sử dụng

```bash
# Tìm process đang dùng port
netstat -ano | findstr :5432  # Windows
lsof -i :5432                 # Linux/Mac

# Kill process
taskkill /PID <pid> /F        # Windows
kill -9 <pid>                 # Linux/Mac
```

### Database connection error

```bash
# Kiểm tra database đang chạy
docker-compose ps db

# Kiểm tra health check
docker inspect aesp-db-1 | grep -A 10 Health

# Restart database
docker-compose restart db
```

### Clean up

```bash
# Xóa tất cả containers đã stop
docker container prune

# Xóa tất cả images không dùng
docker image prune -a

# Xóa tất cả (containers, images, volumes, networks)
docker system prune -a --volumes
```

## 📝 Notes

- **Container `seed`** chỉ chạy 1 lần, sau đó exit - đây là hành vi bình thường
- **Container `app`** cần được start thủ công hoặc dùng `docker-compose up`
- **Database** nên start trước và đợi healthy trước khi start các services khác
- Sử dụng `docker-compose` thay vì `docker` commands để quản lý dễ hơn

