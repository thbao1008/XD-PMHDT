// backend/src/controllers/learnerController.js
import * as learnerService from "../services/learnerService.js";
import * as aiService from "../services/aiService.js";
import { enqueue } from "../utils/queue.js";
import { runWhisperX } from "../utils/whisperxRunner.js";
import fs from "fs";
import path from "path";

/* ========== Controller functions ========== */

// GET /api/learners
export async function getAll(req, res) {
  try {
    const params = {
      page: req.query.page,
      limit: req.query.limit,
      q: req.query.q
    };
    const learners = await learnerService.getAllLearners(params);
    return res.json({ learners });
  } catch (err) {
    console.error("Error learnerController.getAll: - learnerController.js:22", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET /api/learners/:id
export async function getById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid learner id" });

    const learner = await learnerService.getLearnerById(id);
    if (!learner) return res.status(404).json({ message: "Learner not found" });

    return res.json({ learner });
  } catch (err) {
    console.error("Error learnerController.getById: - learnerController.js:38", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// POST /api/learners
export async function create(req, res) {
  try {
    const payload = req.body || {};
    const created = await learnerService.createLearner(payload);
    return res.status(201).json({ learner: created });
  } catch (err) {
    console.error("Error learnerController.create: - learnerController.js:50", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// PUT /api/learners/:id
export async function update(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid learner id" });

    const ok = await learnerService.updateLearner(id, req.body || {});
    if (!ok) return res.status(404).json({ message: "Learner not found" });

    return res.json({ message: "Updated" });
  } catch (err) {
    console.error("Error learnerController.update: - learnerController.js:66", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// DELETE /api/learners/:id
export async function remove(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid learner id" });

    await learnerService.deleteLearner(id);
    return res.json({ message: "Deleted" });
  } catch (err) {
    console.error("Error learnerController.remove: - learnerController.js:80", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/* ========== Purchases ========== */

export async function getPurchases(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid learner id" });

    const purchases = await learnerService.getLearnerPurchases(id);
    return res.json({ purchases });
  } catch (err) {
    console.error("Error learnerController.getPurchases: - learnerController.js:95", err);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function getLatestPurchase(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid learner id" });

    const purchase = await learnerService.getLatestPurchaseService(id);
    return res.json({ success: true, purchase });
  } catch (err) {
    console.error("Error learnerController.getLatestPurchase: - learnerController.js:108", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/* ========== Mentor / Lookup ========== */

export async function getMentorByLearnerId(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid learner id" });

    const mentorId = await learnerService.getMentorByLearnerIdService(id);
    if (!mentorId) return res.status(404).json({ message: "Learner chưa được gán mentor" });

    return res.json({ mentor_id: mentorId });
  } catch (err) {
    console.error("Error learnerController.getMentorByLearnerId: - learnerController.js:125", err);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function getLearnerByUserId(req, res) {
  try {
    const userId = req.params.userId;
    if (!userId) return res.status(400).json({ message: "Missing userId" });

    const learner = await learnerService.getLearnerByUserIdService(userId);
    if (!learner) return res.status(404).json({ message: "Learner not found" });

    return res.json({ learner });
  } catch (err) {
    console.error("Error learnerController.getLearnerByUserId: - learnerController.js:140", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/* ========== Notes / Reports / Reassign ========== */

export async function updateLearnerNote(req, res) {
  try {
    const learnerId = parseInt(req.params.learnerId, 10);
    if (Number.isNaN(learnerId)) return res.status(400).json({ message: "Invalid learner id" });

    const note = req.body?.note ?? "";
    const learner = await learnerService.updateLearnerNoteService(learnerId, note);
    return res.json({ success: true, learner });
  } catch (err) {
    console.error("Error learnerController.updateLearnerNote: - learnerController.js:156", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function createReport(req, res) {
  try {
    const payload = req.body || {};
    const report = await learnerService.createReportService(payload);
    return res.status(201).json({ success: true, report });
  } catch (err) {
    console.error("Error learnerController.createReport: - learnerController.js:167", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function reassignMentor(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid learner id" });

    const mentorId = await learnerService.reassignMentorService(id);
    if (!mentorId) return res.status(404).json({ message: "Learner not found" });

    return res.json({ learnerId: id, mentorId });
  } catch (err) {
    console.error("Error learnerController.reassignMentor: - learnerController.js:182", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/* ========== Resource download helpers ========== */

export async function downloadResourceById(req, res) {
  try {
    const resourceId = parseInt(req.params.resourceId || req.params.id, 10);
    if (Number.isNaN(resourceId)) return res.status(400).json({ message: "Invalid resource id" });

    const resource = await learnerService.getResourceByIdService(resourceId);
    if (!resource || !resource.file_url) return res.status(404).json({ message: "Tài liệu không tồn tại" });

    return res.redirect(resource.file_url);
  } catch (err) {
    console.error("Error downloadResourceById: - learnerController.js:199", err);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
}

export async function downloadLearnerResource(req, res) {
  try {
    const learnerId = parseInt(req.params.learnerId, 10);
    const resourceId = parseInt(req.params.resourceId, 10);
    if (Number.isNaN(learnerId) || Number.isNaN(resourceId)) return res.status(400).json({ message: "Invalid id(s)" });

    const fileUrl = await learnerService.downloadLearnerResourceService(learnerId, resourceId);
    if (!fileUrl) return res.status(404).json({ message: "Tài liệu không tồn tại hoặc không thuộc mentor của learner này" });

    return res.redirect(fileUrl);
  } catch (err) {
    console.error("Error downloadLearnerResource: - learnerController.js:215", err);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
}

/* ========== Challenges / Submissions ========== */

export async function listAllChallenges(req, res) {
  try {
    const { q, level, topicId, page, limit } = req.query;
    const data = await learnerService.getChallenges({ query: q, level, topicId, page, limit });
    res.json({ challenges: data });
  } catch (err) {
    console.error("listAllChallenges error: - learnerController.js:228", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getChallengeById(req, res) {
  try {
    const id = parseInt(req.params.id);
    const ch = await learnerService.getChallengeById(id);
    if (!ch) return res.status(404).json({ message: "Challenge not found" });
    res.json({ challenge: ch });
  } catch (err) {
    console.error("getChallengeById error: - learnerController.js:240", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getLearnerChallenges(req, res) {
  try {
    const learnerId = parseInt(req.params.learnerId);
    if (Number.isNaN(learnerId)) return res.status(400).json({ message: "Invalid learner id" });

    const { page = 1, limit = 20, mentorId = null } = req.query;
    const rows = await learnerService.getLearnerChallenges(learnerId, { page, limit }, mentorId);
    res.json({ challenges: rows });
  } catch (err) {
    console.error("getLearnerChallenges error: - learnerController.js:254", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function createSubmission(req, res) {
  try {
    const learnerId = req.body.learner_id || req.body.learnerId;
    const challengeId = req.body.challenge_id || req.body.challengeId;
    const assignmentId = req.body.assignment_id || req.body.assignmentId;

    if (!learnerId || !challengeId) {
      return res.status(400).json({ message: "Missing learnerId or challengeId" });
    }

    let audioUrl = null;
    let transcript = null;

    if (req.file) {
      const uploadsDir = path.resolve(process.cwd(), "uploads");
      const localPath = req.file.filename
        ? path.join(uploadsDir, req.file.filename)
        : path.resolve(req.file.path);

      if (!fs.existsSync(localPath)) {
        console.error("createSubmission: audio file not found - learnerController.js:279", localPath);
        return res.status(500).json({ message: "Audio file missing on server", path: localPath });
      }

      audioUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

      try {
        const { json: transcriptJson } = await runWhisperX(localPath, {
          model: "base",
          computeType: "float32"
        });
        transcript = transcriptJson;
      } catch (err) {
        console.error("createSubmission: whisperx transcription failed - learnerController.js:292", err);
        try {
          if (typeof aiService.transcribeWithWhisperX === "function") {
            const out = await aiService.transcribeWithWhisperX(localPath);
            transcript = out.json ?? out.text ?? null;
          }
        } catch (err2) {
          console.error("Fallback aiService.transcribeWithWhisperX failed - learnerController.js:299", err2);
          transcript = null;
        }
      }
    } else {
      return res.status(400).json({ message: "No audio provided" });
    }

    const attemptNumber = await learnerService.getNextAttemptNumber(learnerId, challengeId);

    const submission = await learnerService.createSubmission({
      learnerId: parseInt(learnerId),
      challengeId: parseInt(challengeId),
      assignmentId: assignmentId ? parseInt(assignmentId) : null,
      attemptNumber,
      audioUrl,
      transcript
    });

    await learnerService.upsertLearnerChallenge({
      learnerId: parseInt(learnerId),
      challengeId: parseInt(challengeId),
      assignmentId: assignmentId ? parseInt(assignmentId) : null,
      status: "in_progress",
      attempts: 1
    });

  
    await enqueue("analyzeSubmission", { submissionId: submission.id });

    res.json({
      submissionId: submission.id,
      status: "pending",
      audio_url: audioUrl
    });
  } catch (err) {
    console.error("createSubmission error: - learnerController.js:335", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

export async function getSubmissionAnalysis(req, res) {
  try {
    const submissionId = parseInt(req.params.id);
    if (Number.isNaN(submissionId)) return res.status(400).json({ message: "Invalid submission id" });

    const analysis = await learnerService.getAnalysisBySubmissionId(submissionId);
    if (!analysis) return res.status(404).json({ message: "Analysis not found" });

    res.json({ analysis });
  } catch (err) {
    console.error("getSubmissionAnalysis error: - learnerController.js:350", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function analyzeSubmission(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid submission id" });

    const analysisRow = await learnerService.analyzeSubmissionWithAI(id);
    const updatedSubmission = await learnerService.getSubmissionById(id);
    res.json({ submission: updatedSubmission, analysis: analysisRow });
  } catch (err) {
    console.error("analyzeSubmission error: - learnerController.js:364", err);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/learners/submissions/:id
export async function getSubmissionById(req, res) {
  try {
    const id = parseInt(req.params.id);
    const sub = await learnerService.getSubmissionById(id);
    if (!sub) return res.status(404).json({ message: "Submission not found" });
    res.json({ submission: sub });
  } catch (err) {
    console.error("getSubmissionById error: - learnerController.js:377", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function reviewSubmissionByMentor(req, res) {
  try {
    const id = parseInt(req.params.id);
    const { mentorId, finalScore, feedback, overrideAI } = req.body;
    const updated = await learnerService.reviewSubmissionByMentor(id, { mentorId, finalScore, feedback, overrideAI });
    res.json({ submission: updated });
  } catch (err) {
    console.error("reviewSubmissionByMentor error: - learnerController.js:389", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function upsertLearnerChallenge(req, res) {
  try {
    const { learnerId, challengeId, assignmentId, status, attempts, is_bookmarked } = req.body;
    if (!learnerId || !challengeId) return res.status(400).json({ message: "Missing learnerId or challengeId" });
    const rec = await learnerService.upsertLearnerChallenge({
      learnerId: parseInt(learnerId),
      challengeId: parseInt(challengeId),
      assignmentId: assignmentId ? parseInt(assignmentId) : null,
      status,
      attempts,
      is_bookmarked
    });
    res.json({ learnerChallenge: rec });
  } catch (err) {
    console.error("upsertLearnerChallenge error: - learnerController.js:408", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function updateLearnerChallenge(req, res) {
  try {
    const id = parseInt(req.params.id);
    const payload = req.body;
    const updated = await learnerService.updateLearnerChallenge(id, payload);
    res.json({ learnerChallenge: updated });
  } catch (err) {
    console.error("updateLearnerChallenge error: - learnerController.js:420", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function listSubmissionsForLearner(req, res) {
  try {
    const learnerId = parseInt(req.params.learnerId);
    const rows = await learnerService.listSubmissionsForLearner(learnerId);
    res.json({ submissions: rows });
  } catch (err) {
    console.error("listSubmissionsForLearner error: - learnerController.js:431", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function checkSubmission(req, res) {
  try {
    const id = parseInt(req.params.id);
    const sub = await learnerService.getSubmissionById(id);
    if (!sub || !sub.transcript) return res.status(404).json({ message: "Transcript not found" });

    const sampleText = req.body.sampleText || "";
    const comparison = compareTranscript(sub.transcript, sampleText);

    res.json({ transcript: sub.transcript, comparison });
  } catch (err) {
    console.error("checkSubmission error: - learnerController.js:447", err);
    res.status(500).json({ message: "Server error" });
  }
}

/* ========== Utility: simple transcript comparison (example) ========== */
function compareTranscript(transcript = "", sample = "") {
  const normalize = s =>
    (s || "")
      .replace(/[^\w\s]/g, "")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

  const tTokens = normalize(transcript);
  const sTokens = normalize(sample);

  const result = tTokens.map((tok, idx) => {
    const expected = sTokens[idx] ?? null;
    return { word: tok, expected, correct: expected ? tok === expected : null };
  });

  return { tokens: result, transcriptTokens: tTokens.length, sampleTokens: sTokens.length };
}
