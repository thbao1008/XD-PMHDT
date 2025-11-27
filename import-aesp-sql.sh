#!/bin/bash
# Script để import file aesp.sql vào PostgreSQL container
# Sử dụng khi database đã tồn tại và cần import lại dữ liệu

echo "🔄 Đang import file aesp.sql vào PostgreSQL container..."

# Kiểm tra container có đang chạy không
if ! docker ps | grep -q "aesp-db"; then
    echo "❌ Container PostgreSQL không tìm thấy. Đang tìm container name..."
    DB_CONTAINER=$(docker ps --format "{{.Names}}" | grep -i postgres | head -n 1)
    if [ -z "$DB_CONTAINER" ]; then
        echo "❌ Không tìm thấy container PostgreSQL. Hãy chạy: docker-compose up -d db"
        exit 1
    fi
    echo "✅ Tìm thấy container: $DB_CONTAINER"
else
    DB_CONTAINER=$(docker ps --format "{{.Names}}" | grep -i postgres | head -n 1)
fi

# Kiểm tra file aesp.sql có tồn tại không
if [ ! -f "aesp.sql" ]; then
    echo "❌ File aesp.sql không tồn tại trong thư mục hiện tại"
    exit 1
fi

echo "📋 Thông tin import:"
echo "   Container: $DB_CONTAINER"
echo "   Database: aesp"
echo "   User: postgres"
echo "   File: aesp.sql"

# Copy file vào container
echo "📦 Đang copy file vào container..."
docker cp aesp.sql "$DB_CONTAINER:/tmp/aesp.sql"

# Import vào database
echo "🚀 Đang import dữ liệu..."
docker exec -i "$DB_CONTAINER" psql -U postgres -d aesp -f /tmp/aesp.sql

if [ $? -eq 0 ]; then
    echo "✅ Import thành công!"
    echo "🧹 Đang xóa file tạm trong container..."
    docker exec "$DB_CONTAINER" rm /tmp/aesp.sql
else
    echo "❌ Import thất bại. Kiểm tra lỗi ở trên."
    exit 1
fi









