# Script to start ALL services (Backend + Frontend) - ONE TIME FIX
# Usage: .\start-all.ps1

$ErrorActionPreference = "Continue"

Write-Host "🚀 Starting ALL services (Backend + Frontend)..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill all ports first
Write-Host "Step 1: Killing all processes on service ports..." -ForegroundColor Yellow
$servicesPath = Join-Path $PSScriptRoot "backend\services"
if (Test-Path (Join-Path $servicesPath "kill-all-ports.ps1")) {
    & (Join-Path $servicesPath "kill-all-ports.ps1")
} else {
    Write-Host "⚠️  kill-all-ports.ps1 not found, using basic cleanup..." -ForegroundColor Yellow
    $ports = @(4000, 4001, 4002, 4003, 4004, 4005, 4006, 4007, 4008, 4010, 4011, 5173)
    foreach ($port in $ports) {
        $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($conns) {
            $conns | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
        }
    }
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "Step 2: Starting Backend Services..." -ForegroundColor Yellow
Write-Host ""

# Step 2: Start backend services in foreground (can be killed with Ctrl+C)
Write-Host "Step 2: Starting Backend Services..." -ForegroundColor Yellow
Write-Host "   (Press Ctrl+C in this window to stop all services)" -ForegroundColor Gray
Write-Host ""

# Start backend in new window so we can start frontend too
$backendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$servicesPath'; node start-all-services.js" -PassThru

Write-Host "✅ Backend services starting (PID: $($backendProcess.Id))" -ForegroundColor Green
Write-Host "⏳ Waiting 10 seconds for backend services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "Step 3: Starting Frontend..." -ForegroundColor Yellow
Write-Host ""

# Step 3: Start frontend in new window
$frontendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run dev:fe" -PassThru

Write-Host "✅ Frontend starting (PID: $($frontendProcess.Id))" -ForegroundColor Green
Write-Host "⏳ Waiting 5 seconds for frontend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "✨ All services started!" -ForegroundColor Green
Write-Host ""
Write-Host "📡 URLs:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "   API Gateway: http://localhost:4000" -ForegroundColor White
Write-Host ""
Write-Host "📊 To check health:" -ForegroundColor Cyan
Write-Host "   cd backend/services" -ForegroundColor Gray
Write-Host "   node check-health.js" -ForegroundColor Gray
Write-Host ""
Write-Host "🛑 To stop all services:" -ForegroundColor Yellow
Write-Host "   .\kill-all-processes-complete.ps1" -ForegroundColor Gray
Write-Host "   (Or close the PowerShell windows)" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Tip: Use .\kill-all-processes-complete.ps1 to kill everything cleanly" -ForegroundColor Cyan
Write-Host ""

