# 🔄 Hướng dẫn Dump/Import dữ liệu giữa pgAdmin và Docker

Hướng dẫn chi tiết để đồng bộ dữ liệu giữa pgAdmin và PostgreSQL container trong Docker.

## 📋 Mục lục

1. [Dump từ Docker ra file SQL](#1-dump-từ-docker-ra-file-sql)
2. [Import từ file SQL vào Docker](#2-import-từ-file-sql-vào-docker)
3. [Dump từ pgAdmin ra file SQL](#3-dump-từ-pgadmin-ra-file-sql)
4. [Import từ file SQL vào pgAdmin](#4-import-từ-file-sql-vào-pgadmin)
5. [Kết nối pgAdmin với Docker](#5-kết-nối-pgadmin-với-docker)
6. [Troubleshooting](#troubleshooting)

---

## 1. Dump từ Docker ra file SQL

### Cách 1: Sử dụng script (Khuyến nghị)

**Windows:**
```powershell
# Dump ra file SQL plain text
.\dump-db-from-docker.ps1

# Dump ra file backup (custom format, nén)
.\dump-db-from-docker.ps1 -Format custom

# Chỉ định tên file output
.\dump-db-from-docker.ps1 -OutputFile "my_backup.sql"
```

**Linux/Mac:**
```bash
chmod +x dump-db-from-docker.sh

# Dump ra file SQL plain text
./dump-db-from-docker.sh

# Dump ra file backup (custom format)
./dump-db-from-docker.sh "my_backup.sql" "custom"
```

### Cách 2: Dùng lệnh Docker trực tiếp

```bash
# Tìm tên container
docker ps | grep postgres

# Dump ra file SQL plain text
docker exec -t aesp-db-1 pg_dump -U postgres aesp > aesp_dump.sql

# Dump ra file backup (custom format, nén)
docker exec -t aesp-db-1 pg_dump -U postgres -Fc aesp > aesp_dump.backup
```

**Thông tin kết nối:**
- Container name: `aesp-db-1` (hoặc tên từ `docker-compose ps`)
- User: `postgres`
- Database: `aesp`
- Password: `1234`

---

## 2. Import từ file SQL vào Docker

### Cách 1: Sử dụng script (Khuyến nghị)

**Windows:**
```powershell
.\import-aesp-sql.ps1
```

**Linux/Mac:**
```bash
./import-aesp-sql.sh
```

### Cách 2: Dùng lệnh Docker trực tiếp

```bash
# Copy file vào container
docker cp aesp.sql aesp-db-1:/tmp/aesp.sql

# Import vào database
docker exec -i aesp-db-1 psql -U postgres -d aesp -f /tmp/aesp.sql

# Xóa file tạm
docker exec aesp-db-1 rm /tmp/aesp.sql
```

### Cách 3: Import file backup (custom format)

```bash
# Copy file backup vào container
docker cp aesp_dump.backup aesp-db-1:/tmp/aesp_dump.backup

# Restore từ backup
docker exec -i aesp-db-1 pg_restore -U postgres -d aesp -c /tmp/aesp_dump.backup

# Xóa file tạm
docker exec aesp-db-1 rm /tmp/aesp_dump.backup
```

**Lưu ý:** 
- Option `-c` trong `pg_restore` sẽ xóa dữ liệu cũ trước khi restore
- Bỏ `-c` nếu muốn giữ dữ liệu cũ và thêm vào

---

## 3. Dump từ pgAdmin ra file SQL

### Bước 1: Kết nối với database trong Docker

Xem phần [Kết nối pgAdmin với Docker](#5-kết-nối-pgadmin-với-docker) để kết nối.

### Bước 2: Dump database

1. Trong pgAdmin, mở rộng **Servers** → **AESP Docker** → **Databases**
2. Chuột phải vào database **aesp** → **Backup...**
3. Trong tab **General:**
   - **Filename:** Chọn đường dẫn và tên file (ví dụ: `C:\backups\aesp_backup.sql`)
   - **Format:** 
     - **Plain** → File `.sql` (dễ đọc, dùng cho psql)
     - **Custom** → File `.backup` (nén, dùng cho pg_restore)
     - **Tar** → File `.tar` (nén, dùng cho pg_restore)
4. Trong tab **Options:**
   - Tích **Clean before restore** (nếu muốn xóa dữ liệu cũ)
   - Tích **Create database** (nếu muốn tạo database mới)
5. Click **Backup**
6. Đợi quá trình backup hoàn tất

---

## 4. Import từ file SQL vào pgAdmin

### Bước 1: Chuẩn bị file

Đảm bảo bạn có file dump từ Docker hoặc từ nguồn khác.

### Bước 2: Restore trong pgAdmin

1. Trong pgAdmin, mở rộng **Servers** → **AESP Docker** → **Databases**
2. Chuột phải vào database **aesp** → **Restore...**
3. Trong tab **General:**
   - **Filename:** Chọn file backup (`.sql`, `.backup`, hoặc `.tar`)
   - **Format:** Chọn đúng format:
     - **Plain** → cho file `.sql`
     - **Custom** → cho file `.backup`
     - **Tar** → cho file `.tar`
4. Trong tab **Options:**
   - Tích **Clean before restore** (nếu muốn xóa dữ liệu cũ)
   - Tích **Create database** (nếu database chưa tồn tại)
5. Click **Restore**
6. Đợi quá trình restore hoàn tất

---

## 5. Kết nối pgAdmin với Docker

### Thông tin kết nối

- **Host name/address:** `localhost` (hoặc `127.0.0.1`)
- **Port:** `5432`
- **Maintenance database:** `aesp`
- **Username:** `postgres`
- **Password:** `1234`

### Các bước kết nối

1. **Mở pgAdmin**

2. **Tạo Server mới:**
   - Chuột phải vào **Servers** → **Create** → **Server...**

3. **Tab General:**
   - **Name:** `AESP Docker` (hoặc tên bạn muốn)

4. **Tab Connection:**
   - **Host name/address:** `localhost`
   - **Port:** `5432`
   - **Maintenance database:** `aesp`
   - **Username:** `postgres`
   - **Password:** `1234`
   - ✅ Tích **Save password** (nếu muốn lưu password)

5. **Tab Advanced (tùy chọn):**
   - **DB restriction:** Để trống hoặc nhập `aesp` để chỉ hiển thị database này

6. Click **Save**

### Kiểm tra kết nối

Sau khi lưu, pgAdmin sẽ tự động kết nối. Nếu thành công, bạn sẽ thấy:
- Database **aesp** trong danh sách
- Các schema và tables

Nếu lỗi, xem phần [Troubleshooting](#troubleshooting).

---

## 🔧 Troubleshooting

### Lỗi: "could not connect to server"

**Nguyên nhân:**
- Container PostgreSQL chưa chạy
- Port 5432 chưa được expose
- Firewall chặn kết nối

**Giải pháp:**

1. **Kiểm tra container đang chạy:**
   ```bash
   docker-compose ps
   ```
   Container `aesp-db-1` phải có status là `Up` và `healthy`

2. **Kiểm tra port đã được expose:**
   ```bash
   docker-compose ps db
   ```
   Phải thấy `0.0.0.0:5432->5432/tcp`

3. **Kiểm tra kết nối từ host:**
   ```bash
   # Windows
   Test-NetConnection -ComputerName localhost -Port 5432
   
   # Linux/Mac
   nc -zv localhost 5432
   ```

4. **Khởi động lại container nếu cần:**
   ```bash
   docker-compose restart db
   ```

### Lỗi: "password authentication failed"

**Nguyên nhân:**
- Password sai
- Username sai

**Giải pháp:**

1. Kiểm tra password trong `compose.yaml`:
   ```yaml
   POSTGRES_PASSWORD: 1234
   ```

2. Kiểm tra username:
   ```yaml
   POSTGRES_USER: postgres
   ```

3. Thử kết nối bằng command line:
   ```bash
   docker exec -it aesp-db-1 psql -U postgres -d aesp
   ```

### Lỗi: "database does not exist"

**Nguyên nhân:**
- Database chưa được tạo
- Tên database sai

**Giải pháp:**

1. Kiểm tra database trong `compose.yaml`:
   ```yaml
   POSTGRES_DB: aesp
   ```

2. Tạo database nếu chưa có:
   ```bash
   docker exec -it aesp-db-1 psql -U postgres -c "CREATE DATABASE aesp;"
   ```

3. Import dữ liệu:
   ```bash
   .\import-aesp-sql.ps1
   ```

### Lỗi khi dump: "permission denied"

**Nguyên nhân:**
- Không có quyền ghi file
- Đường dẫn không hợp lệ

**Giải pháp:**

1. Chạy script với quyền Administrator (Windows)
2. Kiểm tra quyền ghi trong thư mục hiện tại
3. Chỉ định đường dẫn đầy đủ cho file output

### Lỗi khi import: "relation already exists"

**Nguyên nhân:**
- Dữ liệu đã tồn tại trong database

**Giải pháp:**

1. **Xóa dữ liệu cũ trước khi import:**
   ```bash
   # Xóa tất cả tables
   docker exec -it aesp-db-1 psql -U postgres -d aesp -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
   
   # Sau đó import lại
   .\import-aesp-sql.ps1
   ```

2. **Hoặc dùng option `-c` trong pg_restore:**
   ```bash
   docker exec -i aesp-db-1 pg_restore -U postgres -d aesp -c /tmp/aesp_dump.backup
   ```

### Container không lưu dữ liệu sau khi restart

**Nguyên nhân:**
- Volume chưa được mount đúng
- Volume bị xóa

**Giải pháp:**

1. **Kiểm tra volume:**
   ```bash
   docker volume ls | grep aesp
   ```

2. **Kiểm tra volume được mount:**
   ```bash
   docker inspect aesp-db-1 | grep -A 10 Mounts
   ```

3. **Đảm bảo volume được cấu hình trong compose.yaml:**
   ```yaml
   volumes:
     - db_data:/var/lib/postgresql/data
   ```

4. **Không dùng `docker-compose down -v`** (sẽ xóa volumes)

---

## 📝 Workflow đề xuất

### Backup định kỳ

1. **Dump từ Docker mỗi ngày:**
   ```powershell
   .\dump-db-from-docker.ps1 -OutputFile "backups\aesp_$(Get-Date -Format 'yyyyMMdd').sql"
   ```

2. **Lưu file backup ở nơi an toàn** (cloud storage, external drive)

### Đồng bộ dữ liệu

1. **Từ Docker → pgAdmin:**
   - Dump từ Docker: `.\dump-db-from-docker.ps1`
   - Restore trong pgAdmin: Right-click database → Restore → Chọn file

2. **Từ pgAdmin → Docker:**
   - Backup trong pgAdmin: Right-click database → Backup
   - Import vào Docker: `.\import-aesp-sql.ps1` (hoặc copy file vào container)

---

## 🔗 Liên kết

- [IMPORT_SQL_GUIDE.md](./IMPORT_SQL_GUIDE.md) - Hướng dẫn import SQL
- [DOCKER_REBUILD_GUIDE.md](./DOCKER_REBUILD_GUIDE.md) - Hướng dẫn rebuild Docker
- [DOCKER_DB_FIX.md](./DOCKER_DB_FIX.md) - Sửa lỗi database









