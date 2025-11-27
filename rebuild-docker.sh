#!/bin/bash
# Bash script to rebuild Docker containers
# This script will:
# 1. Stop and remove existing containers
# 2. Remove old images (optional)
# 3. Rebuild images
# 4. Start containers

CLEAN=false
NO_CACHE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --clean)
            CLEAN=true
            shift
            ;;
        --no-cache)
            NO_CACHE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--clean] [--no-cache]"
            exit 1
            ;;
    esac
done

echo "=== AESP Docker Rebuild Script ==="
echo ""

# Step 1: Stop and remove containers
echo "Step 1: Stopping and removing containers..."
docker-compose down

# Step 2: Optional - Remove volumes (clean slate)
if [ "$CLEAN" = true ]; then
    echo "Step 2: Removing volumes (clean rebuild)..."
    docker-compose down -v
    echo "All volumes removed. Database will be recreated."
else
    echo "Step 2: Keeping volumes (data preserved)"
fi

# Step 3: Optional - Remove old images
if [ "$CLEAN" = true ]; then
    echo "Step 3: Removing old images..."
    docker-compose rm -f
fi

# Step 4: Rebuild images
echo "Step 4: Rebuilding Docker images..."
if [ "$NO_CACHE" = true ]; then
    echo "Building without cache..."
    docker-compose build --no-cache
else
    docker-compose build
fi

if [ $? -ne 0 ]; then
    echo "ERROR: Build failed!"
    exit 1
fi

echo "Build completed successfully!"
echo ""

# Step 5: Start containers
echo "Step 5: Starting containers..."
docker-compose up -d

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to start containers!"
    exit 1
fi

echo ""
echo "=== Rebuild Complete ==="
echo ""
echo "Services are starting up. Check status with:"
echo "  docker-compose ps"
echo ""
echo "View logs with:"
echo "  docker-compose logs -f app"
echo ""
echo "Access services:"
echo "  Frontend: http://localhost:5173"
echo "  API Gateway: http://localhost:4000"
echo "  Database: localhost:5432"
echo ""





