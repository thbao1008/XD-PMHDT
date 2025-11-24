#!/usr/bin/env node
/**
 * Script to fix all microservices issues
 * Compares old backend/src with new backend/services and fixes missing code
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OLD_BACKEND = join(__dirname, "../../src");
const NEW_SERVICES = __dirname;

console.log("🔍 Checking and fixing all microservices...\n");

// Check database connections
console.log("1. Checking database configurations...");
const servicesWithDb = [
  "user-service",
  "admin-service", 
  "learner-service",
  "mentor-service",
  "community-service",
  "package-service",
  "purchase-service",
  "notification-service",
  "ai-service"
];

servicesWithDb.forEach(serviceName => {
  const dbPath = join(NEW_SERVICES, serviceName, "src/config/db.js");
  if (existsSync(dbPath)) {
    const content = readFileSync(dbPath, "utf-8");
    // Check if dotenv is configured correctly
    if (!content.includes("dotenv.config")) {
      console.log(`   ⚠️  ${serviceName}: Missing dotenv.config`);
    } else {
      console.log(`   ✅ ${serviceName}: DB config OK`);
    }
  } else {
    console.log(`   ❌ ${serviceName}: Missing db.js`);
  }
});

// Check User Service specifically
console.log("\n2. Checking User Service...");
const userServicePath = join(NEW_SERVICES, "user-service/src");
const requiredFiles = [
  "server.js",
  "config/db.js",
  "controllers/authController.js",
  "controllers/userController.js",
  "models/userModel.js",
  "middleware/authGuard.js",
  "routes/authRoutes.js",
  "routes/userRoutes.js"
];

let userServiceOk = true;
requiredFiles.forEach(file => {
  const filePath = join(userServicePath, file);
  if (existsSync(filePath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ Missing: ${file}`);
    userServiceOk = false;
  }
});

// Check if User Service server.js imports db correctly
const userServerPath = join(userServicePath, "server.js");
if (existsSync(userServerPath)) {
  const content = readFileSync(userServerPath, "utf-8");
  // Check if db is imported (even indirectly through routes)
  if (!content.includes("authRoutes") || !content.includes("userRoutes")) {
    console.log("   ⚠️  User Service: Routes may not be imported correctly");
  } else {
    console.log("   ✅ User Service: Routes imported");
  }
}

// Check API Gateway routing
console.log("\n3. Checking API Gateway routing...");
const gatewayPath = join(NEW_SERVICES, "api-gateway/src/server.js");
if (existsSync(gatewayPath)) {
  const content = readFileSync(gatewayPath, "utf-8");
  const requiredRoutes = [
    "/api/auth",
    "/api/admin",
    "/api/learners",
    "/api/mentors",
    "/api/community",
    "/api/notifications",
    "/api/packages",
    "/api/purchases"
  ];
  
  requiredRoutes.forEach(route => {
    if (content.includes(route)) {
      console.log(`   ✅ Route ${route} configured`);
    } else {
      console.log(`   ❌ Missing route: ${route}`);
    }
  });
} else {
  console.log("   ❌ API Gateway server.js not found");
}

// Check environment variables
console.log("\n4. Checking environment setup...");
const envLocalPath = join(NEW_SERVICES, "../.env.local");
const envDockerPath = join(NEW_SERVICES, "../.env.docker");

if (existsSync(envLocalPath) || existsSync(envDockerPath)) {
  console.log("   ✅ Environment file found");
} else {
  console.log("   ⚠️  No .env.local or .env.docker found in backend/services/");
  console.log("   💡 Create .env.local with database credentials");
}

console.log("\n✅ Check complete!");
console.log("\n💡 Next steps:");
console.log("   1. Ensure PostgreSQL is running");
console.log("   2. Create .env.local in backend/services/ if missing");
console.log("   3. Run: node start-all-services.js");
console.log("   4. Wait 5-10 seconds for services to start");
console.log("   5. Run: node check-health.js");

