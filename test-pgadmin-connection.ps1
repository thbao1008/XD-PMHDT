# PowerShell script to test pgAdmin connection to Docker PostgreSQL
# This helps verify the connection settings before using pgAdmin

Write-Host "=== Test pgAdmin Connection to Docker PostgreSQL ===" -ForegroundColor Cyan
Write-Host ""

# Find PostgreSQL container
$dbContainer = docker ps --format "{{.Names}}" | Select-String -Pattern "postgres|aesp.*db" | Select-Object -First 1

if (-not $dbContainer) {
    Write-Host "ERROR: PostgreSQL container not found!" -ForegroundColor Red
    Write-Host "Make sure Docker containers are running: docker-compose up -d" -ForegroundColor Yellow
    exit 1
}

$dbContainer = $dbContainer.ToString().Trim()
Write-Host "Found container: $dbContainer" -ForegroundColor Green

# Test connection parameters
Write-Host "Testing connection parameters..." -ForegroundColor Yellow
Write-Host ""

# Test 1: Container is running
Write-Host "Test 1: Container status..." -ForegroundColor Cyan
$status = docker inspect $dbContainer --format "{{.State.Status}}"
if ($status -eq "running") {
    Write-Host "  ✓ Container is running" -ForegroundColor Green
} else {
    Write-Host "  ✗ Container is not running (Status: $status)" -ForegroundColor Red
    exit 1
}

# Test 2: Port is exposed
Write-Host "Test 2: Port exposure..." -ForegroundColor Cyan
$ports = docker port $dbContainer
if ($ports -match "5432") {
    Write-Host "  ✓ Port 5432 is exposed" -ForegroundColor Green
    Write-Host "    $ports" -ForegroundColor Gray
} else {
    Write-Host "  ✗ Port 5432 is not exposed" -ForegroundColor Red
    exit 1
}

# Test 3: Database is accessible
Write-Host "Test 3: Database accessibility..." -ForegroundColor Cyan
$dbTest = docker exec $dbContainer psql -U postgres -d aesp -c "SELECT version();" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Database is accessible" -ForegroundColor Green
    $version = ($dbTest | Select-String "PostgreSQL").ToString()
    Write-Host "    $version" -ForegroundColor Gray
} else {
    Write-Host "  ✗ Cannot access database" -ForegroundColor Red
    Write-Host "    Error: $dbTest" -ForegroundColor Red
    exit 1
}

# Test 4: List tables
Write-Host "Test 4: List tables..." -ForegroundColor Cyan
$tables = docker exec $dbContainer psql -U postgres -d aesp -t -c "\dt" 2>&1
if ($LASTEXITCODE -eq 0 -and $tables.Trim()) {
    $tableCount = ($tables -split "`n" | Where-Object { $_.Trim() }).Count
    Write-Host "  ✓ Found $tableCount table(s)" -ForegroundColor Green
} else {
    Write-Host "  ⚠ No tables found (database might be empty)" -ForegroundColor Yellow
}

# Test 5: Network connectivity from host
Write-Host "Test 5: Network connectivity..." -ForegroundColor Cyan
try {
    $connection = Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue
    if ($connection.TcpTestSucceeded) {
        Write-Host "  ✓ Port 5432 is accessible from host" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Port 5432 is not accessible from host" -ForegroundColor Red
    }
} catch {
    Write-Host "  ⚠ Cannot test network connectivity (might need admin rights)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Connection Summary ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Use these settings in pgAdmin:" -ForegroundColor Yellow
Write-Host "  Host name/address: localhost" -ForegroundColor White
Write-Host "  Port: 5432" -ForegroundColor White
Write-Host "  Maintenance database: aesp" -ForegroundColor White
Write-Host "  Username: postgres" -ForegroundColor White
Write-Host "  Password: 1234" -ForegroundColor White
Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Green










