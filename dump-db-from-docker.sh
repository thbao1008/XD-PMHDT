#!/bin/bash
# Bash script to dump PostgreSQL database from Docker container
# This creates a SQL file that can be imported into pgAdmin

OUTPUT_FILE="${1:-aesp_dump_$(date +%Y%m%d_%H%M%S).sql}"
FORMAT="${2:-plain}"

echo "=== Dump Database from Docker Container ==="
echo ""

# Find PostgreSQL container
DB_CONTAINER=$(docker ps --format "{{.Names}}" | grep -E "postgres|aesp.*db" | head -n 1)

if [ -z "$DB_CONTAINER" ]; then
    echo "ERROR: PostgreSQL container not found!"
    echo "Make sure Docker containers are running: docker-compose up -d"
    exit 1
fi

echo "Found container: $DB_CONTAINER"

# Database configuration
DB_USER="postgres"
DB_NAME="aesp"

echo "Database: $DB_NAME"
echo "Output file: $OUTPUT_FILE"
echo "Format: $FORMAT"
echo ""

# Dump database
echo "Dumping database..."

if [ "$FORMAT" = "custom" ]; then
    # Custom format (binary, compressed)
    BACKUP_FILE="${OUTPUT_FILE%.sql}.backup"
    docker exec -t $DB_CONTAINER pg_dump -U $DB_USER -Fc $DB_NAME > $BACKUP_FILE
    
    if [ $? -eq 0 ]; then
        echo "SUCCESS: Database dumped to $BACKUP_FILE"
        echo "File size: $(du -h $BACKUP_FILE | cut -f1)"
        echo ""
        echo "To restore in pgAdmin:"
        echo "  1. Right-click database -> Restore..."
        echo "  2. Select Format: Custom or tar"
        echo "  3. Choose file: $BACKUP_FILE"
    else
        echo "ERROR: Dump failed!"
        exit 1
    fi
else
    # Plain SQL format
    docker exec -t $DB_CONTAINER pg_dump -U $DB_USER $DB_NAME > $OUTPUT_FILE
    
    if [ $? -eq 0 ]; then
        echo "SUCCESS: Database dumped to $OUTPUT_FILE"
        echo "File size: $(du -h $OUTPUT_FILE | cut -f1)"
        echo ""
        echo "To restore in pgAdmin:"
        echo "  1. Right-click database -> Restore..."
        echo "  2. Select Format: Plain"
        echo "  3. Choose file: $OUTPUT_FILE"
        echo ""
        echo "Or import using script:"
        echo "  ./import-aesp-sql.sh"
    else
        echo "ERROR: Dump failed!"
        exit 1
    fi
fi

echo ""
echo "=== Dump Complete ==="



