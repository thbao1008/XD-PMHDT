// AI Service Client - Helper to call AI Service via API Gateway
const API_GATEWAY_URL = `http://localhost:${process.env.API_GATEWAY_PORT || 4000}`;
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || `http://localhost:${process.env.AI_SERVICE_PORT || 4010}`;

/**
 * Call OpenRouter API (via AI Service)
 */
export async function callOpenRouter(messages, options = {}) {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/ai/call-openrouter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, options })
    });
    
    if (!response.ok) {
      throw new Error(`AI Service error: ${response.status}`);
    }
    
    return await response.json();
  } catch (err) {
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

