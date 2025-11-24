# Start PostgreSQL Service
# Run this script as Administrator

Write-Host "Checking PostgreSQL service..." -ForegroundColor Cyan

# Try to find PostgreSQL service
$pgService = Get-Service -Name "*postgres*" -ErrorAction SilentlyContinue | Select-Object -First 1

if (-not $pgService) {
    Write-Host "❌ PostgreSQL service not found!" -ForegroundColor Red
    Write-Host "   Please make sure PostgreSQL is installed." -ForegroundColor Yellow
    exit 1
}

Write-Host "Found service: $($pgService.Name) ($($pgService.DisplayName))" -ForegroundColor Green
Write-Host "Current status: $($pgService.Status)" -ForegroundColor Yellow

if ($pgService.Status -eq "Running") {
    Write-Host "✅ PostgreSQL is already running!" -ForegroundColor Green
    
    # Check port
    $portCheck = Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue
    if ($portCheck) {
        Write-Host "✅ Port 5432 is listening" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Port 5432 is not listening (may take a moment)" -ForegroundColor Yellow
    }
    exit 0
}

# Try to start service
Write-Host "Starting PostgreSQL service..." -ForegroundColor Cyan

try {
    Start-Service -Name $pgService.Name -ErrorAction Stop
    Write-Host "✅ PostgreSQL service started!" -ForegroundColor Green
    
    # Wait a bit for service to fully start
    Write-Host "Waiting for PostgreSQL to be ready..." -ForegroundColor Cyan
    Start-Sleep -Seconds 5
    
    # Check port
    $portCheck = Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue
    if ($portCheck) {
        Write-Host "✅ PostgreSQL is running on port 5432" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Service started but port 5432 not yet listening" -ForegroundColor Yellow
        Write-Host "   Wait a few more seconds and check again" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed to start PostgreSQL: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Try running this script as Administrator" -ForegroundColor Yellow
    exit 1
}

