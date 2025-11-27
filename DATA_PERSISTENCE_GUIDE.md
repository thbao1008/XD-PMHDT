# 💾 Hướng dẫn Data Persistence trong Docker

Hướng dẫn đảm bảo dữ liệu không mất khi restart container Docker.

## ✅ Dữ liệu ĐÃ được lưu bền vững (Persistent)

Trong cấu hình hiện tại, dữ liệu **ĐÃ được lưu trong Docker volume** và sẽ **KHÔNG mất** khi:

- ✅ Container được restart: `docker-compose restart`
- ✅ Container được stop/start: `docker-compose stop` → `docker-compose start`
- ✅ Docker được restart
- ✅ Máy tính được restart (nếu Docker tự động start)

## 📦 Cấu hình Volume hiện tại

Trong `compose.yaml`:

```yaml
db:
  volumes:
    - db_data:/var/lib/postgresql/data  # ← Dữ liệu lưu ở đây

volumes:
  db_data:  # ← Volume được tạo tự động
```

**Volume name:** `aesp_db_data` (hoặc `aesp-db_data`)

**Vị trí lưu trên host:** 
- Windows: `\\wsl$\docker-desktop-data\data\docker\volumes\aesp_db_data\_data`
- Linux/Mac: `/var/lib/docker/volumes/aesp_db_data/_data`

## 🔄 Khi nào cần import lại dữ liệu?

### ❌ KHÔNG cần import lại khi:

1. **Restart container:**
   ```bash
   docker-compose restart db
   # Hoặc
   docker-compose stop
   docker-compose start
   ```
   → Dữ liệu vẫn còn nguyên

2. **Rebuild và restart:**
   ```bash
   docker-compose down      # ← KHÔNG dùng -v
   docker-compose up -d
   ```
   → Dữ liệu vẫn còn nguyên

3. **Update code và restart:**
   ```bash
   docker-compose restart app
   ```
   → Dữ liệu vẫn còn nguyên

### ⚠️ CẦN import lại khi:

1. **Xóa volume (mất dữ liệu):**
   ```bash
   docker-compose down -v    # ← DANGER: Xóa volumes
   # Hoặc
   docker volume rm aesp_db_data
   ```
   → Dữ liệu bị mất, cần import lại

2. **Tạo database mới từ đầu:**
   ```bash
   # Xóa volume và tạo lại
   docker-compose down -v
   docker-compose up -d db
   ```
   → Cần import lại dữ liệu

3. **Reset database (xóa dữ liệu cũ):**
   ```bash
   docker exec -it aesp-db-1 psql -U postgres -d aesp -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
   ```
   → Cần import lại dữ liệu

## 🔍 Kiểm tra Data Persistence

### Cách 1: Dùng script (Khuyến nghị)

```powershell
.\verify-data-persistence.ps1
```

Script sẽ kiểm tra:
- Volume có tồn tại không
- Volume có được mount đúng không
- Dữ liệu có trong database không
- Cấu hình compose.yaml có đúng không

### Cách 2: Kiểm tra thủ công

```bash
# 1. Kiểm tra volume tồn tại
docker volume ls | grep aesp

# 2. Kiểm tra volume được mount
docker inspect aesp-db-1 | grep -A 10 Mounts

# 3. Kiểm tra dữ liệu trong database
docker exec aesp-db-1 psql -U postgres -d aesp -c "\dt"
```

## 🛡️ Đảm bảo dữ liệu không mất

### 1. Luôn dùng `docker-compose down` (KHÔNG dùng `-v`)

```bash
# ✅ ĐÚNG - Giữ lại dữ liệu
docker-compose down

# ❌ SAI - Xóa dữ liệu
docker-compose down -v
docker-compose down --volumes
```

### 2. Backup định kỳ

```powershell
# Backup hàng ngày
.\dump-db-from-docker.ps1 -OutputFile "backups\aesp_$(Get-Date -Format 'yyyyMMdd').sql"
```

### 3. Kiểm tra trước khi xóa

```bash
# Xem danh sách volumes
docker volume ls

# Xem thông tin volume
docker volume inspect aesp_db_data

# Chỉ xóa khi chắc chắn
docker volume rm aesp_db_data
```

## 🔄 Workflow an toàn

