# Khởi động PostgreSQL Database

## Vấn đề:
Tất cả microservices không thể kết nối database vì PostgreSQL chưa chạy.

## Giải pháp:

### 1. Start PostgreSQL Service (Windows)

#### Cách 1: Dùng PowerShell (Run as Administrator)
```powershell
Start-Service -Name "postgresql-x64-18"
```

#### Cách 2: Dùng Services Manager
1. Mở **Services** (Win + R → `services.msc`)
2. Tìm **postgresql-x64-18 - PostgreSQL Server 18**
3. Click **Start**

#### Cách 3: Dùng Command Prompt (Run as Administrator)
```cmd
net start postgresql-x64-18
```

### 2. Kiểm tra PostgreSQL đã chạy

```powershell
# Kiểm tra service status
Get-Service -Name "*postgres*"

# Kiểm tra port 5432
Get-NetTCPConnection -LocalPort 5432
```

### 3. Cấu hình Database (nếu chưa có)

#### Tạo database "aesp" (nếu chưa có):
```sql
-- Kết nối PostgreSQL bằng psql hoặc pgAdmin
CREATE DATABASE aesp;
```

#### Hoặc dùng command line:
```cmd
psql -U postgres -c "CREATE DATABASE aesp;"
```

### 4. Cấu hình mặc định

Các services sử dụng cấu hình mặc định:
- **Host**: `localhost`
- **Port**: `5432`
- **User**: `postgres`
- **Password**: `1234`
- **Database**: `aesp`

Nếu cấu hình khác, tạo file `.env` trong mỗi service:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=aesp
```

### 5. Thứ tự khởi động đúng

1. **Start PostgreSQL** (bắt buộc)
2. **Start microservices**: `node start-all-services.js`
3. **Start frontend**: `npm run dev:fe`

## Troubleshooting

### Lỗi: "Service cannot be started"
- Chạy PowerShell/CMD **as Administrator**
- Kiểm tra PostgreSQL đã được cài đặt đúng chưa

### Lỗi: "Port 5432 already in use"
- Có thể PostgreSQL đã chạy rồi
- Hoặc có service khác đang dùng port này
- Kiểm tra: `Get-NetTCPConnection -LocalPort 5432`

### Lỗi: "Database 'aesp' does not exist"
- Tạo database: `CREATE DATABASE aesp;`
- Hoặc đổi tên database trong `.env`

### Lỗi: "Password authentication failed"
- Kiểm tra password trong `.env` hoặc cấu hình PostgreSQL
- Reset password nếu cần: `ALTER USER postgres WITH PASSWORD '1234';`

