# PowerShell script to verify data persistence in Docker
# Checks if data will survive container restarts

Write-Host "=== Verify Data Persistence in Docker ===" -ForegroundColor Cyan
Write-Host ""

# Check 1: Volume exists
Write-Host "Check 1: Docker volume..." -ForegroundColor Cyan
$volume = docker volume ls --format "{{.Name}}" | Select-String "aesp.*db|db_data"
if ($volume) {
    Write-Host "  Volume found: $volume" -ForegroundColor Green
    
    # Get volume details
    $volumeInfo = docker volume inspect $volume 2>&1
    if ($LASTEXITCODE -eq 0) {
        $mountPoint = ($volumeInfo | ConvertFrom-Json).Mountpoint
        Write-Host "  Mount point: $mountPoint" -ForegroundColor Gray
        Write-Host "  Data is stored on host at: $mountPoint" -ForegroundColor Green
    }
} else {
    Write-Host "  WARNING: Volume not found!" -ForegroundColor Red
    Write-Host "  Data will be lost when container is removed!" -ForegroundColor Red
}

Write-Host ""

# Check 2: Container volume mount
Write-Host "Check 2: Container volume mount..." -ForegroundColor Cyan
$dbContainer = docker ps --format "{{.Names}}" | Select-String -Pattern "postgres|aesp.*db" | Select-Object -First 1
if ($dbContainer) {
    $dbContainer = $dbContainer.ToString().Trim()
    Write-Host "  Container: $dbContainer" -ForegroundColor Green
    
    $mounts = docker inspect $dbContainer --format "{{range .Mounts}}{{.Type}} {{.Destination}} {{end}}" 2>&1
    if ($mounts -match "volume.*/var/lib/postgresql/data") {
        Write-Host "  Volume is correctly mounted to /var/lib/postgresql/data" -ForegroundColor Green
    } else {
        Write-Host "  WARNING: Volume mount might be incorrect!" -ForegroundColor Red
    }
} else {
    Write-Host "  Container not running" -ForegroundColor Yellow
}

Write-Host ""

# Check 3: Test data persistence
Write-Host "Check 3: Test data persistence..." -ForegroundColor Cyan
if ($dbContainer) {
    # Count tables
    $tableCount = docker exec $dbContainer psql -U postgres -d aesp -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>&1
    if ($LASTEXITCODE -eq 0 -and $tableCount) {
        $count = ($tableCount | Select-String '\d+').Matches.Value
        if ($count) {
            Write-Host "  Found $count table(s) in database" -ForegroundColor Green
            
            if ([int]$count -gt 0) {
                Write-Host "  Data exists in database" -ForegroundColor Green
            } else {
                Write-Host "  Database is empty" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  Cannot parse table count" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  Cannot check tables (database might be empty or not accessible)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  Skipped (container not running)" -ForegroundColor Yellow
}

Write-Host ""

# Check 4: Compose.yaml configuration
Write-Host "Check 4: Compose.yaml configuration..." -ForegroundColor Cyan
if (Test-Path "compose.yaml") {
    $composeContent = Get-Content "compose.yaml" -Raw
    if ($composeContent -match "db_data:/var/lib/postgresql/data") {
        Write-Host "  Volume is correctly configured in compose.yaml" -ForegroundColor Green
    } else {
        Write-Host "  WARNING: Volume configuration might be missing!" -ForegroundColor Red
    }
    
    if ($composeContent -match "volumes:\s*\n\s*db_data:") {
        Write-Host "  Volume declaration found in compose.yaml" -ForegroundColor Green
    } else {
        Write-Host "  WARNING: Volume declaration might be missing!" -ForegroundColor Red
    }
} else {
    Write-Host "  compose.yaml not found" -ForegroundColor Red
}

Write-Host ""

# Summary and recommendations
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host ""

if ($volume -and $dbContainer) {
    Write-Host "Data Persistence Status: ENABLED" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your data WILL be preserved when:" -ForegroundColor Green
    Write-Host "  - Container is restarted (docker-compose restart)" -ForegroundColor White
    Write-Host "  - Container is stopped and started (docker-compose stop/start)" -ForegroundColor White
    Write-Host "  - Docker is restarted" -ForegroundColor White
    Write-Host ""
    Write-Host "Your data WILL be LOST when:" -ForegroundColor Red
    Write-Host "  - Volume is deleted: docker volume rm $volume" -ForegroundColor White
    Write-Host "  - Using: docker-compose down -v (removes volumes)" -ForegroundColor White
    Write-Host "  - Using: docker-compose down --volumes" -ForegroundColor White
    Write-Host ""
    Write-Host "Recommendations:" -ForegroundColor Yellow
    Write-Host "  1. Use 'docker-compose down' (NOT 'down -v') to stop containers" -ForegroundColor White
    Write-Host "  2. Regular backups: .\dump-db-from-docker.ps1" -ForegroundColor White
    Write-Host "  3. Check volume before removing: docker volume ls" -ForegroundColor White
} else {
    Write-Host "Data Persistence Status: AT RISK" -ForegroundColor Red
    Write-Host ""
    Write-Host "WARNING: Volume or container configuration might be incorrect!" -ForegroundColor Red
    Write-Host "Data might be lost when container is removed." -ForegroundColor Red
    Write-Host ""
    Write-Host "Fix:" -ForegroundColor Yellow
    Write-Host "  1. Check compose.yaml has: db_data:/var/lib/postgresql/data" -ForegroundColor White
    Write-Host "  2. Check compose.yaml has volumes section with db_data:" -ForegroundColor White
    Write-Host "  3. Restart: docker-compose down && docker-compose up -d" -ForegroundColor White
}

Write-Host ""

