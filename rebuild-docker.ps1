# PowerShell script to rebuild Docker containers
# This script will:
# 1. Stop and remove existing containers
# 2. Remove old images (optional)
# 3. Rebuild images
# 4. Start containers

param(
    [switch]$Clean = $false,
    [switch]$NoCache = $false
)

Write-Host "=== AESP Docker Rebuild Script ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop and remove containers
Write-Host "Step 1: Stopping and removing containers..." -ForegroundColor Yellow
docker-compose down

if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: docker-compose down failed, continuing anyway..." -ForegroundColor Yellow
}

# Step 2: Optional - Remove volumes (clean slate)
if ($Clean) {
    Write-Host "Step 2: Removing volumes (clean rebuild)..." -ForegroundColor Yellow
    docker-compose down -v
    Write-Host "All volumes removed. Database will be recreated." -ForegroundColor Yellow
} else {
    Write-Host "Step 2: Keeping volumes (data preserved)" -ForegroundColor Green
}

# Step 3: Optional - Remove old images
if ($Clean) {
    Write-Host "Step 3: Removing old images..." -ForegroundColor Yellow
    docker-compose rm -f
}

# Step 4: Rebuild images
Write-Host "Step 4: Rebuilding Docker images..." -ForegroundColor Yellow
$buildArgs = @("build")
if ($NoCache) {
    $buildArgs += "--no-cache"
    Write-Host "Building without cache..." -ForegroundColor Yellow
}

docker-compose $buildArgs

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host ""

# Step 5: Start containers
Write-Host "Step 5: Starting containers..." -ForegroundColor Yellow
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to start containers!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Rebuild Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Services are starting up. Check status with:" -ForegroundColor Cyan
Write-Host "  docker-compose ps" -ForegroundColor White
Write-Host ""
Write-Host "View logs with:" -ForegroundColor Cyan
Write-Host "  docker-compose logs -f app" -ForegroundColor White
Write-Host ""
Write-Host "Access services:" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  API Gateway: http://localhost:4000" -ForegroundColor White
Write-Host "  Database: localhost:5432" -ForegroundColor White
Write-Host ""


