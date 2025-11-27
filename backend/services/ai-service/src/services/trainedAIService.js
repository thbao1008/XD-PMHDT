/**
 * Trained AI Service - Wrapper để gọi OpenRouter qua ai_models training
 * Tất cả AI calls sẽ đi qua training layer để có cường độ tư duy cao
 */

import * as aiService from "./aiService.js";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { findPythonExecutable } from "../utils/whisperxRunner.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get backend directory (go up from ai-service/src/services to backend)
// __dirname = backend/services/ai-service/src/services
// Go up 4 levels: services -> ai-service -> services -> backend
const backendDir = path.resolve(__dirname, "..", "..", "..", "..");

/**
 * Gọi Python trainer để tạo training data trước khi gọi OpenRouter
 * Sử dụng stdin để tránh lỗi ký tự đặc biệt trên Windows
 */
async function getTrainingDataFromPython(trainingType, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const trainerPath = path.resolve(backendDir, "ai_models", "comprehensiveAITrainer.py");
      
      // Kiểm tra xem file có tồn tại không
      if (!fs.existsSync(trainerPath)) {
        console.warn(`⚠️ comprehensiveAITrainer.py not found at ${trainerPath}, using fallback`);
        // Resolve với null để trigger fallback
        return resolve(null);
      }
      
      // Tạo data object để gửi qua stdin
      let stdinData = { training_type: trainingType };
      
      if (trainingType === 'prompt_generator') {
        stdinData = {
          training_type: 'prompt_generator',
          level: options.level || 2,
          used_topics: options.usedTopics || [],
          used_prompts: options.usedPrompts || [],
          topics_json: options.topicsJson || "[]",
          challenges_json: options.challengesJson || "[]",
          learner_id: options.learnerId || null,
          personalization_context: options.personalizationContext || null
        };
      } else if (trainingType === 'conversation_ai') {
        stdinData = {
          training_type: 'conversation_ai',
          topic: options.topic || null,
          history: options.history || []
        };
      } else if (trainingType === 'quick_analysis') {
        stdinData = {
          training_type: 'quick_analysis',
          transcript: options.transcript || "",
          expected: options.expected || null,
          level: options.level || 2
        };
      }
      
      // Tự động tìm Python executable (giống như whisperxRunner)
      const pythonCmd = findPythonExecutable();
      console.log(`[trainedAIService] Using Python command: ${pythonCmd}`);
      
      // Nếu pythonCmd có flag (như "py -3"), split ra
      const [pythonExec, ...pythonFlags] = pythonCmd.split(' ');
      const finalArgs = [...pythonFlags, trainerPath];
      
      // Spawn Python process với stdin và set UTF-8 encoding
      const pythonProcess = spawn(pythonExec, finalArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: process.platform === 'win32', // Windows cần shell để tìm py launcher
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8',
          PYTHONUTF8: '1'
        }
      });
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error("❌ Python trainer error:", stderr);
          reject(new Error(`Python trainer exited with code ${code}: ${stderr}`));
          return;
        }
        
        try {
          // Extract JSON from stdout (Python may output debug messages before JSON)
          // Find the first '{' and last '}' to extract the JSON object
          const firstBrace = stdout.indexOf('{');
          const lastBrace = stdout.lastIndexOf('}');
          
          if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
            throw new Error("No valid JSON found in Python output");
          }
          
          const jsonString = stdout.substring(firstBrace, lastBrace + 1);
          const result = JSON.parse(jsonString);
          resolve(result);
        } catch (err) {
          console.error("❌ Error parsing Python output:", err);
          console.error("Python stdout:", stdout);
          reject(new Error(`Failed to parse Python output: ${err.message}`));
        }
      });
      
      pythonProcess.on('error', (err) => {
        console.error("❌ Error spawning Python process:", err);
        reject(err);
      });
      
      // Gửi data qua stdin
      pythonProcess.stdin.write(JSON.stringify(stdinData));
      pythonProcess.stdin.end();
      
    } catch (err) {
      console.error("❌ Error calling Python trainer:", err);
      reject(err);
    }
  });
}

/**
 * Tạo random seed và unique identifier cho mỗi request
 */
