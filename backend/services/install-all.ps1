# PowerShell script to install dependencies for all microservices
# Usage: .\install-all.ps1

Write-Host "📦 Installing dependencies for all microservices..." -ForegroundColor Cyan
Write-Host ""

$services = @(
  "api-gateway",
  "notification-service",
  "community-service",
  "package-service",
  "purchase-service",
  "user-service",
  "mentor-service",
  "learner-service",
  "admin-service"
)

foreach ($service in $services) {
  Write-Host "📦 Installing $service..." -ForegroundColor Yellow
  Set-Location $service
  npm install
  Set-Location ..
  Write-Host "✅ $service installed" -ForegroundColor Green
  Write-Host ""
}

Write-Host "✨ All services installed successfully!" -ForegroundColor Green

