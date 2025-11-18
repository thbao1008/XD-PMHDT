// backend/src/services/mentorAiService.js
import { callOpenRouter, safeParseJSON } from "./aiService.js";

/**
 * generateChallengeAI - create a challenge JSON using OpenRouter
 * params: { learner, topic, promptText, level }
 */
export async function generateChallengeAI({ learner, topic, promptText, level }) {
  const system = `You are an assistant that writes speaking challenges for language learners.
Output a single valid JSON object only with fields: title, description (HTML), type, level, hints (array), prompts (array of {question,sampleAnswer,followUps}).`;
  const user = `Learner: ${learner?.name || "Learner"}; level=${learner?.level || "beginner"}.
Topic: ${topic || promptText || "General"}.
Requested level: ${level || "medium"}.`;

  const data = await callOpenRouter([{ role: "system", content: system }, { role: "user", content: user }], { max_tokens: 900 });
  const text = data?.choices?.[0]?.message?.content || "";
  try {
    return JSON.parse(text);
  } catch (e) {
    // fallback: return a minimal challenge object with raw text in description
    return { title: "Challenge", description: text, type: "speaking", level: level || "medium", hints: [], prompts: [] };
  }
}

/**
 * editChallengeAI - improve challenge content
 * challengeContent: string or JSON-like content to improve
 */
export async function editChallengeAI(challengeContent) {
  const messages = [
    { role: "system", content: "You improve challenge content and return strict JSON." },
    { role: "user", content:
      `Improve this English learning challenge. 
       Return JSON: { "title": string, "description": string (HTML), "type": "speaking"|"writing"|"quiz", "level": "easy"|"medium"|"hard", "tags": string[], "issues": string[] }.
       "issues" lists any problems detected (too short, unclear, formatting issues). If none, return empty array.` },
    { role: "user", content: typeof challengeContent === "string" ? challengeContent : JSON.stringify(challengeContent) }
  ];

  const data = await callOpenRouter(messages, { max_tokens: 700, temperature: 0.4 });
  const text = data.choices?.[0]?.message?.content || "";
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error("AI returned non-JSON content for editChallengeAI");
  }
}

/**
 * chatWithAI - short HTML suggestion (used by mentorService.chatWithAI)
 */
export async function chatWithAI(message, context = "") {
  const messages = [
    { role: "system", content: "You return a short HTML snippet suggestion only. Do not include explanations." },
    { role: "user", content: `User request: ${message}\nContext: ${context}\nReturn only HTML.` }
  ];

  const data = await callOpenRouter(messages, { max_tokens: 400, temperature: 0.6 });
  const html = data.choices?.[0]?.message?.content || "";
  return html;
}
