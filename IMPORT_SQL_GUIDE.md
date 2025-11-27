# 📚 Hướng dẫn Import file aesp.sql vào PostgreSQL Docker

File này hướng dẫn cách import file `aesp.sql` vào container PostgreSQL trong Docker.

## 🎯 Các phương pháp import

### Phương pháp 1: Tự động import khi khởi động (Khuyến nghị cho lần đầu)

File `aesp.sql` đã được mount vào container PostgreSQL trong `compose.yaml`. Khi container PostgreSQL khởi động lần đầu (volume `db_data` chưa tồn tại), file sẽ tự động được import.

**Cách sử dụng:**

1. **Nếu database chưa tồn tại (lần đầu setup):**
   ```bash
   # Xóa volume cũ nếu có (CẨN THẬN: sẽ mất dữ liệu cũ)
   docker-compose down -v
   
   # Khởi động lại container
   docker-compose up -d db
   ```

2. **Kiểm tra import:**
   ```bash
   docker exec -it <container_name> psql -U postgres -d aesp -c "\dt"
   ```

**⚠️ Lưu ý:** Phương pháp này chỉ chạy khi database được khởi tạo lần đầu. Nếu volume `db_data` đã tồn tại, file SQL sẽ không được import.

---

### Phương pháp 2: Import thủ công bằng script (Khi database đã tồn tại)

Sử dụng script helper để import file SQL vào database đã tồn tại.

#### Trên Linux/Mac:
```bash
chmod +x import-aesp-sql.sh
./import-aesp-sql.sh
```

#### Trên Windows (PowerShell):
```powershell
.\import-aesp-sql.ps1
```

**Script sẽ tự động:**
- Tìm container PostgreSQL
- Copy file `aesp.sql` vào container
- Import dữ liệu vào database `aesp`
- Xóa file tạm sau khi import

---

### Phương pháp 3: Import thủ công bằng lệnh Docker

#### Bước 1: Copy file vào container
```bash
docker cp aesp.sql <container_name>:/tmp/aesp.sql
```

#### Bước 2: Import vào database
```bash
docker exec -it <container_name> psql -U postgres -d aesp -f /tmp/aesp.sql
```

#### Bước 3: Xóa file tạm (tùy chọn)
```bash
docker exec <container_name> rm /tmp/aesp.sql
```

**Tìm tên container:**
```bash
docker ps --format "{{.Names}}" | grep postgres
```

Hoặc nếu dùng docker-compose:
```bash
docker-compose ps db
```

---

## 🔄 Dump dữ liệu từ container để dùng trong pgAdmin

### Dump toàn bộ database:
```bash
docker exec -t <container_name> pg_dump -U postgres aesp > aesp_backup.sql
```

### Dump dạng custom (nén):
```bash
docker exec -t <container_name> pg_dump -U postgres -Fc aesp > aesp_backup.backup
```

Sau đó bạn có thể import file này vào pgAdmin bằng Restore...

---

## 🔌 Kết nối pgAdmin với PostgreSQL trong Docker

### Thông tin kết nối:
- **Host name/address:** `localhost` (hoặc `127.0.0.1`)
- **Port:** `5432`
- **Username:** `postgres`
- **Password:** `1234` (theo cấu hình trong compose.yaml)
- **Database:** `aesp`

### Các bước trong pgAdmin:

1. Mở pgAdmin
2. Click chuột phải vào **Servers** → **Create** → **Server...**
3. Trong tab **General:**
   - **Name:** AESP Docker (hoặc tên bạn muốn)
4. Trong tab **Connection:**
   - **Host name/address:** `localhost`
   - **Port:** `5432`
   - **Maintenance database:** `aesp`
   - **Username:** `postgres`
   - **Password:** `1234`
   - ✅ Tích vào **Save password** (nếu muốn)
5. Click **Save**

---

## 🛠️ Troubleshooting

### Lỗi: "container not found"
- Đảm bảo container PostgreSQL đang chạy: `docker-compose ps`
- Khởi động container: `docker-compose up -d db`

### Lỗi: "database does not exist"
- Tạo database: `docker exec -it <container_name> psql -U postgres -c "CREATE DATABASE aesp;"`
- Hoặc kiểm tra tên database trong `compose.yaml`

### Lỗi: "permission denied"
- Trên Linux/Mac: `chmod +x import-aesp-sql.sh`
- Trên Windows: Chạy PowerShell với quyền Administrator

### Lỗi: "file not found"
- Đảm bảo file `aesp.sql` nằm trong thư mục gốc của dự án
- Kiểm tra đường dẫn: `ls aesp.sql` (Linux/Mac) hoặc `dir aesp.sql` (Windows)

### Import không chạy tự động khi khởi động
- Volume `db_data` đã tồn tại từ trước
- Giải pháp: Xóa volume và khởi động lại (⚠️ sẽ mất dữ liệu cũ):
  ```bash
  docker-compose down -v
  docker-compose up -d db
  ```

---

## 📝 Ghi chú

- File `aesp.sql` được mount vào `/docker-entrypoint-initdb.d/` trong container
- PostgreSQL tự động chạy tất cả file `.sql` trong thư mục này khi database được khởi tạo lần đầu
- Nếu cần import lại, dùng script hoặc lệnh thủ công (Phương pháp 2 hoặc 3)


