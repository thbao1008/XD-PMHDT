# 🔧 Fix hoàn chỉnh: Docker + Database + API Gateway

## ❌ Vấn đề phát hiện

### 1. Database container đã dừng
```
aesp-db-1    Exited (255) 2 minutes ago
```
**Nguyên nhân**: Database container đã stop, nên services không tìm thấy hostname `db`

### 2. API Gateway không load `.env.docker`
- API Gateway chỉ dùng `import "dotenv/config"` (load `.env` mặc định)
- Không load `.env.docker` khi `DOCKER=true`
- Kết quả: Service URLs vẫn dùng service names thay vì localhost

### 3. Services không tìm thấy database
- Lỗi: `getaddrinfo ENOTFOUND db`
- Nguyên nhân: Database container không chạy

## ✅ Đã sửa

### 1. Sửa API Gateway để load `.env.docker`
File: `backend/services/api-gateway/src/server.js`
- ✅ Thay `import "dotenv/config"` bằng logic load `.env.docker` khi `DOCKER=true`
- ✅ Load từ `backend/.env.docker` nếu có
- ✅ Fallback về default nếu không có

### 2. Start lại database
```bash
docker-compose up -d db
```

### 3. Đảm bảo `.env.docker` có service URLs đúng
- ✅ Tất cả service URLs dùng `localhost` (không dùng service names)
- ✅ `compose.yaml` đã set explicit service URLs

## 🚀 Workflow hoàn chỉnh

### Bước 1: Start database
```bash
docker-compose up -d db
```

### Bước 2: Đợi database healthy
```bash
docker-compose ps db
# Status phải là "healthy"
```

### Bước 3: Setup database (chỉ lần đầu)
```bash
docker-compose run --rm init-db
```

### Bước 4: Restart app để load env vars mới
```bash
docker-compose restart app
```

### Bước 5: Kiểm tra logs
```bash
docker-compose logs app | grep -i "gateway\|package\|connected"
```

## 🔍 Kiểm tra

### 1. Kiểm tra database đang chạy
```bash
docker-compose ps db
# Phải là "Up" và "healthy"
```

### 2. Kiểm tra API Gateway service URLs
```bash
docker-compose logs app | grep "API Gateway Service URLs"
```

Bạn sẽ thấy:
```
✅ API Gateway loaded .env.docker from: /app/backend/.env.docker
🔗 API Gateway Service URLs:
   package: http://localhost:4003  ✅
   ...
```

**KHÔNG còn**:
```
   package: http://package-service:4003  ❌
```

### 3. Kiểm tra DB connections
```bash
docker-compose logs app | grep "connected to PostgreSQL"
```

Bạn sẽ thấy:
```
✅ User Service connected to PostgreSQL
✅ Learner Service connected to PostgreSQL
✅ Package Service connected to PostgreSQL
...
```

**KHÔNG còn**:
```
❌ Package Service DB connection error: getaddrinfo ENOTFOUND db  ❌
```

## 📝 Lưu ý quan trọng

1. **Database phải chạy trước**: Luôn start database trước khi start app
2. **Network**: Database và app phải cùng network `aesp_network`
3. **Environment variables**: 
   - `DOCKER=true` phải được set
   - Service URLs phải dùng `localhost` (không phải service names)
   - `DB_HOST=db` (hostname trong Docker network)

## 🐛 Nếu vẫn lỗi

### Database không start
```bash
# Xem logs
docker-compose logs db

# Restart
docker-compose restart db

# Hoặc recreate
docker-compose up -d --force-recreate db
```

### Services vẫn không tìm thấy db
```bash
# Kiểm tra network
docker network inspect aesp_aesp_network

# Kiểm tra cả 2 containers trong network
docker network inspect aesp_aesp_network | grep -A 5 "Containers"
```

### API Gateway vẫn dùng service names
```bash
# Kiểm tra env vars trong container
docker exec -it aesp-app-1 sh -c "echo PACKAGE_SERVICE_URL=\$PACKAGE_SERVICE_URL"

# Phải là: PACKAGE_SERVICE_URL=http://localhost:4003
```

## ✅ Checklist

Trước khi start app:
- [ ] Database container đang chạy và healthy
- [ ] File `backend/.env.docker` tồn tại và có service URLs = localhost
- [ ] `compose.yaml` có set explicit service URLs
- [ ] `DOCKER=true` được set trong environment
- [ ] Cả app và db đều trong network `aesp_network`


