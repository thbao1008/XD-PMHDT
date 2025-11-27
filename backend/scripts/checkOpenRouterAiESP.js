/**
 * Script kiểm tra OpenRouter và AiESP status
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env
const envPath = path.resolve(__dirname, "..", ".env");
dotenv.config({ path: envPath });

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || "http://localhost:4000";
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

console.log("🔍 Checking OpenRouter and AiESP Status...\n");

// 1. Kiểm tra OpenRouter API Key
console.log("1️⃣ OpenRouter API Key:");
if (OPENROUTER_KEY) {
  console.log(`   ✅ Key exists: ${OPENROUTER_KEY.substring(0, 10)}...${OPENROUTER_KEY.substring(OPENROUTER_KEY.length - 4)}`);
  console.log(`   📏 Key length: ${OPENROUTER_KEY.length} characters`);
} else {
  console.log("   ❌ OPENROUTER_API_KEY not found in .env");
  process.exit(1);
}

// 2. Test OpenRouter connection
console.log("\n2️⃣ Testing OpenRouter Connection:");
try {
  const fetchFn = typeof globalThis.fetch === "function" 
    ? globalThis.fetch 
    : (await import("node-fetch")).default;
  
  const testResponse = await fetchFn("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_KEY}`
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: "Say hello" }],
      max_tokens: 10
    })
  });
  
  if (testResponse.ok) {
    const data = await testResponse.json();
    console.log("   ✅ OpenRouter connection successful");
    console.log(`   📝 Response: ${data.choices?.[0]?.message?.content || "No content"}`);
  } else {
    const errorText = await testResponse.text();
    console.log(`   ❌ OpenRouter error (${testResponse.status}): ${errorText.substring(0, 200)}`);
    
    if (testResponse.status === 402) {
      const errorMatch = errorText.match(/can only afford (\d+)/i);
      if (errorMatch) {
        console.log(`   ⚠️  Max affordable tokens: ${errorMatch[1]}`);
        console.log(`   💡 Suggestion: Reduce max_tokens to ${parseInt(errorMatch[1]) - 10} or add credits`);
      }
    }
  }
} catch (err) {
  console.log(`   ❌ OpenRouter test failed: ${err.message}`);
}

// 3. Kiểm tra AiESP Status qua API Gateway
console.log("\n3️⃣ Checking AiESP Status:");
try {
  const fetchFn = typeof globalThis.fetch === "function" 
    ? globalThis.fetch 
    : (await import("node-fetch")).default;
  
  // Tạo test token (hoặc sử dụng token thật nếu có)
  const testToken = process.env.TEST_JWT_TOKEN || "test-token";
  
  const aiESPResponse = await fetchFn(`${API_GATEWAY_URL}/api/ai/aiesp/status`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${testToken}`
    }
  });
  
  if (aiESPResponse.ok) {
    const data = await aiESPResponse.json();
    console.log("   ✅ AiESP status retrieved");
    console.log("   📊 Status:", JSON.stringify(data, null, 2));
  } else {
    const errorText = await aiESPResponse.text();
    console.log(`   ⚠️  AiESP status check failed (${aiESPResponse.status}): ${errorText.substring(0, 200)}`);
    console.log("   💡 Note: This might require a valid JWT token");
  }
} catch (err) {
  console.log(`   ⚠️  AiESP check failed: ${err.message}`);
  console.log("   💡 Make sure API Gateway is running");
}

// 4. Summary
console.log("\n📋 Summary:");
console.log("   - OpenRouter: Check status above");
console.log("   - AiESP: Check status above");
console.log("   - If OpenRouter shows 402 error, reduce max_tokens in requests");
console.log("   - If AiESP is not ready, it will fallback to OpenRouter");

