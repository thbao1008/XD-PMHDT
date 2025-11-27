#!/bin/bash
# Script để fix lỗi bcryptjs trong Docker seed container

echo "🔧 Fixing Docker seed container..."

# Rebuild images
echo "📦 Rebuilding Docker images..."
docker-compose build

# Stop và xóa containers cũ
echo "🛑 Stopping old containers..."
docker-compose down

# Start lại tất cả services
echo "🚀 Starting services..."
docker-compose up -d db

# Đợi database healthy
echo "⏳ Waiting for database to be healthy..."
sleep 10

# Chạy seed
echo "🌱 Running seed..."
docker-compose up seed

echo "✅ Done! Check logs with: docker-compose logs seed"




