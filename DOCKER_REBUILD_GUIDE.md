# 🐳 Hướng dẫn Dựng lại Docker cho AESP Project

Hướng dẫn này giúp bạn dựng lại Docker containers phù hợp với cấu trúc dự án AESP.

## 📋 Yêu cầu

- Docker và Docker Compose đã được cài đặt
- File `aesp.sql` có trong thư mục gốc (để import database)

## 🚀 Các bước dựng lại Docker

### Bước 1: Tạo file .env.docker

Tạo file `backend/.env.docker` từ template:

**Windows (PowerShell):**
```powershell
Copy-Item backend\.env.docker.example backend\.env.docker
```

**Linux/Mac:**
```bash
cp backend/.env.docker.example backend/.env.docker
```

Sau đó chỉnh sửa file `.env.docker` và điền các giá trị thực tế:
- `OPENROUTER_API_KEY`: API key từ OpenRouter (nếu dùng AI Service)
- `JWT_SECRET`: Secret key cho JWT authentication

### Bước 2: Dựng lại Docker

#### Cách 1: Sử dụng script (Khuyến nghị)

**Windows:**
```powershell
.\rebuild-docker.ps1
```

**Linux/Mac:**
```bash
chmod +x rebuild-docker.sh
./rebuild-docker.sh
```

**Tùy chọn:**
- `--clean` hoặc `-Clean`: Xóa volumes và rebuild từ đầu (mất dữ liệu cũ)
- `--no-cache` hoặc `-NoCache`: Build không dùng cache

Ví dụ:
```powershell
.\rebuild-docker.ps1 -Clean -NoCache
```

#### Cách 2: Dùng lệnh Docker Compose thủ công

```bash
# Dừng và xóa containers
docker-compose down

# Xóa volumes (nếu muốn rebuild từ đầu)
docker-compose down -v

# Rebuild images
docker-compose build

# Hoặc rebuild không dùng cache
docker-compose build --no-cache

# Khởi động containers
docker-compose up -d
```

### Bước 3: Kiểm tra trạng thái

```bash
# Xem trạng thái containers
docker-compose ps

# Xem logs
docker-compose logs -f app

# Kiểm tra database
docker-compose exec db psql -U postgres -d aesp -c "\dt"
```

## 📦 Cấu trúc Docker

### Services

| Service | Port | Mô tả |
|---------|------|-------|
| app | 4000-4011, 5173 | Container chính chạy tất cả services |
| db | 5432 | PostgreSQL database |
| init-db | - | Service để khởi tạo database (profile: setup) |
| seed | - | Service để seed dữ liệu admin (profile: setup) |

### Ports được expose

- **4000**: API Gateway
- **4001**: Notification Service
- **4002**: Community Service
- **4003**: Package Service
- **4004**: Purchase Service
- **4005**: User Service
- **4006**: Mentor Service
- **4007**: Learner Service
- **4008**: Admin Service
- **4010**: AI Service
- **4011**: File Service
- **5173**: Frontend (Vite)
- **5432**: PostgreSQL

## 🔧 Các lệnh hữu ích

### Xem logs
```bash
# Tất cả services
docker-compose logs -f

# Chỉ app service
docker-compose logs -f app

# Chỉ database
docker-compose logs -f db
```

### Truy cập container
```bash
# Vào container app
docker-compose exec app sh

# Vào database
docker-compose exec db psql -U postgres -d aesp
```

### Khởi tạo database (lần đầu)
```bash
# Setup database schema
docker-compose run --rm init-db

# Seed admin users
docker-compose run --rm seed
```

### Import SQL file
```bash
# Windows
.\import-aesp-sql.ps1

# Linux/Mac
./import-aesp-sql.sh
```

### Dừng và xóa
```bash
# Dừng containers
docker-compose stop

# Dừng và xóa containers
docker-compose down

# Dừng, xóa containers và volumes (⚠️ mất dữ liệu)
docker-compose down -v
```

## 🐛 Troubleshooting

### Lỗi: Port đã được sử dụng

```bash
# Kiểm tra port nào đang được dùng
# Windows
netstat -ano | findstr :4000

# Linux/Mac
lsof -i :4000
```

Giải pháp: Thay đổi port trong `compose.yaml` hoặc dừng process đang dùng port đó.

### Lỗi: Build failed

1. Kiểm tra Dockerfile có đúng không
2. Kiểm tra network connection (để download dependencies)
3. Thử build với `--no-cache`:
   ```bash
   docker-compose build --no-cache
   ```

### Lỗi: Database connection failed

1. Kiểm tra database container đang chạy:
   ```bash
   docker-compose ps db
   ```

2. Kiểm tra health check:
   ```bash
   docker-compose exec db pg_isready -U postgres
   ```

3. Kiểm tra file `.env.docker` có đúng cấu hình không

### Lỗi: Services không start

1. Xem logs để biết lỗi cụ thể:
   ```bash
   docker-compose logs app
   ```

2. Kiểm tra dependencies đã được cài đặt:
   ```bash
   docker-compose exec app ls -la /app/node_modules
   ```

3. Thử rebuild lại:
   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

### Lỗi: File .env.docker not found

Tạo file từ template:
```bash
cp backend/.env.docker.example backend/.env.docker
```

Sau đó chỉnh sửa các giá trị cần thiết.

## 📝 Ghi chú

- File `aesp.sql` sẽ tự động được import khi database container khởi động lần đầu
- Nếu database đã tồn tại, dùng script `import-aesp-sql.ps1` hoặc `import-aesp-sql.sh` để import lại
- Tất cả services chạy trong cùng một container, giao tiếp qua `localhost`
- Volumes được mount để giữ lại `node_modules` và tránh phải cài lại mỗi lần restart

## 🔗 Liên kết

- [IMPORT_SQL_GUIDE.md](./IMPORT_SQL_GUIDE.md) - Hướng dẫn import SQL
- [DOCKER_GUIDE.md](./DOCKER_GUIDE.md) - Hướng dẫn Docker tổng quát
- [DOCKER_DB_FIX.md](./DOCKER_DB_FIX.md) - Sửa lỗi database trong Docker




