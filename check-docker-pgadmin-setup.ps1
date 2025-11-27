# PowerShell script to check Docker and pgAdmin setup
# Verifies all components needed for pgAdmin <-> Docker sync

Write-Host "=== Docker & pgAdmin Setup Checker ===" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Check 1: Docker is installed
Write-Host "Check 1: Docker installation..." -ForegroundColor Cyan
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Docker is installed: $dockerVersion" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Docker is not installed or not in PATH" -ForegroundColor Red
        $allGood = $false
    }
} catch {
    Write-Host "  ✗ Docker is not installed" -ForegroundColor Red
    $allGood = $false
}

# Check 2: Docker Compose is available
Write-Host "Check 2: Docker Compose..." -ForegroundColor Cyan
try {
    $composeVersion = docker-compose --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Docker Compose is available: $composeVersion" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Docker Compose is not available" -ForegroundColor Red
        $allGood = $false
    }
} catch {
    Write-Host "  ✗ Docker Compose is not available" -ForegroundColor Red
    $allGood = $false
}

# Check 3: Containers are running
Write-Host "Check 3: Docker containers..." -ForegroundColor Cyan
$containers = docker-compose ps 2>&1
if ($containers -match "Up") {
    Write-Host "  ✓ Containers are running" -ForegroundColor Green
    $containers | Select-String "Up" | ForEach-Object {
        Write-Host "    $_" -ForegroundColor Gray
    }
} else {
    Write-Host "  ✗ Containers are not running" -ForegroundColor Red
    Write-Host "    Run: docker-compose up -d" -ForegroundColor Yellow
    $allGood = $false
}

# Check 4: PostgreSQL container
Write-Host "Check 4: PostgreSQL container..." -ForegroundColor Cyan
$dbContainer = docker ps --format "{{.Names}}" | Select-String -Pattern "postgres|aesp.*db" | Select-Object -First 1
if ($dbContainer) {
    $dbContainer = $dbContainer.ToString().Trim()
    Write-Host "  ✓ PostgreSQL container found: $dbContainer" -ForegroundColor Green
    
    # Check health
    $health = docker inspect $dbContainer --format "{{.State.Health.Status}}" 2>&1
    if ($health -eq "healthy") {
        Write-Host "    ✓ Container is healthy" -ForegroundColor Green
    } elseif ($health -eq "starting") {
        Write-Host "    ⚠ Container is starting (wait a moment)" -ForegroundColor Yellow
    } else {
        Write-Host "    ⚠ Container health: $health" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ✗ PostgreSQL container not found" -ForegroundColor Red
    $allGood = $false
}

# Check 5: Port 5432 is accessible
Write-Host "Check 5: Port 5432 accessibility..." -ForegroundColor Cyan
try {
    $connection = Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue -InformationLevel Quiet
    if ($connection) {
        Write-Host "  ✓ Port 5432 is accessible from host" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Port 5432 is not accessible" -ForegroundColor Red
        $allGood = $false
    }
} catch {
    Write-Host "  ⚠ Cannot test port (might need admin rights)" -ForegroundColor Yellow
}

# Check 6: Database connection
Write-Host "Check 6: Database connection..." -ForegroundColor Cyan
if ($dbContainer) {
    $dbTest = docker exec $dbContainer psql -U postgres -d aesp -c "SELECT 1;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Can connect to database" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Cannot connect to database" -ForegroundColor Red
        Write-Host "    Error: $dbTest" -ForegroundColor Red
        $allGood = $false
    }
} else {
    Write-Host "  ⚠ Skipped (container not found)" -ForegroundColor Yellow
}

# Check 7: Required files
Write-Host "Check 7: Required files..." -ForegroundColor Cyan
$requiredFiles = @("compose.yaml", "aesp.sql", "import-aesp-sql.ps1", "dump-db-from-docker.ps1")
$missingFiles = @()
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file (missing)" -ForegroundColor Red
        $missingFiles += $file
        $allGood = $false
    }
}

# Check 8: Environment file
Write-Host "Check 8: Environment configuration..." -ForegroundColor Cyan
if (Test-Path "backend\.env.docker") {
    Write-Host "  ✓ backend\.env.docker exists" -ForegroundColor Green
} elseif (Test-Path "backend\.env.docker.example") {
    Write-Host "  ⚠ backend\.env.docker not found, but .example exists" -ForegroundColor Yellow
    Write-Host "    Copy: Copy-Item backend\.env.docker.example backend\.env.docker" -ForegroundColor Gray
} else {
    Write-Host "  ⚠ No environment file found" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "✓ All checks passed! Ready for pgAdmin sync." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Test connection: .\test-pgadmin-connection.ps1" -ForegroundColor White
    Write-Host "  2. Dump from Docker: .\dump-db-from-docker.ps1" -ForegroundColor White
    Write-Host "  3. Import to Docker: .\import-aesp-sql.ps1" -ForegroundColor White
    Write-Host "  4. Connect pgAdmin using:" -ForegroundColor White
    Write-Host "     Host: localhost" -ForegroundColor Gray
    Write-Host "     Port: 5432" -ForegroundColor Gray
    Write-Host "     Database: aesp" -ForegroundColor Gray
    Write-Host "     User: postgres" -ForegroundColor Gray
    Write-Host "     Password: 1234" -ForegroundColor Gray
} else {
    Write-Host "✗ Some checks failed. Please fix the issues above." -ForegroundColor Red
    Write-Host ""
    Write-Host "Common fixes:" -ForegroundColor Yellow
    Write-Host "  - Start containers: docker-compose up -d" -ForegroundColor White
    Write-Host "  - Check Docker is running: docker ps" -ForegroundColor White
    Write-Host "  - See: PGADMIN_DOCKER_GUIDE.md for detailed help" -ForegroundColor White
}

Write-Host ""