function generateRandomSeed() {
  return Math.floor(Math.random() * 1000000) + Date.now();
}

/**
 * Tạo unique user message với randomization
 */
function createRandomizedUserMessage(trainingType, seed) {
  const timestamp = Date.now();
  const randomVariations = [
    `Generate a COMPLETELY NEW and UNIQUE topic and prompt. Use seed ${seed} and timestamp ${timestamp}. Return JSON: {"topic": "topic name", "description": "brief", "suggested_prompt": "sentence"}`,
    `Create a FRESH topic that is DIFFERENT from all previous ones. Random seed: ${seed}. Return JSON: {"topic": "topic name", "description": "brief", "suggested_prompt": "sentence"}`,
    `Generate a NEW topic with maximum creativity. Seed: ${seed}, Time: ${timestamp}. Return JSON: {"topic": "topic name", "description": "brief", "suggested_prompt": "sentence"}`,
    `Create a UNIQUE topic that hasn't been used before. Random: ${seed}. Return JSON: {"topic": "topic name", "description": "brief", "suggested_prompt": "sentence"}`
  ];
  
  // Chọn random variation dựa trên seed
  const variationIndex = seed % randomVariations.length;
  return randomVariations[variationIndex];
}

/**
 * Gọi OpenRouter với training data từ Python trainer
 * Đây là hàm chính để thay thế callOpenRouter trực tiếp
 * Với randomization để đảm bảo đa dạng
 */
export async function callTrainedAI(trainingType, options = {}, messages = null, aiOpts = {}) {
  try {
    // Tạo random seed cho mỗi request để đảm bảo đa dạng
    const randomSeed = generateRandomSeed();
    const timestamp = Date.now();
    
    // Lấy training data từ Python trainer
    const trainingData = await getTrainingDataFromPython(trainingType, options);
    
    // Nếu training fail, fallback về callOpenRouter trực tiếp
    if (!trainingData || !trainingData.system_prompt) {
      console.warn("⚠️ Training data not available, using direct OpenRouter call");
      if (messages) {
        return await aiService.callOpenRouter(messages, aiOpts);
      }
      throw new Error("No training data and no messages provided");
    }
    
    // Thêm randomization vào system prompt
    const randomizedSystemPrompt = `${trainingData.system_prompt}

RANDOMIZATION PARAMETERS (Critical for diversity):
- Random Seed: ${randomSeed}
- Timestamp: ${timestamp}
- Request ID: ${Math.random().toString(36).substring(7)}
- Use stochastic sampling with high creativity
- Ensure this topic is COMPLETELY DIFFERENT from any previous topics
- Vary sentence structure, vocabulary, and topic angle`;

    // Tạo messages từ training data
    const trainedMessages = [
      { role: 'system', content: randomizedSystemPrompt }
    ];
    
    // Thêm user messages nếu có
    if (messages && Array.isArray(messages)) {
      // Tìm user messages trong messages array
      const userMessages = messages.filter(m => m.role === 'user');
      trainedMessages.push(...userMessages);
    } else if (typeof messages === 'string') {
      trainedMessages.push({ role: 'user', content: messages });
    } else if (trainingType === 'prompt_generator') {
      // Tạo randomized user message
      const randomizedUserMessage = createRandomizedUserMessage(trainingType, randomSeed);
      trainedMessages.push({ 
        role: 'user', 
        content: randomizedUserMessage
      });
    } else if (trainingType === 'quick_analysis') {
      trainedMessages.push({ 
        role: 'user', 
        content: `Analyze now. Seed: ${randomSeed}. Return JSON only.` 
      });
    }
    
    // Tính toán sampling parameters để tăng đa dạng
    const baseTemperature = aiOpts.temperature || (trainingData.config?.temperature || 0.95);
    // Tăng temperature thêm một chút để đảm bảo đa dạng
    const enhancedTemperature = Math.min(1.2, baseTemperature + 0.1);
    
    // Gọi OpenRouter với trained messages và enhanced sampling
    let maxTokens = aiOpts.max_tokens || (trainingData.config?.max_tokens || (trainingType === 'quick_analysis' ? 500 : 250));
    
    try {
      const response = await aiService.callOpenRouter(
        trainedMessages,
        {
          model: aiOpts.model || 'openai/gpt-4o-mini',
          temperature: enhancedTemperature,
          max_tokens: maxTokens,
          top_p: 0.95, // Nucleus sampling để tăng đa dạng
          frequency_penalty: 0.5, // Penalty cho repetition
          presence_penalty: 0.5 // Penalty cho presence của từ đã dùng
        }
      );
      
      // Log để debug
      console.log(`🎲 Generated topic with seed: ${randomSeed}, temperature: ${enhancedTemperature}`);
      
      return response;
    } catch (err) {
      // Xử lý lỗi payment required (402) - tự động giảm max_tokens và retry
      if (err.status === 402 && err.code === 'PAYMENT_REQUIRED' && err.maxAffordableTokens) {
        console.warn(`⚠️ Payment required. Retrying with reduced max_tokens: ${err.maxAffordableTokens}`);
        
        // Retry với max_tokens giảm xuống (trừ 10 để đảm bảo an toàn)
        const reducedTokens = Math.max(50, err.maxAffordableTokens - 10);
        
        try {
          const retryResponse = await aiService.callOpenRouter(
            trainedMessages,
            {
              model: aiOpts.model || 'openai/gpt-4o-mini',
              temperature: enhancedTemperature,
              max_tokens: reducedTokens,
              top_p: 0.95,
              frequency_penalty: 0.5,
              presence_penalty: 0.5
            }
          );
          
          console.log(`✅ Retry successful with max_tokens: ${reducedTokens}`);
          return retryResponse;
        } catch (retryErr) {
          console.error("❌ Retry failed:", retryErr);
          // Nếu retry vẫn fail, fallback về direct call hoặc throw error
          if (messages) {
            try {
              return await aiService.callOpenRouter(messages, { ...aiOpts, max_tokens: reducedTokens });
            } catch (fallbackErr) {
              console.error("❌ Fallback also failed:", fallbackErr);
              throw err; // Throw original error
            }
          }
          throw err;
        }
      }
      
      // Xử lý các lỗi khác
      console.error("❌ Error in callTrainedAI:", err);
      // Fallback về direct call nếu có messages
      if (messages) {
        try {
          return await aiService.callOpenRouter(messages, aiOpts);
        } catch (fallbackErr) {
          throw err; // Throw original error nếu fallback cũng fail
        }
      }
      throw err;
    }
  } catch (err) {
    console.error("❌ Error in callTrainedAI (outer catch):", err);
    throw err;
  }
}

