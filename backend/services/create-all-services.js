// Script to create all microservices structure
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const services = [
  "community-service",
  "package-service",
  "purchase-service",
  "user-service",
  "mentor-service",
  "learner-service",
  "admin-service"
];

const baseStructure = {
  "src": {
    "config": {},
    "controllers": {},
    "services": {},
    "models": {},
    "routes": {},
    "middleware": {}
  },
  "package.json": `{
  "name": "SERVICE_NAME",
  "version": "1.0.0",
  "description": "SERVICE_DESC",
  "type": "module",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "pg": "^8.11.3"
  }
}`,
  "README.md": "# SERVICE_NAME\n\nSERVICE_DESC"
};

function createDirectoryStructure(basePath, structure) {
  for (const [name, content] of Object.entries(structure)) {
    const fullPath = path.join(basePath, name);
    if (typeof content === "object" && content !== null && !Array.isArray(content)) {
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
      createDirectoryStructure(fullPath, content);
    }
  }
}

services.forEach(serviceName => {
  const servicePath = path.join(__dirname, serviceName);
  if (!fs.existsSync(servicePath)) {
    fs.mkdirSync(servicePath, { recursive: true });
    createDirectoryStructure(servicePath, baseStructure);
    console.log(`✅ Created ${serviceName}`);
  }
});

console.log("✅ All services structure created!");

