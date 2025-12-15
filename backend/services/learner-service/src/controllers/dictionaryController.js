// backend/src/controllers/dictionaryController.js
import pool from "../config/db.js";

/**
 * Lấy định nghĩa và cách sử dụng của từ (với cache)
 */
export async function getWordDefinition(req, res) {
  try {
    const { word } = req.params;
    const normalizedWord = word.toLowerCase().trim();

    if (!normalizedWord) {
      return res.status(400).json({ message: "Word is required" });
    }

    // Kiểm tra cache trong database trước
    try {
      const cacheResult = await pool.query(
        `SELECT definition_data, updated_at
         FROM dictionary_cache
         WHERE word = $1
         AND updated_at > NOW() - INTERVAL '30 days'`,
        [normalizedWord]
      );

      if (cacheResult.rows.length > 0) {
        const cached = cacheResult.rows[0].definition_data;
        // Parse JSON nếu là string, hoặc trả về trực tiếp nếu đã là object
        const result = typeof cached === 'string' ? JSON.parse(cached) : cached;
        return res.json(result);
      }
    } catch (cacheErr) {
      // Nếu bảng cache chưa tồn tại, bỏ qua và tiếp tục
      console.warn("Dictionary cache table may not exist, continuing without cache:", cacheErr.message);
    }

    // Dùng OpenRouter để lấy định nghĩa
    const prompt = `Provide a dictionary entry for the English word "${normalizedWord}".

IMPORTANT: Respond ONLY with valid JSON, no markdown code blocks, no explanations, just the JSON object.

{
  "word": "${normalizedWord}",
  "pronunciation": "<IPA phonetic transcription, e.g., həˈloʊ for 'hello'>",
  "definition": "<Vietnamese definition>",
  "usage": "<How to use this word in a sentence, in Vietnamese>",
  "example": "<Example sentence in English with Vietnamese translation>"
}`;

    const { callOpenRouter } = await import("../utils/aiServiceClient.js");
    const response = await callOpenRouter(
      [{ role: "user", content: prompt }],
      { model: "openai/gpt-4o-mini", temperature: 0.7 }
    );

    // AI Service returns AiESP response (có thể là JSON string hoặc plain text)
    let content = response.choices?.[0]?.message?.content || response.content || "{}";
    
    // Nếu content là string, thử parse JSON trước
    if (typeof content === 'string') {
    content = content.trim();
    
      // Thử parse trực tiếp nếu là JSON string
      try {
        const parsed = JSON.parse(content);
        if (typeof parsed === 'object') {
          return res.json(parsed);
        }
      } catch {
        // Không phải JSON, tiếp tục xử lý
      }
      
      // Loại bỏ markdown code block nếu có (```json ... ``` hoặc ``` ... ```)
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/;
    const codeBlockMatch = content.match(codeBlockRegex);
    if (codeBlockMatch && codeBlockMatch[1]) {
      content = codeBlockMatch[1].trim();
    } else if (content.includes("```")) {
      // Fallback: loại bỏ thủ công nếu regex không match
      const lines = content.split("\n");
      let startIdx = -1;
      let endIdx = -1;
      
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (trimmed.startsWith("```")) {
          if (startIdx === -1) {
            startIdx = i + 1;
          } else {
            endIdx = i;
            break;
          }
        }
      }
      
      if (startIdx !== -1) {
        if (endIdx !== -1) {
          content = lines.slice(startIdx, endIdx).join("\n").trim();
        } else {
          content = lines.slice(startIdx).join("\n").trim();
          }
        }
      }
    }
    
    // Tìm JSON object trong content (tìm từ { đầu tiên đến } cuối cùng cân bằng)
    let jsonStart = content.indexOf("{");
    if (jsonStart === -1) {
      // Nếu không tìm thấy JSON, tạo response mặc định từ AiESP response
      console.warn("⚠️ AiESP returned non-JSON response, creating default dictionary entry");
      return res.json({
        word: normalizedWord,
        pronunciation: "",
        definition: content || "Definition not available",
        usage: "",
        example: ""
      });
    }
    
    // Tìm } cuối cùng với balance braces
    let braceCount = 0;
    let jsonEnd = -1;
    for (let i = jsonStart; i < content.length; i++) {
      if (content[i] === "{") braceCount++;
      if (content[i] === "}") {
        braceCount--;
        if (braceCount === 0) {
          jsonEnd = i + 1;
          break;
        }
      }
    }
    
    if (jsonEnd === -1 || jsonEnd <= jsonStart) {
      // Fallback: tìm } cuối cùng
      jsonEnd = content.lastIndexOf("}") + 1;
      if (jsonEnd <= jsonStart) {
        throw new Error("Invalid JSON structure");
      }
    }
    
    content = content.substring(jsonStart, jsonEnd);
    
    // Parse JSON với error handling
    let result;
    try {
      result = JSON.parse(content);
    } catch (parseErr) {
      console.error("❌ JSON parse error. Content:", content);
      console.error("❌ Parse error:", parseErr.message);
      // Fallback: trả về default structure
      result = {
        word: normalizedWord,
        definition: "Không tìm thấy định nghĩa",
        usage: "Không có thông tin",
        example: "Không có ví dụ"
      };
    }

    // Lưu vào cache database (async, không đợi)
    pool.query(
      `INSERT INTO dictionary_cache (word, definition_data, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (word) DO UPDATE
       SET definition_data = EXCLUDED.definition_data,
           updated_at = NOW()`,
      [normalizedWord, JSON.stringify(result)]
    ).catch(err => {
      // Ignore cache errors, không ảnh hưởng response
      console.warn("Failed to save dictionary cache:", err.message);
    });

    res.json(result);
  } catch (err) {
    console.error("❌ getWordDefinition error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
}

