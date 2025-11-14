import * as learnerService from "../services/learnerService.js";

// Lấy tất cả learners
export async function getAll(req, res) {
  try {
    const learners = await learnerService.getAllLearners();
    res.json({ learners });
  } catch (err) {
    console.error("Error learnerController.getAll: - learnerController.js:9", err);
    res.status(500).json({ message: "Server error" });
  }
}

// Lấy learner theo ID
export async function getById(req, res) {
  try {
    const learner = await learnerService.getLearnerById(req.params.id);
    if (!learner) return res.status(404).json({ message: "Learner not found" });
    res.json({ learner });
  } catch (err) {
    console.error("Error learnerController.getById: - learnerController.js:21", err);
    res.status(500).json({ message: "Server error" });
  }
}

// Lấy purchases
export async function getPurchases(req, res) {
  try {
    const purchases = await learnerService.getLearnerPurchases(req.params.id);
    res.json({ purchases });
  } catch (err) {
    console.error("Error learnerController.getPurchases: - learnerController.js:32", err);
    res.status(500).json({ message: "Server error" });
  }
}

// Tạo learner mới
export async function create(req, res) {
  try {
    const learner = await learnerService.createLearner(req.body);
    res.status(201).json(learner);
  } catch (err) {
    console.error("Error learnerController.create: - learnerController.js:43", err);
    res.status(500).json({ message: "Server error" });
  }
}

// Update learner
export async function update(req, res) {
  try {
    const ok = await learnerService.updateLearner(req.params.id, req.body);
    if (!ok) return res.status(404).json({ message: "Learner not found" });
    res.json({ message: "Updated" });
  } catch (err) {
    console.error("Error learnerController.update: - learnerController.js:55", err);
    res.status(500).json({ message: "Server error" });
  }
}

// Reassign mentor
export async function reassignMentor(req, res) {
  try {
    const mentorId = await learnerService.reassignMentorService(req.params.id);
    if (!mentorId) return res.status(404).json({ message: "Learner not found" });
    res.json({ learnerId: req.params.id, mentorId });
  } catch (err) {
    console.error("Error learnerController.reassignMentor: - learnerController.js:67", err);
    res.status(500).json({ message: "Server error" });
  }
}

// Xóa learner
export async function remove(req, res) {
  try {
    await learnerService.deleteLearner(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("Error learnerController.remove: - learnerController.js:78", err);
    res.status(500).json({ message: "Server error" });
  }
}

// Lấy purchase mới nhất
export async function getLatestPurchase(req, res) {
  try {
    const purchase = await learnerService.getLatestPurchaseService(req.params.id);
    res.json({ success: true, purchase });
  } catch (err) {
    console.error("Error learnerController.getLatestPurchase: - learnerController.js:89", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// Update note
export async function updateLearnerNote(req, res) {
  try {
    const learner = await learnerService.updateLearnerNoteService(req.params.learnerId, req.body.note);
    res.json({ success: true, learner });
  } catch (err) {
    console.error("Error learnerController.updateLearnerNote: - learnerController.js:100", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// Tạo report
export async function createReport(req, res) {
  try {
    const report = await learnerService.createReportService(req.body);
    res.status(201).json({ success: true, report });
  } catch (err) {
    console.error("Error learnerController.createReport: - learnerController.js:111", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// Lấy mentor từ learner
export async function getMentorByLearnerId(req, res) {
  try {
    const mentorId = await learnerService.getMentorByLearnerIdService(req.params.id);
    if (!mentorId) return res.status(404).json({ message: "Learner chưa được gán mentor" });
    res.json({ mentor_id: mentorId });
  } catch (err) {
    console.error("Error learnerController.getMentorByLearnerId: - learnerController.js:123", err);
    res.status(500).json({ message: "Server error" });
  }
}
export async function getLearnerByUserId(req, res) {
  try {
    const learner = await learnerService.getLearnerByUserIdService(req.params.userId);
    if (!learner) return res.status(404).json({ message: "Learner not found" });
    res.json({ learner });
  } catch (err) {
    console.error("Error learnerController.getLearnerByUserId: - learnerController.js:133", err);
    res.status(500).json({ message: "Server error" });
  }
}
export async function downloadResourceById(req, res) {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "SELECT file_url FROM mentor_resources WHERE id = $1",
      [id]
    );

    const resource = result.rows[0];
    if (!resource) return res.status(404).json({ message: "Tài liệu không tồn tại" });

    return res.redirect(resource.file_url);
  } catch (err) {
    console.error("Error downloadResourceById: - learnerController.js:151", err);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
}
export async function downloadLearnerResource(req, res) {
  const { learnerId, resourceId } = req.params;

  try {
    const fileUrl = await downloadLearnerResourceService(learnerId, resourceId);
    if (!fileUrl) {
      return res.status(404).json({ message: "Tài liệu không tồn tại hoặc không thuộc mentor của learner này" });
    }

    return res.redirect(fileUrl);
  } catch (err) {
    console.error("Error downloadLearnerResource: - learnerController.js:166", err);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
}