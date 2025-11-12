import pool from "../config/db.js";

// Thống kê số lượng học viên, mentor, report theo thời gian
export async function getReportSummary(from, to) {
  if (!from || !to) {
    const result = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM learners) AS total_learners,
        (SELECT COUNT(*) FROM mentors) AS total_mentors,
        (SELECT COUNT(*) FROM reports) AS total_reports
    `);
    return result.rows[0];
  }

  const result = await pool.query(`
    SELECT 
      (SELECT COUNT(*) 
         FROM learners l
         JOIN users u ON l.user_id = u.id
         WHERE u.created_at >= $1::date 
           AND u.created_at < ($2::date + interval '1 day')) AS total_learners,
      (SELECT COUNT(*) 
         FROM mentors m
         JOIN users u ON m.user_id = u.id
         WHERE u.created_at >= $1::date 
           AND u.created_at < ($2::date + interval '1 day')) AS total_mentors,
      (SELECT COUNT(*) 
         FROM reports r
         WHERE r.created_at >= $1::date 
           AND r.created_at < ($2::date + interval '1 day')) AS total_reports
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
           r.reply,
           r.reply_by,
           r.reply_at,
           reporter.id AS reporter_id,
           reporter.name AS reporter_name,
           reporter.role AS reporter_role,
           target.id AS target_id,
           target.name AS target_name,
           target.role AS target_role
    FROM reports r
    LEFT JOIN users reporter ON r.reporter_id = reporter.id
    LEFT JOIN users target   ON r.target_id   = target.id
    WHERE ($1::text = '' OR r.status = $1)
    ORDER BY r.created_at DESC;
  `, [status || '']);
  return result.rows;
}

// Cập nhật trạng thái report + xử lý reply/note


export async function updateReportStatus(id, status, replyContent = null, actorRole = "admin") {
  try {
    const current = await pool.query(`SELECT * FROM reports WHERE id = $1`, [id]);
    if (!current.rows.length) return null;
    const report = current.rows[0];

    const nowFormatted = await pool.query(`SELECT TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI:SS') AS ts`);
    const timestamp = nowFormatted.rows[0].ts;

    if (actorRole === "admin") {
      if (replyContent) {
        await pool.query(
          `UPDATE reports
           SET status = $1,
               reply = $2,
               reply_by = 'admin',
               reply_at = NOW(),
               updated_at = NOW()
           WHERE id = $3`,
          [status, `[Admin trả lời - ${timestamp}] ${replyContent}`, id]
        );
      } else {
        await pool.query(
          `UPDATE reports
           SET status = $1,
               updated_at = NOW()
           WHERE id = $2`,
          [status, id]
        );
      }
    } else if (actorRole === "mentor") {
      await pool.query(
        `UPDATE learners
         SET note = COALESCE(note, '') || '\n[Mentor nhập - ${timestamp}] ' || $1,
             updated_at = NOW()
         WHERE id = $2`,
        [replyContent || "", report.target_id]
      );

      await pool.query(
        `UPDATE reports
         SET status = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [status, id]
      );
    }

    const updated = await pool.query(`SELECT * FROM reports WHERE id = $1`, [id]);
    return updated.rows[0];
  } catch (err) {
    console.error("Error updateReportStatus service: - reportService.js:114", err);
    throw err;
  }
}


// Cập nhật ghi chú cho learner (mentor nhập)
export async function updateLearnerNote(req, res) {
  try {
    const { id } = req.params;      // learner_id
    const { note } = req.body;      // nội dung ghi chú

    const nowFormatted = await pool.query(
      `SELECT TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI:SS') AS ts`
    );
    const timestamp = nowFormatted.rows[0].ts;

    const result = await pool.query(
      `UPDATE learners 
       SET note = COALESCE(note, '') || '\n[Mentor nhập - ${timestamp}] ' || $1,
           updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [note, id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: "Learner not found" });
    }

    res.json({ success: true, learner: result.rows[0] });
  } catch (err) {
    console.error("Error updateLearnerNote: - reportService.js:146", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}