/**
 * Wrapper cho prompt generation với training
 */
export async function generatePromptWithTraining(level, usedTopics = [], usedPrompts = [], 
                                                 learnerId = null, sessionId = null,
                                                 topicsJson = "[]", challengesJson = "[]",
                                                 personalizationContext = null) {
  return await callTrainedAI('prompt_generator', {
    level,
    usedTopics,
    usedPrompts,
    learnerId,
    sessionId,
    topicsJson,
    challengesJson,
    personalizationContext
  }, null, {
    model: 'openai/gpt-4o-mini',
    temperature: 0.95,
    max_tokens: 250
  });
}

/**
 * Wrapper cho conversation AI với training
 */
export async function conversationAIWithTraining(topic = null, history = [], userMessage = null) {
  const messages = userMessage ? [{ role: 'user', content: userMessage }] : null;
  
  return await callTrainedAI('conversation_ai', {
    topic,
    history
  }, messages, {
    model: 'openai/gpt-4o-mini',
    temperature: 0.9,
    max_tokens: 300
  });
}

/**
 * Wrapper cho quick analysis với training
 */
export async function quickAnalysisWithTraining(transcript, expectedText = null, level = 2) {
  return await callTrainedAI('quick_analysis', {
    transcript,
    expected: expectedText,
    level
  }, null, {
    model: 'openai/gpt-4o-mini',
    temperature: 0.5,
    max_tokens: 200
  });
}

/**
 * Export callOpenRouter để backward compatibility
 * Nhưng khuyến khích sử dụng callTrainedAI
 */
export { callOpenRouter } from "./aiService.js";

