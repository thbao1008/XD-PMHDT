#!/usr/bin/env node
/**
 * Script to check for dependency conflicts between root, frontend, and microservices
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootPath = __dirname;
const frontendPath = join(rootPath, "frontend");
const servicesPath = join(rootPath, "backend", "services");

function readPackageJson(path) {
  try {
    const content = readFileSync(path, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
}

function compareVersions(v1, v2) {
  // Simple version comparison - remove ^, ~, etc.
  const clean1 = v1.replace(/^[\^~]/, "");
  const clean2 = v2.replace(/^[\^~]/, "");
  return clean1 === clean2;
}

function findConflicts() {
  console.log("🔍 Checking for dependency conflicts...\n");

  const rootPkg = readPackageJson(join(rootPath, "package.json"));
  const frontendPkg = readPackageJson(join(frontendPath, "package.json"));
  
  const servicePkgs = [];
  
  function findPackageJson(dir, basePath = "") {
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        if (entry === "node_modules") continue;
        
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          findPackageJson(fullPath, join(basePath, entry));
        } else if (entry === "package.json") {
          const pkg = readPackageJson(fullPath);
          if (pkg) {
            servicePkgs.push({ path: join(basePath, entry), pkg });
          }
        }
      }
    } catch (err) {
      // Ignore errors
    }
  }
  
  findPackageJson(servicesPath);

  const conflicts = [];
  const duplicates = [];

  // Check root vs frontend
  if (rootPkg && frontendPkg) {
    const rootDeps = { ...rootPkg.dependencies, ...rootPkg.devDependencies };
    const frontendDeps = { ...frontendPkg.dependencies, ...frontendPkg.devDependencies };

    Object.keys(rootDeps).forEach(dep => {
      if (frontendDeps[dep]) {
        if (!compareVersions(rootDeps[dep], frontendDeps[dep])) {
          conflicts.push({
            type: "version-conflict",
            dep,
            root: rootDeps[dep],
            frontend: frontendDeps[dep],
            location: "root vs frontend"
          });
        } else {
          duplicates.push({
            dep,
            version: rootDeps[dep],
            location: "root and frontend"
          });
        }
      }
    });
  }

  // Check services vs root
  servicePkgs.forEach(({ path, pkg }) => {
    const serviceDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const rootDeps = { ...rootPkg?.dependencies, ...rootPkg?.devDependencies };

    Object.keys(serviceDeps).forEach(dep => {
      if (rootDeps?.[dep]) {
        if (!compareVersions(serviceDeps[dep], rootDeps[dep])) {
          conflicts.push({
            type: "version-conflict",
            dep,
            service: serviceDeps[dep],
            root: rootDeps[dep],
            location: `${path} vs root`
          });
        }
      }
    });
  });

  // Check services vs each other
  for (let i = 0; i < servicePkgs.length; i++) {
    for (let j = i + 1; j < servicePkgs.length; j++) {
      const deps1 = { ...servicePkgs[i].pkg.dependencies, ...servicePkgs[i].pkg.devDependencies };
      const deps2 = { ...servicePkgs[j].pkg.dependencies, ...servicePkgs[j].pkg.devDependencies };

      Object.keys(deps1).forEach(dep => {
        if (deps2[dep] && !compareVersions(deps1[dep], deps2[dep])) {
          conflicts.push({
            type: "version-conflict",
            dep,
            service1: deps1[dep],
            service2: deps2[dep],
            location: `${servicePkgs[i].path} vs ${servicePkgs[j].path}`
          });
        }
      });
    }
  }

  // Report
  console.log("📊 Results:\n");

  if (conflicts.length === 0 && duplicates.length === 0) {
    console.log("✅ No conflicts or duplicates found!\n");
    return;
  }

  if (conflicts.length > 0) {
    console.log("❌ Version Conflicts:\n");
    conflicts.forEach(conflict => {
      console.log(`   ${conflict.dep}:`);
      if (conflict.root && conflict.frontend) {
        console.log(`      Root: ${conflict.root}`);
        console.log(`      Frontend: ${conflict.frontend}`);
      } else if (conflict.service && conflict.root) {
        console.log(`      ${conflict.location.split(" vs ")[0]}: ${conflict.service}`);
        console.log(`      Root: ${conflict.root}`);
      } else if (conflict.service1 && conflict.service2) {
        console.log(`      ${conflict.location.split(" vs ")[0]}: ${conflict.service1}`);
        console.log(`      ${conflict.location.split(" vs ")[1]}: ${conflict.service2}`);
      }
      console.log();
    });
  }

  if (duplicates.length > 0) {
    console.log("⚠️  Duplicate Dependencies (same version, consider removing from root):\n");
    duplicates.forEach(dup => {
      console.log(`   ${dup.dep}@${dup.version} - ${dup.location}`);
    });
    console.log();
  }

  // Recommendations
  console.log("💡 Recommendations:\n");
  console.log("   1. Remove frontend dependencies from root package.json");
  console.log("   2. Keep only shared backend dependencies in root");
  console.log("   3. Each service should have its own dependencies\n");
}

findConflicts();

