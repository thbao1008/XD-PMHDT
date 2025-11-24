/**
 * AI Evaluation Controller
 */

import * as aiEvaluationService from "../services/aiEvaluationService.js";

/**
 * Generate system evaluation and suggestions
 */
export async function getSystemEvaluation(req, res) {
  try {
    const evaluation = await aiEvaluationService.generateSystemEvaluation();
    res.json(evaluation);
  } catch (err) {
    console.error("❌ Error in getSystemEvaluation:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message || "Server error" 
    });
  }
}

