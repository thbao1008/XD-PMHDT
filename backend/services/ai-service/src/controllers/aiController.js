// AI Controller
import { autoDetectTopics } from "../services/learnerAiService.js";

/**
 * POST /api/ai/auto-topics
 * body: { transcripts: string[] }
 */
export async function detectTopics(req, res) {
  try {
    const { transcripts } = req.body; // transcripts: array of English sentences
    if (!Array.isArray(transcripts) || transcripts.length === 0) {
      return res.status(400).json({ message: "transcripts must be a non-empty array" });
    }

    const result = await autoDetectTopics(transcripts);
    res.json({ topics: result.topics, assignments: result.assignments, probs: result.probs });
  } catch (err) {
    console.error("detectTopics error - ai-service aiController.js:18", err);
    res.status(500).json({ message: "Server error" });
  }
}

