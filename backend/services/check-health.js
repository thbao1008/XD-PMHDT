#!/usr/bin/env node
/**
 * Script to check health of all microservices
 * Usage: node check-health.js
 */

// Use native fetch (Node.js 18+) or node-fetch
let fetch;
(async () => {
  try {
    if (typeof globalThis.fetch !== "undefined") {
      fetch = globalThis.fetch;
    } else {
      const nodeFetch = await import("node-fetch");
      fetch = nodeFetch.default;
    }
  } catch (e) {
    console.error("Error loading fetch:", e);
    process.exit(1);
  }

const services = [
  { name: "API Gateway", url: "http://localhost:4000/health" },
  { name: "Notification Service", url: "http://localhost:4001/health" },
  { name: "Community Service", url: "http://localhost:4002/health" },
  { name: "Package Service", url: "http://localhost:4003/health" },
  { name: "Purchase Service", url: "http://localhost:4004/health" },
  { name: "User Service", url: "http://localhost:4005/health" },
  { name: "Mentor Service", url: "http://localhost:4006/health" },
  { name: "Learner Service", url: "http://localhost:4007/health" },
  { name: "Admin Service", url: "http://localhost:4008/health" },
  { name: "AI Service", url: "http://localhost:4010/health" },
  { name: "File Service", url: "http://localhost:4011/health" },
];

  async function checkHealth(service) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(service.url, {
        method: "GET",
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const data = await response.json();
      return { status: "ok", data };
    } catch (error) {
      if (error.name === "AbortError") {
        return { status: "timeout", error: "Request timeout" };
      }
      return { status: "error", error: error.message };
    }
  }

  async function checkAllServices() {
    console.log("🏥 Checking health of all microservices...\n");

    const results = await Promise.all(
      services.map(async (service) => {
        const result = await checkHealth(service);
        return { service, result };
      })
    );

    console.log("Results:\n");
    results.forEach(({ service, result }) => {
      // Đảm bảo URL được in đúng
      const url = service.url;
      if (result.status === "ok") {
        console.log(`✅ ${service.name}: ${url} - OK`);
      } else if (result.status === "timeout") {
        console.log(`⏱️  ${service.name}: ${url} - Timeout`);
      } else {
        const errorMsg = result.error || "Unknown error";
        console.log(`❌ ${service.name}: ${url} - ${errorMsg}`);
      }
    });

    const healthy = results.filter((r) => r.result.status === "ok").length;
    const total = results.length;
    const critical = ["API Gateway", "User Service"];

    console.log(`\n📊 Summary: ${healthy}/${total} services healthy`);
    
    // Kiểm tra các services quan trọng
    const criticalStatus = results.filter(({ service, result }) => 
      critical.includes(service.name) && result.status === "ok"
    );
    
    if (criticalStatus.length < critical.length) {
      console.log(`\n⚠️  Warning: Some critical services are not healthy!`);
      results.forEach(({ service, result }) => {
        if (critical.includes(service.name) && result.status !== "ok") {
          console.log(`   ❌ ${service.name} is not responding`);
        }
      });
    } else {
      console.log(`\n✅ All critical services (API Gateway, User Service) are healthy!`);
    }
  }

  checkAllServices().catch(console.error);
})();
