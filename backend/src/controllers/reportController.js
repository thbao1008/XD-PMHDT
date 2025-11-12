import * as reportService from "../services/reportService.js";
import pool from "../config/db.js";

export async function createReport(req, res) {
  const { reporter_id, target_id, content, status } = req.body;
  if (!reporter_id || !target_id || !content) {
    return res.status(400).json({ success: false, message: "Thiếu dữ liệu" });
  }

  try {
    // thử insert mới, lần đầu cũng ghi timestamp
    const result = await pool.query(
      `INSERT INTO reports (reporter_id, target_id, content, status, created_at, updated_at)
       VALUES (
         $1, 
         $2, 
         '[Report - ' || TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI:SS') || '] ' || $3,
         $4,
         NOW(),
         NOW()
       )
       RETURNING *`,
      [reporter_id, target_id, content, status || "pending"]
    );
    return res.json({ success: true, report: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      // nếu đã tồn tại report cho cặp này thì append nội dung mới
      const updateRes = await pool.query(
        `UPDATE reports
         SET content = COALESCE(content, '') || '\n[Report bổ sung - ' || TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI:SS') || '] ' || $3,
             status = 'pending',
             reply = NULL,
             reply_by = NULL,
             reply_at = NULL,
             updated_at = NOW()
         WHERE reporter_id = $1 AND target_id = $2
         RETURNING *`,
        [reporter_id, target_id, content]
      );

      if (updateRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Không tìm thấy report để cập nhật" });
      }
      return res.json({ success: true, report: updateRes.rows[0] });
    }

    console.error("createReport error: - reportController.js:48", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
}


export async function getReportSummary(req, res) {
  try {
    const { from, to } = req.query;
    const summary = await reportService.getReportSummary(from, to);
    res.json({ success: true, summary });
  } catch (err) {
    console.error("Error getReportSummary: - reportController.js:60", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getReports(req, res) {
  try {
    const { status } = req.query;
    const reports = await reportService.getReports(status);
    res.json({ success: true, reports });
  } catch (err) {
    console.error("Error getReports: - reportController.js:71", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function searchLearnerProgress(req, res) {
  try {
    const { query } = req.query;
    const learners = await reportService.searchLearnerProgress(query);
    res.json({ success: true, learners });
  } catch (err) {
    console.error("Error searchLearnerProgress: - reportController.js:82", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}


export async function updateReportStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, replyContent, actorRole } = req.body;

    const allowed = ["pending", "resolved", "dismissed"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Trạng thái không hợp lệ" });
    }

    const updated = await reportService.updateReportStatus(id, status, replyContent, actorRole || "admin");
    if (!updated) {
      return res.status(404).json({ success: false, message: "Không tìm thấy report" });
    }

    if (status === "dismissed") {
      // cập nhật note của learner (target_id mới đúng)
      await pool.query(`
        UPDATE learners 
        SET note = COALESCE(note, '') || '\n[Lịch sử report] Đơn tố cáo bị từ chối lúc ' || TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI:SS')
        WHERE id = $1
      `, [updated.target_id]);

      // thêm reply mặc định, KHÔNG xoá content
      await pool.query(`
        UPDATE reports
        SET reply = '[Admin thông báo - ' || TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI:SS') || '] Phản hồi bị từ chối vì chưa đủ căn cứ',
            reply_by = 'admin',
            reply_at = NOW()
        WHERE id = $1
      `, [id]);
    }

    if (status === "resolved") {
      await pool.query(`
        UPDATE learners 
        SET note = COALESCE(note, '') || '\n[Lịch sử report] Đơn tố cáo được chấp nhận lúc ' || TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI:SS')
        WHERE id = $1
      `, [updated.target_id]);
    }

    res.json({ success: true, report: updated });
  } catch (err) {
    console.error("Error updateReportStatus controller: - reportController.js:131", err);
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
    console.error("Error updateLearnerNote: - reportController.js:148", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}
