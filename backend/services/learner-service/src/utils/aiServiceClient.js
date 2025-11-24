// AI Service Client - Helper to call AI Service via API Gateway
const API_GATEWAY_URL = `http://localhost:${process.env.API_GATEWAY_PORT || 4000}`;
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || `http://localhost:${process.env.AI_SERVICE_PORT || 4010}`;

/**
 * Call OpenRouter API (via AI Service, with fallback to direct call)
 */
export async function callOpenRouter(messages, options = {}) {
  // Thử gọi qua AI Service trước
  try {
    // Tạo AbortController cho timeout (tương thích với mọi Node.js version)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
    
    const response = await fetch(`${AI_SERVICE_URL}/api/ai/call-openrouter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, options }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      return await response.json();
    }
    
    // Nếu 404 hoặc service không khả dụng, thử fallback
    if (response.status === 404 || response.status >= 500) {
      console.warn(`⚠️ AI Service unavailable (${response.status}), trying direct OpenRouter call...`);
      throw new Error(`AI Service error: ${response.status}`);
    }
    
    throw new Error(`AI Service error: ${response.status}`);
  } catch (err) {
    // Fallback: Gọi trực tiếp OpenRouter nếu có API key
    if (process.env.OPENROUTER_API_KEY) {
      try {
        console.log("🔄 Falling back to direct OpenRouter API call...");
        const OR_BASE = "https://openrouter.ai/api/v1";
        const fetchFn = typeof globalThis.fetch === "function" 
          ? globalThis.fetch 
          : (await import("node-fetch")).default;
        
        const model = options.model || "openai/gpt-4o-mini";
        const body = {
          model: model,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens ?? 800
        };

        // Thêm timeout cho direct call
        const fetchController = new AbortController();
        const fetchTimeoutId = setTimeout(() => fetchController.abort(), 30000);
        
        const res = await fetchFn(`${OR_BASE}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
          },
          body: JSON.stringify(body),
          signal: fetchController.signal
        });
        
        clearTimeout(fetchTimeoutId);

        if (!res.ok) {
          const txt = await res.text().catch(() => "<no body>");
          throw new Error(`OpenRouter API error: ${res.status} - ${txt}`);
        }

        const data = await res.json();
        console.log("✅ Direct OpenRouter call successful");
        return data;
      } catch (fallbackErr) {
        console.error("❌ Direct OpenRouter fallback also failed:", fallbackErr.message);
        throw err; // Throw original error
      }
    }
    
    console.error("❌ Error calling AI Service:", err);
    throw err;
  }
}

/**
 * Transcribe audio using WhisperX (via AI Service)
 */
export async function transcribeWithWhisperX(audioFilePath, options = {}) {
  try {
    // Note: This would need to be implemented as a file upload endpoint in AI Service
    // For now, we'll use the local whisperxRunner
    const { runWhisperX } = await import("./whisperxRunner.js");
    return await runWhisperX(audioFilePath, options);
  } catch (err) {
    console.error("❌ Error transcribing audio:", err);
    throw err;
  }
}

/**
 * Call Trained AI (via AI Service)
 */
export async function callTrainedAI(trainingType, options = {}, messages = null, aiOptions = {}) {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/ai/trained/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trainingType, options, messages, aiOptions })
    });
    
    if (!response.ok) {
      throw new Error(`AI Service error: ${response.status}`);
    }
    
    return await response.json();
  } catch (err) {
    console.error("❌ Error calling Trained AI:", err);
    throw err;
  }
}

/**
 * Analyze learner transcript (via AI Service through API Gateway)
 */
export async function analyzeLearnerTranscript(transcript, options = {}) {
  try {
    // Gọi qua API Gateway thay vì trực tiếp đến AI Service
    const response = await fetch(`${API_GATEWAY_URL}/api/ai/learner/analyze-transcript`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, options })
    });
    
    if (!response.ok) {
      throw new Error(`AI Service error: ${response.status}`);
    }
    
    return await response.json();
  } catch (err) {
    console.error("❌ Error analyzing learner transcript:", err);
    throw err;
  }
}

