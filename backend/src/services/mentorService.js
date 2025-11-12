import pool from "../config/db.js";

// Lấy sessions theo status
export async function getMentorSessions(mentorId, status = null) {
  let query = `SELECT * FROM mentor_sessions WHERE mentor_id = $1`;
  const params = [mentorId];

  if (status) {
    query += ` AND status = $2 ORDER BY date ASC`;
    params.push(status);
  } else {
    query += ` ORDER BY date ASC`;
  }

  const result = await pool.query(query, params);
  return result.rows;
}

// Ghi đè toàn bộ draft
export async function upsertDraft(mentorId, sessions) {
  await pool.query(`DELETE FROM mentor_sessions WHERE mentor_id = $1 AND status = 'draft'`, [mentorId]);

  for (const s of sessions) {
    await pool.query(
      `INSERT INTO mentor_sessions (mentor_id, date, start_time, end_time, type, note, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,'draft',NOW())`,
      [mentorId, s.date, s.startTime, s.endTime, s.type, s.note || ""]
    );
  }

  const result = await pool.query(
    `SELECT * FROM mentor_sessions WHERE mentor_id = $1 AND status = 'draft' ORDER BY date ASC`,
    [mentorId]
  );
  return result.rows;
}

// Xóa draft theo id
export async function deleteDraftById(mentorId, sessionId) {
  await pool.query(
    `DELETE FROM mentor_sessions WHERE mentor_id = $1 AND id = $2 AND status = 'draft'`,
    [mentorId, sessionId]
  );
}

// Chốt lịch: chuyển draft thành final
export async function finalizeDraft(mentorId, sessions) {
  await pool.query(`DELETE FROM mentor_sessions WHERE mentor_id = $1 AND status = 'draft'`, [mentorId]);

  for (const s of sessions) {
    await pool.query(
      `INSERT INTO mentor_sessions (mentor_id, date, start_time, end_time, type, note, status, locked, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,'final',true,NOW())`,
      [mentorId, s.date, s.startTime, s.endTime, s.type, s.note || ""]
    );
  }

  const result = await pool.query(
    `SELECT * FROM mentor_sessions WHERE mentor_id = $1 AND status = 'final' ORDER BY date ASC`,
    [mentorId]
  );
  return result.rows;
}
