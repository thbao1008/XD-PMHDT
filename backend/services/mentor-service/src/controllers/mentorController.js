// Mentor Controller
import * as mentorService from "../services/mentorService.js";
import * as mentorAiService from "../services/mentorAiService.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

function getProjectRoot() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  // Go up 3 levels from current file: controllers -> src -> mentor-service -> services -> backend
  return path.resolve(__dirname, "..", "..", "..");
}

/* ========== Mentor CRUD ========== */

export async function createMentor(req, res) {
  try {
    const result = await mentorService.createMentor(req.body);
    res.status(201).json({ message: "Mentor created", ...result });
  } catch (err) {
    console.error("createMentor error - mentor-service mentorController.js:12", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getAllMentors(req, res) {
  try {
    const mentors = await mentorService.getAllMentors();
    res.json({ mentors });
  } catch (err) {
    console.error("getAllMentors error - mentor-service mentorController.js:22", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getMentorById(req, res) {
  try {
    const mentor = await mentorService.getMentorById(req.params.id);
    if (!mentor) return res.status(404).json({ message: "Mentor not found" });
    res.json({ mentor });
  } catch (err) {
    console.error("getMentorById error - mentor-service mentorController.js:33", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function updateMentor(req, res) {
  try {
    await mentorService.updateMentor(req.params.id, req.body);
    res.json({ message: "Mentor updated" });
  } catch (err) {
    console.error("updateMentor error - mentor-service mentorController.js:43", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function removeMentor(req, res) {
  try {
    await mentorService.removeMentor(req.params.id);
    res.json({ message: "Mentor deleted" });
  } catch (err) {
    console.error("removeMentor error - mentor-service mentorController.js:53", err);
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
    console.error("getLearnersByMentor error - mentor-service mentorController.js:69", err);
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
    console.error("getMentorByUserId error - mentor-service mentorController.js:83", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function updateLearnerNote(req, res) {
  try {
    const learner = await mentorService.updateLearnerNote(req.params.learnerId, req.body.note);
    if (!learner) return res.status(404).json({ message: "Learner not found" });
    res.json({ learner });
  } catch (err) {
    console.error("updateLearnerNote error - mentor-service mentorController.js:94", err);
    res.status(500).json({ message: "Server error" });
  }
}

/* ========== Resources ========== */

export async function getResources(req, res) {
  try {
    const resources = await mentorService.getResourcesByMentor(req.params.id);
    // Format file_url to absolute URL (giống code cũ trong src)
    // Sử dụng x-forwarded-host và x-forwarded-proto từ API Gateway
    const protocol = req.get("x-forwarded-proto") || req.protocol || "http";
    const host = req.get("x-forwarded-host") || req.get("host") || "localhost:4000";
    const baseUrl = `${protocol}://${host}`;
    const formatted = resources.map(r => ({
      ...r,
      file_url: r.file_url?.startsWith("/") ? `${baseUrl}${r.file_url}` : r.file_url
    }));
    res.json({ resources: formatted });
  } catch (err) {
    console.error("getResources error - mentor-service mentorController.js:112", err);
    res.status(500).json({ message: err.message });
  }
}

export async function getPublishedResources(req, res) {
  try {
    const resources = await mentorService.getResourcesByMentor(req.params.id, false);
    // Format file_url to absolute URL (giống code cũ trong src)
    // Sử dụng x-forwarded-host và x-forwarded-proto từ API Gateway
    const protocol = req.get("x-forwarded-proto") || req.protocol || "http";
    const host = req.get("x-forwarded-host") || req.get("host") || "localhost:4000";
    const baseUrl = `${protocol}://${host}`;
    const formatted = resources.map(r => ({
      ...r,
      file_url: r.file_url?.startsWith("/") ? `${baseUrl}${r.file_url}` : r.file_url
    }));
    res.json({ resources: formatted });
  } catch (err) {
    console.error("getPublishedResources error - mentor-service mentorController.js", err);
    res.status(500).json({ message: err.message });
  }
}

export async function createResource(req, res) {
  try {
    console.log(`[createResource] Request received: mentorId=${req.params.id}, hasFile=${!!req.file}, fileField=${req.file?.fieldname}, filename=${req.file?.filename}`);
    
    let file_url = req.body.file_url;
    if (req.file) {
      // Verify file was saved
      const backendDir = getProjectRoot();
      const uploadsDir = path.resolve(backendDir, "uploads");
      const filePath = path.join(uploadsDir, req.file.filename);
      
      console.log(`[createResource] Checking file: path=${filePath}, exists=${fs.existsSync(filePath)}`);
      
      if (!fs.existsSync(filePath)) {
        console.error(`[createResource] File was not saved! Path: ${filePath}`);
        console.error(`[createResource] req.file:`, JSON.stringify({
          filename: req.file.filename,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: req.file.path
        }, null, 2));
        return res.status(500).json({ error: "File upload failed - file not saved", path: filePath });
      }
      
      console.log(`[createResource] File uploaded successfully: ${req.file.filename}, path: ${filePath}, size: ${fs.statSync(filePath).size} bytes`);
      file_url = `/uploads/${req.file.filename}`;
    } else {
      console.log(`[createResource] No file in request, using existing file_url: ${file_url}`);
    }

    const resource = await mentorService.createResource({
      mentor_id: req.params.id,
      title: req.body.title,
      description: req.body.description,
      type: req.body.type,
      file_url: file_url,
      is_published: req.body.is_published !== undefined ? req.body.is_published === 'true' || req.body.is_published === true : true
    });

    // Format file_url to absolute URL (giống code cũ trong src)
    // Sử dụng x-forwarded-host và x-forwarded-proto từ API Gateway
    const protocol = req.get("x-forwarded-proto") || req.protocol || "http";
    const host = req.get("x-forwarded-host") || req.get("host") || "localhost:4000";
    const baseUrl = `${protocol}://${host}`;
    const formatted = {
      ...resource,
      file_url: resource.file_url?.startsWith("/") ? `${baseUrl}${resource.file_url}` : resource.file_url
    };
    res.json({ resource: formatted });
  } catch (err) {
    console.error("createResource error - mentor-service mentorController.js:158", err);
    res.status(500).json({ message: err.message });
  }
}

export async function updateResource(req, res) {
  try {
    const fields = {};
    
    if (req.file) {
      fields.file_url = `/uploads/${req.file.filename}`;
    }

    if (req.body.title !== undefined) fields.title = req.body.title;
    if (req.body.description !== undefined) fields.description = req.body.description;
    if (req.body.type !== undefined) fields.type = req.body.type;
    if (req.body.is_published !== undefined) {
      fields.is_published = req.body.is_published === 'true' || req.body.is_published === true;
    }

    const resource = await mentorService.updateResource(req.params.id, fields);

    // Format file_url to absolute URL (giống code cũ trong src)
    // Sử dụng x-forwarded-host và x-forwarded-proto từ API Gateway
    const protocol = req.get("x-forwarded-proto") || req.protocol || "http";
    const host = req.get("x-forwarded-host") || req.get("host") || "localhost:4000";
    const baseUrl = `${protocol}://${host}`;
    const formatted = {
      ...resource,
      file_url: resource.file_url?.startsWith("/") ? `${baseUrl}${resource.file_url}` : resource.file_url
    };
    res.json({ resource: formatted });
  } catch (err) {
    console.error("updateResource error - mentor-service mentorController.js:190", err);
    res.status(500).json({ message: err.message });
  }
}

export async function deleteResource(req, res) {
  try {
    await mentorService.deleteResource(req.params.id);
    res.json({ message: "Resource deleted" });
  } catch (err) {
    console.error("deleteResource error - mentor-service mentorController.js:200", err);
    res.status(500).json({ message: err.message });
  }
}

export async function toggleResourceVisibility(req, res) {
  try {
    const { id } = req.params;
    const { is_published } = req.body;
    const updated = await mentorService.toggleResourceVisibility(id, is_published);
    res.json({ resource: updated });
  } catch (err) {
    console.error("toggleResourceVisibility error:", err);
    res.status(500).json({ message: err.message });
  }
}

/* ========== Report ========== */

export async function mentorCreateReport(req, res) {
  try {
    const { reporter_id, target_id, content } = req.body;
    
    let image_url = null;
    let video_url = null;
    
    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        image_url = `/uploads/${req.files.image[0].filename}`;
      }
      if (req.files.video && req.files.video[0]) {
        video_url = `/uploads/${req.files.video[0].filename}`;
      }
    }
    
    const report = await mentorService.mentorCreateReport({ 
      reporter_id, 
      target_id, 
      content,
      image_url,
      video_url
    });
    res.json({ report });
  } catch (err) {
    console.error("mentorCreateReport error - mentor-service mentorController.js:246", err);
    if (err.canReport === false) {
      return res.status(400).json({ 
        message: err.message,
        canReport: false,
        hoursRemaining: err.hoursRemaining
      });
    }
    if (err.message && err.message.includes("24 giờ")) {
      return res.status(400).json({ message: err.message });
    }
    // Removed: Allow updating existing reports instead of blocking
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
    console.error("getTopicsByMentor error - mentor-service mentorController.js:276", err);
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
    console.error("createTopic error - mentor-service mentorController.js:292", err);
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
    console.error("getChallengesByTopic error - mentor-service mentorController.js:307", err);
    res.status(500).json({ message: "Không thể lấy challenges" });
  }
}

export async function getChallengesByMentor(req, res) {
  const { mentorId } = req.params;
  try {
    const mid = parseInt(mentorId);
    if (isNaN(mid)) {
      return res.status(400).json({ message: "Mentor ID không hợp lệ" });
    }
    const challenges = await mentorService.getChallengesByMentor(mid);
    res.json({ challenges });
  } catch (err) {
    console.error("getChallengesByMentor error - mentor-service mentorController.js", err);
    res.status(500).json({ message: "Không thể lấy challenges" });
  }
}

export async function createChallenge(req, res) {
  const { mentorId } = req.params;
  const { title, description, type, level, created_by } = req.body;
  try {
    const mid = parseInt(mentorId);
    if (isNaN(mid)) {
      return res.status(400).json({ message: "Mentor ID không hợp lệ" });
    }
    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({ message: "Tiêu đề và nội dung không được để trống" });
    }
    const challenge = await mentorService.createChallenge(mid, title, description, type || "speaking", level || "medium", created_by);
    res.json({ challenge });
  } catch (err) {
    console.error("createChallenge error - mentor-service mentorController.js", err);
    res.status(500).json({ message: "Không thể tạo challenge", error: err.message });
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
    console.error("deleteTopic error - mentor-service mentorController.js:355", err);
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
    console.error("deleteChallenge error - mentor-service mentorController.js:372", err);
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
    console.error("createChallengeAI error - mentor-service mentorController.js:386", err);
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
    console.error("editChallengeAI error - mentor-service mentorController.js:404", err);
    return res.status(500).json({ message: "AI cải thiện thất bại", error: err.message });
  }
}

export async function chatWithAI(req, res) {
  try {
    const { message, context } = req.body || {};
    // Lấy token từ request headers để truyền vào AI Service
    const authToken = req.headers.authorization?.replace("Bearer ", "") || null;
    const suggestion = await mentorAiService.chatWithAI(message, context, authToken);
    return res.json({ suggestion });
  } catch (err) {
    console.error("chatWithAI error - mentor-service mentorController.js:416", err);
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
    console.error("updateChallenge error - mentor-service mentorController.js:431", err);
    return res.status(500).json({ message: "Không thể cập nhật challenge", error: err.message });
  }
}

export async function improveChallengeDraft(req, res) {
  try {
    const { content } = req.body || {};
    if (!content) return res.status(400).json({ message: "Thiếu content để AI cải thiện" });

    // Extract auth token from request headers
    const authToken = req.headers.authorization?.replace("Bearer ", "") || null;
    const aiResult = await mentorAiService.editChallengeAI(content, "", authToken);
    const issues = aiResult?.issues || [];
    return res.json({ challenge: aiResult, issues });
  } catch (err) {
    console.error("improveChallengeDraft error - mentor-service mentorController.js:445", err);
    return res.status(500).json({ message: "AI cải thiện thất bại", error: err.message });
  }
}

/* ========== Submissions & Reviews ========== */

export async function getSubmission(req, res) {
  try {
    const submissionId = req.params.id;
    const mentorId = req.params.mentorId;
    if (!mentorId) return res.status(400).json({ error: "Missing mentorId in path" });

    const result = await mentorService.getSubmissionForMentor(submissionId, mentorId);
    if (!result) return res.status(404).json({ error: "Submission not found" });
    if (!result.allowed) return res.status(403).json({ error: "Forbidden: learner not assigned to this mentor" });

    // Format audio_url to absolute URL (giống code cũ trong src)
    // Sử dụng x-forwarded-host và x-forwarded-proto từ API Gateway
    const protocol = req.get("x-forwarded-proto") || req.protocol || "http";
    const host = req.get("x-forwarded-host") || req.get("host") || "localhost:4000";
    const baseUrl = `${protocol}://${host}`;
    
    // Format submission audio_url (learner's audio)
    if (result.submission?.audio_url) {
      const audioUrl = result.submission.audio_url;
      // If it's already an absolute URL with wrong port, convert to relative path
      // Otherwise, if it's relative, make it absolute
      if (/^https?:\/\//i.test(audioUrl)) {
        // Extract path from absolute URL
        try {
          const urlObj = new URL(audioUrl);
          result.submission.audio_url = urlObj.pathname;
          result.submission.audioUrl = urlObj.pathname;
        } catch (e) {
          // If URL parsing fails, keep as is
        }
      } else if (audioUrl.startsWith("/")) {
        // Relative path - keep as is (frontend will normalize)
        result.submission.audio_url = audioUrl;
        result.submission.audioUrl = audioUrl;
      }
    }
    
    // Format mentor review audio_url
    if (result.submission?.mentor_review?.audio_url) {
      const audioUrl = result.submission.mentor_review.audio_url;
      if (/^https?:\/\//i.test(audioUrl)) {
        // Extract path from absolute URL
        try {
          const urlObj = new URL(audioUrl);
          result.submission.mentor_review.audio_url = urlObj.pathname;
        } catch (e) {
          // If URL parsing fails, keep as is
        }
      }
      result.submission.mentor_audio_play_url = result.submission.mentor_review.audio_url;
    } else {
      result.submission.mentor_audio_play_url = null;
    }

    return res.json({ submission: result.submission, challenge: result.challenge });
  } catch (err) {
    console.error("mentorController.getSubmission error - mentor-service mentorController.js:476", err);
    return res.status(500).json({ error: "Server error" });
  }
}

export async function listSubmissions(req, res) {
  try {
    const mentorId = req.params.mentorId;
    if (!mentorId) return res.status(400).json({ error: "Missing mentorId in path" });

    const limit = Math.min(200, Number(req.query.limit) || 50);
    const offset = Number(req.query.offset) || 0;
    const rows = await mentorService.listSubmissionsForMentor(mentorId, { limit, offset });
    return res.json({ submissions: rows });
  } catch (err) {
    console.error("mentorController.listSubmissions error - mentor-service mentorController.js:494", err);
    return res.status(500).json({ error: "Server error" });
  }
}

export async function postReview(req, res) {
  try {
    const submissionId = req.params.id;
    const mentorId = req.params.mentorId;
    if (!mentorId) return res.status(400).json({ error: "Missing mentorId in path" });

    const { final_score, feedback, pronunciation_score, fluency_score, audio_url } = req.body;

    function isValidAudioUrl(u) {
      if (!u) return true;
      try {
        const parsed = new URL(u);
        const baseHost = (process.env.BASE_URL && new URL(process.env.BASE_URL).hostname) || `localhost`;
        return parsed.pathname.startsWith("/uploads/") && parsed.hostname === baseHost;
      } catch (e) {
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

    return res.json({ 
      success: true, 
      review: result.review,
      feedback_id: result.feedback_id 
    });
  } catch (err) {
    console.error("mentorController.postReview error - mentor-service mentorController.js:544", err);
    return res.status(500).json({ error: "Server error" });
  }
}

export async function listReviews(req, res) {
  try {
    const mentorId = req.params.mentorId;
    if (!mentorId) return res.status(400).json({ error: "Missing mentorId in path" });

    const limit = Math.min(200, Number(req.query.limit) || 50);
    const offset = Number(req.query.offset) || 0;
    const rows = await mentorService.listReviewsByMentor(mentorId, { limit, offset });
    return res.json({ reviews: rows });
  } catch (err) {
    console.error("mentorController.listReviews error - mentor-service mentorController.js:562", err);
    return res.status(500).json({ error: "Server error" });
  }
}

