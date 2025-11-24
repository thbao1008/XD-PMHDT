# Script to setup .env files for all services
# Usage: .\setup-env.ps1

$ErrorActionPreference = "Continue"

Write-Host "🔧 Setting up .env files for all services...`n" -ForegroundColor Green

# Find .env files
$envDocker = $null
$envLocal = $null

# Check in root
if (Test-Path ".env.docker") {
    $envDocker = Resolve-Path ".env.docker"
    Write-Host "✅ Found .env.docker in root" -ForegroundColor Green
}
if (Test-Path ".env.local") {
    $envLocal = Resolve-Path ".env.local"
    Write-Host "✅ Found .env.local in root" -ForegroundColor Green
}

# Check in backend
if (-not $envDocker -and (Test-Path "backend\.env.docker")) {
    $envDocker = Resolve-Path "backend\.env.docker"
    Write-Host "✅ Found .env.docker in backend/" -ForegroundColor Green
}
if (-not $envLocal -and (Test-Path "backend\.env.local")) {
    $envLocal = Resolve-Path "backend\.env.local"
    Write-Host "✅ Found .env.local in backend/" -ForegroundColor Green
}

# Check in backend/services
if (-not $envDocker -and (Test-Path "backend\services\.env.docker")) {
    $envDocker = Resolve-Path "backend\services\.env.docker"
    Write-Host "✅ Found .env.docker in backend/services/" -ForegroundColor Green
}
if (-not $envLocal -and (Test-Path "backend\services\.env.local")) {
    $envLocal = Resolve-Path "backend\services\.env.local"
    Write-Host "✅ Found .env.local in backend/services/" -ForegroundColor Green
}

if (-not $envDocker -and -not $envLocal) {
    Write-Host "❌ Could not find .env.docker or .env.local files!" -ForegroundColor Red
    Write-Host "   Please create them in one of these locations:" -ForegroundColor Yellow
    Write-Host "   - Root: .env.docker or .env.local" -ForegroundColor Yellow
    Write-Host "   - backend/.env.docker or backend/.env.local" -ForegroundColor Yellow
    Write-Host "   - backend/services/.env.docker or backend/services/.env.local" -ForegroundColor Yellow
    exit 1
}

# Services that need .env files
$services = @(
    "api-gateway",
    "notification-service",
    "community-service",
    "package-service",
    "purchase-service",
    "user-service",
    "mentor-service",
    "learner-service",
    "admin-service",
    "ai-service",
    "file-service"
)

$servicesPath = "backend\services"
if (-not (Test-Path $servicesPath)) {
    Write-Host "❌ Services directory not found: $servicesPath" -ForegroundColor Red
    exit 1
}

Write-Host "`n📋 Copying .env files to services...`n" -ForegroundColor Cyan

foreach ($service in $services) {
    $servicePath = Join-Path $servicesPath $service
    
    if (-not (Test-Path $servicePath)) {
        Write-Host "⚠️  Service not found: $service" -ForegroundColor Yellow
        continue
    }
    
    # Copy .env.docker if exists
    if ($envDocker) {
        $targetDocker = Join-Path $servicePath ".env.docker"
        Copy-Item -Path $envDocker -Destination $targetDocker -Force -ErrorAction SilentlyContinue
        Write-Host "   ✅ $service/.env.docker" -ForegroundColor Gray
    }
    
    # Copy .env.local if exists
    if ($envLocal) {
        $targetLocal = Join-Path $servicePath ".env.local"
        Copy-Item -Path $envLocal -Destination $targetLocal -Force -ErrorAction SilentlyContinue
        Write-Host "   ✅ $service/.env.local" -ForegroundColor Gray
    }
    
    # Also create symlink or copy to backend/services level (for ../../ path)
    if ($envDocker) {
        $servicesEnvDocker = Join-Path $servicesPath ".env.docker"
        if (-not (Test-Path $servicesEnvDocker)) {
            Copy-Item -Path $envDocker -Destination $servicesEnvDocker -Force -ErrorAction SilentlyContinue
        }
    }
    
    if ($envLocal) {
        $servicesEnvLocal = Join-Path $servicesPath ".env.local"
        if (-not (Test-Path $servicesEnvLocal)) {
            Copy-Item -Path $envLocal -Destination $servicesEnvLocal -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host "`n✨ Done! .env files have been copied to all services.`n" -ForegroundColor Green
Write-Host "💡 Services will read from:" -ForegroundColor Cyan
Write-Host "   - backend/services/.env.docker (if DOCKER=true)" -ForegroundColor Gray
Write-Host "   - backend/services/.env.local (default)`n" -ForegroundColor Gray

