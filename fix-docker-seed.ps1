# PowerShell script để fix lỗi bcryptjs trong Docker seed container

Write-Host "🔧 Fixing Docker seed container..." -ForegroundColor Cyan

# Rebuild images
Write-Host "📦 Rebuilding Docker images..." -ForegroundColor Yellow
docker-compose build

# Stop và xóa containers cũ
Write-Host "🛑 Stopping old containers..." -ForegroundColor Yellow
docker-compose down

# Start lại database
Write-Host "🚀 Starting database..." -ForegroundColor Yellow
docker-compose up -d db

# Đợi database healthy
Write-Host "⏳ Waiting for database to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Chạy seed
Write-Host "🌱 Running seed..." -ForegroundColor Yellow
docker-compose up seed

Write-Host "✅ Done! Check logs with: docker-compose logs seed" -ForegroundColor Green




