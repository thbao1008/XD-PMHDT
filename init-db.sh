#!/bin/bash
set -e

# Wait for database to be ready
until pg_isready -U postgres -d aesp; do
  echo "Waiting for database to be ready..."
  sleep 2
done

echo "Restoring database from dump..."
# Drop and recreate database first
PGPASSWORD=1234 psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS aesp;"
PGPASSWORD=1234 psql -U postgres -d postgres -c "CREATE DATABASE aesp;"

# Restore from dump
pg_restore -U postgres -d aesp --clean --if-exists /tmp/aesp.sql

echo "Database restore completed."