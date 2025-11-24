#!/bin/bash
# Script to install dependencies for all microservices
# Usage: ./install-all.sh

echo "📦 Installing dependencies for all microservices..."
echo ""

services=(
  "api-gateway"
  "notification-service"
  "community-service"
  "package-service"
  "purchase-service"
  "user-service"
  "mentor-service"
  "learner-service"
  "admin-service"
)

for service in "${services[@]}"; do
  echo "📦 Installing $service..."
  cd "$service" || exit
  npm install
  cd ..
  echo "✅ $service installed"
  echo ""
done

echo "✨ All services installed successfully!"

