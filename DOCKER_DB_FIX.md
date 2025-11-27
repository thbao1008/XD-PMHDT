# 🔧 Hướng dẫn khắc phục lỗi Database trong Docker

## ❌ Các vấn đề đã được phát hiện và sửa

### 1. **Thiếu file `.env.docker`**
- **Vấn đề**: `compose.yaml` tham chiếu `./backend/.env.docker` nhưng file này không tồn tại
- **Đã sửa**: ✅ File đã được tạo với đầy đủ cấu hình

### 2. **Biến môi trường `DOCKER=true` chưa được set**
- **Vấn đề**: Các service cần `DOCKER=true` để sử dụng hostname `db` thay vì `localhost`
- **Đã sửa**: ✅ Đã thêm `DOCKER=true` vào tất cả services trong `compose.yaml`

### 3. **Biến môi trường DB chưa được truyền đúng**
- **Vấn đề**: Các biến `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` có thể không được load đúng
- **Đã sửa**: ✅ Đã thêm explicit environment variables vào tất cả services

### 4. **Network configuration chưa rõ ràng**
- **Vấn đề**: Services có thể không giao tiếp được với nhau
- **Đã sửa**: ✅ Đã tạo network `aesp_network` và gán cho tất cả services

### 5. **Healthcheck timeout quá ngắn**
- **Vấn đề**: Database chưa kịp start nhưng healthcheck đã fail
- **Đã sửa**: ✅ Đã thêm `start_period: 10s` để cho DB thời gian khởi động

## 📋 Cấu hình hiện tại

### File `.env.docker` (backend/.env.docker)
```env
DOCKER=true
DB_HOST=db
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=1234
DB_NAME=aesp
NODE_ENV=development
```

### Database Service
- **Image**: `postgres:15`
- **Hostname trong Docker**: `db`
- **Port**: `5432`
- **Database**: `aesp`
- **User**: `postgres`
- **Password**: `1234`

## 🚀 Các bước chạy lại Docker

### 1. Dừng và xóa containers cũ
```bash
docker-compose down
```

### 2. Xóa volumes cũ (nếu cần reset database)
```bash
docker-compose down -v
```

### 3. Rebuild images
```bash
docker-compose build --no-cache
```

### 4. Start database trước
```bash
docker-compose up -d db
```

### 5. Đợi database healthy (khoảng 10-15 giây)
```bash
docker-compose ps db
# Kiểm tra status phải là "healthy"
```

### 6. Setup database (chạy migrations)
```bash
docker-compose run --rm init-db
```

### 7. Seed admin data (nếu cần)
```bash
docker-compose run --rm seed
```

### 8. Start tất cả services
```bash
docker-compose up -d
```

### 9. Xem logs để kiểm tra
```bash
# Xem logs của app
docker-compose logs -f app

# Xem logs của database
docker-compose logs -f db

# Xem logs của tất cả
docker-compose logs -f
```

## 🔍 Kiểm tra kết nối Database

### 1. Kiểm tra database container đang chạy
```bash
docker-compose ps db
```

### 2. Kiểm tra network
```bash
docker network inspect aesp_aesp_network
```

### 3. Test kết nối từ container app
```bash
docker exec -it aesp-app-1 sh
# Trong container:
psql -h db -U postgres -d aesp
# Password: 1234
```

### 4. Kiểm tra logs để tìm lỗi
```bash
# Xem logs của app service
docker-compose logs app | grep -i "error\|connection\|database"

# Xem logs của database
docker-compose logs db | grep -i "error\|fatal"
```

## 🐛 Các lỗi thường gặp và cách khắc phục

### Lỗi: "Connection refused" hoặc "ECONNREFUSED"
**Nguyên nhân**: 
- Database chưa start hoặc chưa healthy
- Hostname không đúng (phải dùng `db` không phải `localhost`)

**Giải pháp**:
```bash
# Kiểm tra database đang chạy
docker-compose ps db

# Restart database
docker-compose restart db

# Đợi healthy
docker-compose ps db
```

### Lỗi: "password authentication failed"
**Nguyên nhân**: 
- Password không đúng
- User không đúng

**Giải pháp**:
- Kiểm tra file `.env.docker` có đúng password không
- Kiểm tra `compose.yaml` có đúng `POSTGRES_PASSWORD` không

### Lỗi: "database does not exist"
**Nguyên nhân**: 
- Database chưa được tạo
- Chưa chạy migrations

**Giải pháp**:
```bash
# Chạy setup database
docker-compose run --rm init-db
```

### Lỗi: "Service không tìm thấy hostname 'db'"
**Nguyên nhân**: 
- Services không cùng network
- `DOCKER=true` chưa được set

**Giải pháp**:
- Kiểm tra tất cả services đều có `networks: - aesp_network`
- Kiểm tra `DOCKER=true` đã được set

### Lỗi: "Health check failed"
**Nguyên nhân**: 
- Database chưa kịp start
- Healthcheck timeout quá ngắn

**Giải pháp**:
- Đợi thêm thời gian (đã set `start_period: 10s`)
- Kiểm tra logs: `docker-compose logs db`

## 📝 Checklist trước khi chạy

- [ ] File `backend/.env.docker` tồn tại và có đầy đủ biến môi trường
- [ ] File `compose.yaml` đã được cập nhật với network và environment variables
- [ ] Port 5432 chưa bị sử dụng bởi PostgreSQL local
- [ ] Docker daemon đang chạy
- [ ] Đã rebuild images sau khi thay đổi cấu hình

## 🔄 Workflow đề xuất

### Development
```bash
# 1. Start database
docker-compose up -d db

# 2. Đợi healthy (10-15 giây)
docker-compose ps db

# 3. Setup database (chỉ lần đầu hoặc khi cần reset)
docker-compose run --rm init-db

# 4. Seed data (nếu cần)
docker-compose run --rm seed

# 5. Start app
docker-compose up -d app

# 6. Xem logs
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

## 🧪 Test kết nối

### Test từ host machine
```bash
# Kết nối trực tiếp (nếu có psql)
psql -h localhost -p 5432 -U postgres -d aesp
# Password: 1234
```

### Test từ container
```bash
# Vào container app
docker exec -it aesp-app-1 sh

# Test kết nối
node -e "import('pg').then(({Pool})=>{const p=new Pool({host:'db',user:'postgres',password:'1234',database:'aesp'});p.query('SELECT NOW()').then(r=>{console.log('✅ Connected:',r.rows[0]);p.end()}).catch(e=>console.error('❌ Error:',e.message))})"
```

## 📞 Nếu vẫn còn lỗi

1. **Xem logs chi tiết**:
   ```bash
   docker-compose logs --tail=100 app
   docker-compose logs --tail=100 db
   ```

2. **Kiểm tra network**:
   ```bash
   docker network ls
   docker network inspect aesp_aesp_network
   ```

3. **Kiểm tra containers đang chạy**:
   ```bash
   docker ps -a
   ```

4. **Restart tất cả**:
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

5. **Reset hoàn toàn** (cẩn thận - sẽ mất data):
   ```bash
   docker-compose down -v
   docker-compose up -d --build
   docker-compose run --rm init-db
   docker-compose run --rm seed
   ```

