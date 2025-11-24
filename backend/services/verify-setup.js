#!/usr/bin/env node
/**
 * Script to verify microservices setup
 * Checks if all required files exist and dependencies are installed
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const services = [
  "api-gateway",
  "notification-service",
  "community-service",
  "package-service",
  "purchase-service",
  "user-service",
  "mentor-service",
  "learner-service",
  "admin-service",
];

const requiredFiles = {
  all: ["package.json", "src/server.js"],
  "api-gateway": ["src/server.js"],
  "notification-service": [
    "src/config/db.js",
    "src/services/notificationService.js",
    "src/controllers/notificationController.js",
    "src/routes/notificationRoutes.js",
  ],
  "community-service": [
    "src/config/db.js",
    "src/services/communityService.js",
    "src/controllers/communityController.js",
    "src/routes/communityRoutes.js",
  ],
  "package-service": [
    "src/config/db.js",
    "src/services/packageService.js",
    "src/controllers/packageController.js",
    "src/routes/packageRoutes.js",
  ],
  "purchase-service": [
    "src/config/db.js",
    "src/services/purchaseService.js",
    "src/controllers/purchaseController.js",
    "src/routes/purchaseRoutes.js",
  ],
  "user-service": [
    "src/config/db.js",
    "src/models/userModel.js",
    "src/controllers/authController.js",
    "src/controllers/userController.js",
    "src/routes/authRoutes.js",
    "src/routes/userRoutes.js",
  ],
};

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function checkService(serviceName) {
  const servicePath = path.join(__dirname, serviceName);
  const issues = [];

  // Check if service directory exists
  if (!checkFileExists(servicePath)) {
    issues.push(`Service directory does not exist: ${servicePath}`);
    return { service: serviceName, status: "missing", issues };
  }

  // Check required files for all services
  for (const file of requiredFiles.all) {
    const filePath = path.join(servicePath, file);
    if (!checkFileExists(filePath)) {
      issues.push(`Missing required file: ${file}`);
    }
  }

  // Check service-specific files
  if (requiredFiles[serviceName]) {
    for (const file of requiredFiles[serviceName]) {
      const filePath = path.join(servicePath, file);
      if (!checkFileExists(filePath)) {
        issues.push(`Missing service-specific file: ${file}`);
      }
    }
  }

  // Check if node_modules exists (dependencies installed)
  const nodeModulesPath = path.join(servicePath, "node_modules");
  const hasDependencies = checkFileExists(nodeModulesPath);

  const status = issues.length === 0 ? "ok" : "issues";
  return {
    service: serviceName,
    status,
    issues,
    hasDependencies,
  };
}

function verifySetup() {
  console.log("🔍 Verifying microservices setup...\n");

  const results = services.map((service) => checkService(service));

  let allOk = true;

  results.forEach((result) => {
    if (result.status === "ok" && result.hasDependencies) {
      console.log(`✅ ${result.service} - OK (dependencies installed)`);
    } else if (result.status === "ok") {
      console.log(`⚠️  ${result.service} - OK (dependencies not installed)`);
      allOk = false;
    } else {
      console.log(`❌ ${result.service} - Issues found:`);
      result.issues.forEach((issue) => {
        console.log(`   - ${issue}`);
      });
      allOk = false;
    }
  });

  console.log("");

  if (allOk) {
    console.log("✨ All services are properly set up!");
  } else {
    console.log("⚠️  Some issues found. Please fix them before running services.");
    console.log("\nTo install dependencies, run:");
    console.log("  npm run install:all");
  }
}

verifySetup();

