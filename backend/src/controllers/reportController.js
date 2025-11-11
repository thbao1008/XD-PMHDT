import * as reportService from "../services/reportService.js";
// Controller cho mentor tạo report
import pool from "../config/db.js";

export async function createReport(req, res) {
  console.log("req.body: - reportController.js:6", req.body);

  const { reporter_id, target_id, content, status } = req.body;
  console.log("createReport body: - reportController.js:9", req.body);

  if (!reporter_id || !target_id || !content) {
    return res.status(400).json({ success: false, message: "Thiếu dữ liệu" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO reports (reporter_id, target_id, content, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [reporter_id, target_id, content, status || "pending"]
    );

    res.json({ success: true, report: result.rows[0] });
  } catch (err) {
    console.error("createReport error: - reportController.js:25", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
}


export async function getReportSummary(req, res) {
  try {
    const { from, to } = req.query;
    const summary = await reportService.getReportSummary(from, to);
    res.json({ success: true, summary });
  } catch (err) {
    console.error("Error getReportSummary: - reportController.js:37", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getReports(req, res) {
  try {
    const { status } = req.query;
    const reports = await reportService.getReports(status);
    res.json({ success: true, reports });
  } catch (err) {
    console.error("Error getReports: - reportController.js:48", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function searchLearnerProgress(req, res) {
  try {
    const { query } = req.query;
    const learners = await reportService.searchLearnerProgress(query);
    res.json({ success: true, learners });
  } catch (err) {
    console.error("Error searchLearnerProgress: - reportController.js:59", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function updateReportStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const allowed = ["pending", "resolved", "dismissed"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Trạng thái không hợp lệ" });
    }

    const updated = await reportService.updateReportStatus(id, status);

    if (!updated) {
      return res.status(404).json({ success: false, message: "Không tìm thấy report" });
    }

    res.json({ success: true, report: updated });
  } catch (err) {
    console.error("Error updateReportStatus: - reportController.js:83", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}
  export async function updateLearnerNote(req, res) {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const learner = await reportService.updateLearnerNote(id, note);

    if (!learner) {
      return res.status(404).json({ success: false, message: "Learner not found" });
    }

    res.json({ success: true, learner });
  } catch (err) {
    console.error("Error updateLearnerNote: - reportController.js:100", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}