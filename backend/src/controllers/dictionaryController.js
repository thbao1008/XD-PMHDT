// backend/src/controllers/dictionaryController.js
import * as aiService from "../services/aiService.js";

/**
 * Lấy định nghĩa và cách sử dụng của từ
 */
export async function getWordDefinition(req, res) {
  try {
    const { word } = req.params;

    if (!word) {
      return res.status(400).json({ message: "Word is required" });
    }

    // Dùng AI để lấy định nghĩa
    const prompt = `Provide a dictionary entry for the English word "${word}".

IMPORTANT: Respond ONLY with valid JSON, no markdown code blocks, no explanations, just the JSON object.

{
  "word": "${word}",
  "pronunciation": "<IPA phonetic transcription, e.g., həˈloʊ for 'hello'>",
  "definition": "<Vietnamese definition>",
  "usage": "<How to use this word in a sentence, in Vietnamese>",
  "example": "<Example sentence in English with Vietnamese translation>"
}`;

    const response = await aiService.callOpenRouter(
      [{ role: "user", content: prompt }],
      { model: "openai/gpt-4o-mini", temperature: 0.7 }
    );

    let content = response.choices?.[0]?.message?.content || "{}";
    
    // Log raw content để debug
    console.log("📝 Raw AI response:", content.substring(0, 200));
    
    // Loại bỏ markdown code block nếu có (```json ... ``` hoặc ``` ... ```)
    content = content.trim();
    
    // Xử lý markdown code block với regex
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
    
    // Tìm JSON object trong content (tìm từ { đầu tiên đến } cuối cùng cân bằng)
    let jsonStart = content.indexOf("{");
    if (jsonStart === -1) {
      throw new Error("No JSON object found in response");
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
        word: word,
        definition: "Không tìm thấy định nghĩa",
        usage: "Không có thông tin",
        example: "Không có ví dụ"
      };
    }

    res.json(result);
  } catch (err) {
    console.error("❌ getWordDefinition error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
}