### Khi restart container:

```bash
# 1. Dừng containers (giữ volumes)
docker-compose down

# 2. Khởi động lại
docker-compose up -d

# 3. Kiểm tra dữ liệu vẫn còn
docker exec aesp-db-1 psql -U postgres -d aesp -c "\dt"
```

### Khi rebuild image:

```bash
# 1. Dừng containers (giữ volumes)
docker-compose down

# 2. Rebuild images
docker-compose build

# 3. Khởi động lại
docker-compose up -d

# Dữ liệu vẫn còn nguyên
```

### Khi cần reset hoàn toàn:

```bash
# 1. Backup trước
.\dump-db-from-docker.ps1 -OutputFile "backup_before_reset.sql"

# 2. Xóa volumes (mất dữ liệu)
docker-compose down -v

# 3. Tạo lại
docker-compose up -d

# 4. Import lại dữ liệu
.\import-aesp-sql.ps1 -InputFile "backup_before_reset.sql"
```

## 📝 Lưu ý quan trọng

### 1. Volume vs Bind Mount

- **Volume** (hiện tại): Dữ liệu lưu trong Docker volume, bền vững
- **Bind mount**: Dữ liệu lưu trực tiếp trên host, có thể bị xóa

Cấu hình hiện tại dùng **Volume** → An toàn ✅

### 2. File aesp.sql chỉ import lần đầu

File `aesp.sql` được mount vào `/docker-entrypoint-initdb.d/` chỉ chạy khi:
- Database được khởi tạo lần đầu
- Volume `db_data` chưa tồn tại

Nếu volume đã tồn tại, file này **KHÔNG** được import tự động.

### 3. Đồng bộ với pgAdmin

Dữ liệu trong Docker và pgAdmin là **độc lập**:
- Thay đổi trong Docker → Không tự động sync với pgAdmin
- Thay đổi trong pgAdmin → Không tự động sync với Docker

Cần dump/import thủ công để đồng bộ.

## 🚨 Troubleshooting

### Vấn đề: Dữ liệu mất sau khi restart

**Nguyên nhân:**
- Volume không được mount đúng
- Volume bị xóa

**Giải pháp:**
1. Kiểm tra volume: `docker volume ls`
2. Kiểm tra mount: `docker inspect aesp-db-1 | grep Mounts`
3. Kiểm tra compose.yaml có cấu hình volume đúng không

### Vấn đề: Cần import lại mỗi lần restart

**Nguyên nhân:**
- Volume không được cấu hình
- Dùng bind mount thay vì volume

**Giải pháp:**
1. Kiểm tra `compose.yaml` có `db_data:/var/lib/postgresql/data`
2. Kiểm tra có section `volumes:` với `db_data:`
3. Restart: `docker-compose down && docker-compose up -d`

### Vấn đề: Không biết dữ liệu có mất không

**Giải pháp:**
```powershell
# Chạy script kiểm tra
.\verify-data-persistence.ps1

# Hoặc kiểm tra thủ công
docker exec aesp-db-1 psql -U postgres -d aesp -c "SELECT COUNT(*) FROM information_schema.tables;"
```

## 📚 Tóm tắt

| Hành động | Dữ liệu có mất? | Cần import lại? |
|-----------|----------------|-----------------|
| `docker-compose restart` | ❌ Không | ❌ Không |
| `docker-compose stop/start` | ❌ Không | ❌ Không |
| `docker-compose down` (không -v) | ❌ Không | ❌ Không |
| `docker-compose down -v` | ✅ Có | ✅ Có |
| `docker volume rm aesp_db_data` | ✅ Có | ✅ Có |
| Rebuild image | ❌ Không | ❌ Không |
| Restart máy tính | ❌ Không | ❌ Không |

## 🔗 Liên kết

- [PGADMIN_DOCKER_GUIDE.md](./PGADMIN_DOCKER_GUIDE.md) - Hướng dẫn sync với pgAdmin
- [IMPORT_SQL_GUIDE.md](./IMPORT_SQL_GUIDE.md) - Hướng dẫn import SQL
- [DOCKER_REBUILD_GUIDE.md](./DOCKER_REBUILD_GUIDE.md) - Hướng dẫn rebuild Docker









