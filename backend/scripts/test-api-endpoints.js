// Script to test API endpoints and database connectivity
import axios from "axios";

const BASE_URL = process.env.API_URL || "http://localhost:4000";

async function testEndpoints() {
  console.log("🧪 Testing API Endpoints...\n");
  console.log(`Base URL: ${BASE_URL}\n`);

  const tests = [
    {
      name: "Health Check",
      method: "GET",
      url: `${BASE_URL}/health`,
      expectedStatus: 200
    },
    {
      name: "Get Packages (Public)",
      method: "GET",
      url: `${BASE_URL}/api/packages/public`,
      expectedStatus: 200
    },
    {
      name: "Login (Admin)",
      method: "POST",
      url: `${BASE_URL}/api/auth/login`,
      data: {
        identifier: "admin@gmail.com",
        password: "aesp"
      },
      expectedStatus: 200
    }
  ];

  for (const test of tests) {
    try {
      console.log(`📋 Testing: ${test.name}`);
      
      const config = {
        method: test.method,
        url: test.url,
        timeout: 5000
      };
      
      if (test.data) {
        config.data = test.data;
        config.headers = { "Content-Type": "application/json" };
      }

      const response = await axios(config);
      
      if (response.status === test.expectedStatus) {
        console.log(`  ✅ Status: ${response.status} (Expected: ${test.expectedStatus})`);
        if (test.name === "Get Packages") {
          console.log(`  📦 Packages: ${response.data?.length || 0} items`);
        }
        if (test.name === "Login") {
          console.log(`  🔐 Token: ${response.data?.token ? "Received" : "Missing"}`);
          console.log(`  👤 User: ${response.data?.user?.email || "N/A"}`);
        }
      } else {
        console.log(`  ⚠️  Status: ${response.status} (Expected: ${test.expectedStatus})`);
      }
    } catch (err) {
      if (err.response) {
        console.log(`  ❌ Status: ${err.response.status}`);
        console.log(`  📝 Message: ${err.response.data?.message || err.response.data?.error || "Unknown error"}`);
      } else if (err.request) {
        console.log(`  ❌ No response from server`);
        console.log(`  📝 Error: ${err.message}`);
      } else {
        console.log(`  ❌ Error: ${err.message}`);
      }
    }
    console.log("");
  }

  console.log("✅ API testing completed!");
}

testEndpoints().catch(console.error);

