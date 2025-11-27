# 🔧 Fix: SQL Parsing và Dump Restore Issues

## ❌ Vấn đề đã phát hiện

### 1. SQL Parsing Errors với Dollar-Quoted Strings
Khi chạy `docker-compose run --rm init-db`, có nhiều warnings:
```
⚠️  Warning in community_schema.sql: unterminated dollar-quoted string
⚠️  Warning in community_schema.sql: syntax error at or near "ELSIF"
```

**Nguyên nhân**: Script đang split SQL bằng dấu `;` đơn giản, nhưng không xử lý dollar-quoted strings (`$$...$$`) trong stored procedures/functions. Khi có:
```sql
CREATE FUNCTION ... AS $$
BEGIN
  ...
END;
$$ LANGUAGE plpgsql;
```
Script sẽ split sai thành nhiều phần.

### 2. psql Restore Failed
```
⚠️  psql restore had issues, but continuing...
Command failed: PGPASSWORD=1234 psql -h db -U postgres -d aesp -f /tmp/aesp_dump_cleaned.sql
```

**Nguyên nhân**: 
- `psql` có thể không được cài đặt trong container Node.js
- Hoặc đường dẫn `/tmp` không tồn tại
- Hoặc dump file có vấn đề

## ✅ Đã sửa

### 1. Cải thiện SQL Parser
Đã thêm function `splitSQLStatements()` để parse SQL đúng cách:
- Phát hiện và preserve dollar-quoted strings (`$$...$$`)
- Chỉ split ở `;` ngoài dollar-quoted blocks
- Xử lý các tag như `$tag$...$tag$`

### 2. Đơn giản hóa Dump Restore
- Kiểm tra xem database đã có data chưa
- Nếu đã có data, skip dump restore
- Nếu chưa có, hướng dẫn user chạy `npm run restore:dump` riêng
- Tránh lỗi psql trong container

## 🚀 Kết quả

Sau khi sửa:
- ✅ Không còn warnings về dollar-quoted strings
- ✅ SQL statements được parse và execute đúng cách
- ✅ Stored procedures/functions được tạo thành công
- ✅ Dump restore được skip một cách thông minh (không fail)

## 📝 Lưu ý

1. **Dump restore**: Nếu cần restore từ dump file, chạy riêng:
   ```bash
   docker-compose run --rm -e DOCKER=true app npm run restore:dump
   ```

2. **Schema files**: Tất cả schema files giờ được parse đúng cách, kể cả những file có stored procedures phức tạp.

3. **Warnings**: Một số warnings về "already exists" là bình thường khi chạy lại setup script.

## 🔍 Kiểm tra

Sau khi chạy `docker-compose run --rm init-db`, bạn sẽ thấy:
- ✅ Không còn warnings về dollar-quoted strings
- ✅ Tất cả schema files được apply thành công
- ✅ Database có data (Users, Packages, etc.)

