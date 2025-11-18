// backend/src/controllers/mentorController.js
import * as mentorService from "../services/mentorService.js";
import * as mentorAiService from "../services/mentorAiService.js";

/* ========== Mentor CRUD ========== */

export async function createMentor(req, res) {
  try {
    const result = await mentorService.createMentor(req.body);
    res.status(201).json({ message: "Mentor created", ...result });
  } catch (err) {
    console.error("createMentor error - mentorController.js:12", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getAllMentors(req, res) {
  try {
    const mentors = await mentorService.getAllMentors();
    res.json({ mentors });
  } catch (err) {
    console.error("getAllMentors error - mentorController.js:22", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getMentorById(req, res) {
  try {
    const mentor = await mentorService.getMentorById(req.params.id);
    if (!mentor) return res.status(404).json({ message: "Mentor not found" });
    res.json({ mentor });
  } catch (err) {
    console.error("getMentorById error - mentorController.js:33", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function updateMentor(req, res) {
  try {
    await mentorService.updateMentor(req.params.id, req.body);
    res.json({ message: "Mentor updated" });
  } catch (err) {
    console.error("updateMentor error - mentorController.js:43", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function removeMentor(req, res) {
  try {
    await mentorService.removeMentor(req.params.id);
    res.json({ message: "Mentor deleted" });
  } catch (err) {
    console.error("removeMentor error - mentorController.js:53", err);
    res.status(500).json({ message: "Server error" });
  }
}

/* ========== Learners ========== */

export async function getLearnersByMentor(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "Mentor ID không hợp lệ" });
    }
    const learners = await mentorService.getLearnersByMentor(id);
    res.json({ learners });
  } catch (err) {
    console.error("getLearnersByMentor error - mentorController.js:69", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getMentorByUserId(req, res) {
  try {
    const userId = req.params.userId;
    if (!userId) return res.status(400).json({ message: "Missing userId" });

    const mentor = await mentorService.getMentorByUserId(userId);
    if (!mentor) return res.status(404).json({ message: "Mentor not found for this userId" });
    res.json({ mentor_id: mentor.mentor_id, ...mentor });
  } catch (err) {
    console.error("getMentorByUserId error - mentorController.js:83", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function updateLearnerNote(req, res) {
  try {
    const learner = await mentorService.updateLearnerNote(req.params.learnerId, req.body.note);
    if (!learner) return res.status(404).json({ message: "Learner not found" });
    res.json({ learner });
  } catch (err) {
    console.error("updateLearnerNote error - mentorController.js:94", err);
    res.status(500).json({ message: "Server error" });
  }
}

/* ========== Sessions ========== */

export async function getSessions(req, res) {
  try {
    const sessions = await mentorService.getSessions(req.params.id);
    res.json({ sessions });
  } catch (err) {
    console.error("getSessions error - mentorController.js:106", err);
    res.status(500).json({ message: err.message });
  }
}

export async function addSessionController(req, res) {
  try {
    const sessions = await mentorService.addSession(req.params.id, req.body);
    res.json({ sessions });
  } catch (err) {
    console.error("addSessionController error - mentorController.js:116", err);
    res.status(400).json({ message: err.message });
  }
}

export async function updateSessionController(req, res) {
  try {
    const sessions = await mentorService.updateSession(req.params.id, req.params.sessionId, req.body);
    res.json({ sessions });
  } catch (err) {
    console.error("updateSessionController error - mentorController.js:126", err);
    res.status(400).json({ message: err.message });
  }
}

export async function deleteSessionController(req, res) {
  try {
    const sessions = await mentorService.deleteSession(req.params.id, req.params.sessionId);
    res.json({ sessions });
  } catch (err) {
    console.error("deleteSessionController error - mentorController.js:136", err);
    res.status(400).json({ message: err.message });
  }
}

export async function addSessionsBatchController(req, res) {
  try {
    const sessions = await mentorService.addSessionsBatch(req.params.id, req.body);
    res.json({ sessions });
  } catch (err) {
    console.error("addSessionsBatchController error - mentorController.js:146", err);
    res.status(400).json({ message: err.message });
  }
}

/* ========== Resources ========== */

export async function getResources(req, res) {
  try {
    const resources = await mentorService.getResourcesByMentor(req.params.id);
    res.json({ resources });
  } catch (err) {
    console.error("getResources error - mentorController.js:158", err);
    res.status(500).json({ message: err.message });
  }
}

export async function createResource(req, res) {
  try {
    const resource = await mentorService.createResource({
      mentor_id: req.params.id,
      ...req.body
    });
    res.json({ resource });
  } catch (err) {
    console.error("createResource error - mentorController.js:171", err);
    res.status(500).json({ message: err.message });
  }
}

export async function updateResource(req, res) {
  try {
    const resource = await mentorService.updateResource(req.params.id, req.body);
    res.json({ resource });
  } catch (err) {
    console.error("updateResource error - mentorController.js:181", err);
    res.status(500).json({ message: err.message });
  }
}

export async function deleteResource(req, res) {
  try {
    await mentorService.deleteResource(req.params.id);
    res.json({ message: "Resource deleted" });
  } catch (err) {
    console.error("deleteResource error - mentorController.js:191", err);
    res.status(500).json({ message: err.message });
  }
}

/* ========== Report ========== */

export async function mentorCreateReport(req, res) {
  try {
    const report = await mentorService.mentorCreateReport(req.body);
    res.json({ report });
  } catch (err) {
    console.error("mentorCreateReport error - mentorController.js:203", err);
    if (err.code === "23505") {
      return res.status(400).json({ message: "Bạn đã report học viên này rồi" });
    }
    res.status(500).json({ message: "Server error" });
  }
}

/* ========== Topics & Challenges ========== */

export async function getTopicsByMentor(req, res) {
  const { id } = req.params;
  try {
    const mentorId = parseInt(id);
    if (isNaN(mentorId)) {
      return res.status(400).json({ message: "Mentor ID không hợp lệ" });
    }
    const topics = await mentorService.getTopicsByMentor(mentorId);
    res.json({ topics });
  } catch (err) {
    console.error("getTopicsByMentor error - mentorController.js:223", err);
    res.status(500).json({ message: "Không thể lấy topics" });
  }
}

export async function createTopic(req, res) {
  const { id } = req.params;
  const { title, description, level } = req.body;
  try {
    const mentorId = parseInt(id);
    if (isNaN(mentorId)) {
      return res.status(400).json({ message: "Mentor ID không hợp lệ" });
    }
    const topic = await mentorService.createTopic(mentorId, title, description, level);
    res.json({ topic });
  } catch (err) {
    console.error("createTopic error - mentorController.js:239", err);
    res.status(500).json({ message: "Không thể tạo topic" });
  }
}

export async function getChallengesByTopic(req, res) {
  const { topicId } = req.params;
  try {
    const tid = parseInt(topicId);
    if (isNaN(tid)) {
      return res.status(400).json({ message: "Topic ID không hợp lệ" });
    }
    const challenges = await mentorService.getChallengesByTopic(tid);
    res.json({ challenges });
  } catch (err) {
    console.error("getChallengesByTopic error - mentorController.js:254", err);
    res.status(500).json({ message: "Không thể lấy challenges" });
  }
}

export async function createChallenge(req, res) {
  const { topicId } = req.params;
  const { title, description, type, level, created_by } = req.body;
  try {
    const tid = parseInt(topicId);
    if (isNaN(tid)) {
      return res.status(400).json({ message: "Topic ID không hợp lệ" });
    }
    const challenge = await mentorService.createChallenge(tid, title, description, type, level, created_by);
    res.json({ challenge });
  } catch (err) {
    console.error("createChallenge error - mentorController.js:270", err);
    res.status(500).json({ message: "Không thể tạo challenge" });
  }
}

export async function deleteTopic(req, res) {
  try {
    const topicId = req.params.topicId;
    const deleted = await mentorService.deleteTopic(topicId);
    if (!deleted) {
      return res.status(404).json({ message: "Topic not found" });
    }
    res.json({ message: "Topic deleted successfully" });
  } catch (err) {
    console.error("deleteTopic error - mentorController.js:284", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function deleteChallenge(req, res, next) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Thiếu id challenge" });
    }
    const deleted = await mentorService.deleteChallenge(id);
    if (!deleted) {
      return res.status(404).json({ error: "Challenge không tồn tại" });
    }
    return res.status(200).json({ ok: true, deletedId: Number(id) });
  } catch (err) {
    console.error("deleteChallenge error - mentorController.js:301", err);
    next(err);
  }
}

/* ========== AI endpoints ========== */

export async function createChallengeAI(req, res) {
  try {
    const { topicId } = req.params;
    const { prompt, level, learner } = req.body || {};
    const saved = await mentorService.createChallengeAI(topicId, prompt, level);
    return res.json({ challenge: saved });
  } catch (err) {
    console.error("createChallengeAI error - mentorController.js:315", err);
    return res.status(500).json({ message: "AI tạo challenge thất bại", error: err.message });
  }
}

export async function editChallengeAI(req, res) {
  try {
    const { id } = req.params;
    const { content } = req.body;
    if (!id) return res.status(400).json({ message: "Thiếu id challenge" });
    const result = await mentorService.editChallengeAI(id, content);

    if (result?.issues && result.issues.length > 0) {
      return res.json({ challenge: result.challenge, issues: result.issues });
    }

    return res.json({ challenge: result.challenge });
  } catch (err) {
    console.error("editChallengeAI error - mentorController.js:333", err);
    return res.status(500).json({ message: "AI cải thiện thất bại", error: err.message });
  }
}

export async function chatWithAI(req, res) {
  try {
    const { message, context } = req.body || {};
    const suggestion = await mentorService.chatWithAI(message, context);
    return res.json({ suggestion });
  } catch (err) {
    console.error("chatWithAI error - mentorController.js:344", err);
    return res.status(500).json({ message: "AI chat thất bại", error: err.message });
  }
}

export async function updateChallenge(req, res) {
  try {
    const { id } = req.params;
    const { title, description, type, level } = req.body;

    if (!id) return res.status(400).json({ message: "Thiếu id challenge" });

    const updated = await mentorService.updateChallenge(id, { title, description, type, level });
    return res.json({ challenge: updated });
  } catch (err) {
    console.error("updateChallenge error - mentorController.js:359", err);
    return res.status(500).json({ message: "Không thể cập nhật challenge", error: err.message });
  }
}

export async function improveChallengeDraft(req, res) {
  try {
    const { content } = req.body || {};
    if (!content) return res.status(400).json({ message: "Thiếu content để AI cải thiện" });

    const aiResult = await mentorAiService.editChallengeAI(content);
    const issues = aiResult?.issues || [];
    return res.json({ challenge: aiResult, issues });
  } catch (err) {
    console.error("improveChallengeDraft error - mentorController.js:373", err);
    return res.status(500).json({ message: "AI cải thiện thất bại", error: err.message });
  }
}

/* ========== Submissions & Reviews ========== */

/**
 * GET /api/mentor/:mentorId/submissions/:id
 * Returns submission detail only if learner assigned to mentor
 */
export async function getSubmission(req, res) {
  try {
    const submissionId = req.params.id;
    const mentorId = req.params.mentorId;
    if (!mentorId) return res.status(400).json({ error: "Missing mentorId in path" });

    const result = await mentorService.getSubmissionForMentor(submissionId, mentorId);
    if (!result) return res.status(404).json({ error: "Submission not found" });
    if (!result.allowed) return res.status(403).json({ error: "Forbidden: learner not assigned to this mentor" });

    // If mentor_review.audio_url exists and is relative path, convert to full play URL
    const base = process.env.BASE_URL || `http://localhost:${process.env.PORT || 4002}`;
    if (result.submission?.mentor_review?.audio_url) {
      const audioUrl = result.submission.mentor_review.audio_url;
      result.submission.mentor_audio_play_url = /^https?:\/\//i.test(audioUrl) ? audioUrl : `${base}${audioUrl}`;
    } else {
      result.submission.mentor_audio_play_url = null;
    }

    return res.json({ submission: result.submission, challenge: result.challenge });
  } catch (err) {
    console.error("mentorController.getSubmission error - mentorController.js:405", err);
    return res.status(500).json({ error: "Server error" });
  }
}

/**
 * GET /api/mentor/:mentorId/submissions
 */
export async function listSubmissions(req, res) {
  try {
    const mentorId = req.params.mentorId;
    if (!mentorId) return res.status(400).json({ error: "Missing mentorId in path" });

    const limit = Math.min(200, Number(req.query.limit) || 50);
    const offset = Number(req.query.offset) || 0;
    const rows = await mentorService.listSubmissionsForMentor(mentorId, { limit, offset });
    return res.json({ submissions: rows });
  } catch (err) {
    console.error("mentorController.listSubmissions error - mentorController.js:423", err);
    return res.status(500).json({ error: "Server error" });
  }
}

/**
 * POST /api/mentor/:mentorId/submissions/:id/review
 * Accepts body: { final_score, feedback, pronunciation_score, fluency_score, audio_url }
 */
export async function postReview(req, res) {
  try {
    const submissionId = req.params.id;
    const mentorId = req.params.mentorId;
    if (!mentorId) return res.status(400).json({ error: "Missing mentorId in path" });

    const { final_score, feedback, pronunciation_score, fluency_score, audio_url } = req.body;

    // Basic validation for audio_url: allow relative /uploads/... or same-host absolute URL
    function isValidAudioUrl(u) {
      if (!u) return true;
      try {
        const parsed = new URL(u);
        const baseHost = (process.env.BASE_URL && new URL(process.env.BASE_URL).hostname) || `localhost`;
        return parsed.pathname.startsWith("/uploads/") && parsed.hostname === baseHost;
      } catch (e) {
        // allow relative path like "/uploads/..."
        return typeof u === "string" && u.startsWith("/uploads/");
      }
    }
    if (audio_url && !isValidAudioUrl(audio_url)) {
      return res.status(400).json({ error: "Invalid audio_url" });
    }

    const payload = {
      final_score,
      feedback,
      pronunciation_score,
      fluency_score,
      audio_url
    };

    const result = await mentorService.saveMentorReview(submissionId, mentorId, payload);
    if (!result.ok) return res.status(result.status || 400).json({ error: result.message || "Cannot save review" });

    return res.json({ success: true, review: result.review });
  } catch (err) {
    console.error("mentorController.postReview error - mentorController.js:469", err);
    return res.status(500).json({ error: "Server error" });
  }
}

/**
 * GET /api/mentor/:mentorId/reviews
 */
export async function listReviews(req, res) {
  try {
    const mentorId = req.params.mentorId;
    if (!mentorId) return res.status(400).json({ error: "Missing mentorId in path" });

    const limit = Math.min(200, Number(req.query.limit) || 50);
    const offset = Number(req.query.offset) || 0;
    const rows = await mentorService.listReviewsByMentor(mentorId, { limit, offset });
    return res.json({ reviews: rows });
  } catch (err) {
    console.error("mentorController.listReviews error - mentorController.js:487", err);
    return res.status(500).json({ error: "Server error" });
  }
}
