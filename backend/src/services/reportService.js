import pool from "../config/db.js";

// Thống kê số lượng học viên, mentor, report theo thời gian
export async function getReportSummary(from, to) {
  // Nếu không truyền from/to thì đếm toàn bộ
  if (!from || !to) {
    const result = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM learners) AS total_learners,
        (SELECT COUNT(*) FROM mentors) AS total_mentors,
        (SELECT COUNT(*) FROM reports) AS total_reports
    `);
    return result.rows[0];
  }

  // Nếu có from/to thì lọc theo created_at
  const result = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM learners WHERE created_at BETWEEN $1 AND $2) AS total_learners,
      (SELECT COUNT(*) FROM mentors WHERE created_at BETWEEN $1 AND $2) AS total_mentors,
      (SELECT COUNT(*) FROM reports WHERE created_at BETWEEN $1 AND $2) AS total_reports
  `, [from, to]);
  return result.rows[0];
}

// Lấy danh sách reports (có filter trạng thái)
export async function getReports(status) {
  const result = await pool.query(`
    SELECT r.id AS report_id,
           r.content,
           r.status,
           r.created_at,
           reporter.name AS reporter_name,
           target.name   AS target_name
    FROM reports r
    LEFT JOIN users reporter ON r.reporter_id = reporter.id
    LEFT JOIN users target   ON r.target_id   = target.id
    WHERE ($1::text = '' OR r.status = $1)
    ORDER BY r.created_at DESC
  `, [status || '']);
  return result.rows;
}

export async function updateReportStatus(id, status) {
  const result = await pool.query(
    `UPDATE reports 
     SET status = $1, updated_at = NOW() 
     WHERE id = $2 
     RETURNING *`,
    [status, id]
  );
  return result.rows[0];
}
// Cập nhật ghi chú cho learner
export async function updateLearnerNote(req, res) {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const result = await pool.query(
      `UPDATE learners 
       SET note = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [note, id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: "Learner not found" });
    }

    res.json({ success: true, learner: result.rows[0] });
  } catch (err) {
    console.error("Error updateLearnerNote: - reportService.js:74", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}