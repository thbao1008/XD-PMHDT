import pool from "../config/db.js";
import { getWeekRange, validateWeeklyConstraint } from "./utils.js";

// Lấy tất cả sessions
export async function getMentorSessions(mentorId) {
  const result = await pool.query(
    `SELECT * FROM mentor_sessions WHERE mentor_id=$1 ORDER BY date ASC`,
    [mentorId]
  );
  return result.rows;
}

// Thêm buổi
export async function addSession(mentorId, session, { skipValidation = false } = {}) {
  await pool.query(
    `INSERT INTO mentor_sessions 
      (mentor_id, date, start_time, end_time, type, note, is_exam, paused, created_at, updated_at)
     VALUES ($1, $2::date, $3::time, $4::time, $5, $6, $7, false, NOW(), NOW())`,
    [
      mentorId,
      session.date,
      session.start_time,
      session.end_time,
      session.type,
      session.note || "",
      session.is_exam || false
    ]
  );

  // Nếu không phải lịch thi thì kiểm tra ràng buộc tuần
  if (!skipValidation && !session.is_exam) {
    const { weekStart, weekEnd } = getWeekRange(session.date);
    const ok = await validateWeeklyConstraint(mentorId, weekStart, weekEnd);
    if (!ok) throw new Error("Mỗi tuần phải có ≥1 offline và ≥2 online");
  }

  return getMentorSessions(mentorId);
}


// Cập nhật buổi
export async function updateSession(mentorId, sessionId, session) {
  await pool.query(
    `UPDATE mentor_sessions SET 
       date = COALESCE($1::date, date),
       start_time = COALESCE($2::time, start_time),
       end_time = COALESCE($3::time, end_time),
       type = COALESCE($4, type),
       note = COALESCE($5, note),
       is_exam = COALESCE($6, is_exam),
       paused = COALESCE($7, paused),
       updated_at = NOW()
     WHERE mentor_id=$8 AND id=$9`,
    [
      session.date || null,
      session.start_time || null,
      session.end_time || null,
      session.type || null,
      session.note || null,
      session.is_exam ?? null,
      session.paused ?? null,
      mentorId,
      sessionId
    ]
  );

  // lấy lại date + is_exam từ DB để validate tuần
  const res = await pool.query(
    `SELECT date, is_exam FROM mentor_sessions WHERE id=$1 AND mentor_id=$2`,
    [sessionId, mentorId]
  );
  const { date, is_exam } = res.rows[0];

  if (!is_exam) {
    const { weekStart, weekEnd } = getWeekRange(date);
    const ok = await validateWeeklyConstraint(mentorId, weekStart, weekEnd);
    if (!ok) throw new Error("Mỗi tuần phải có ≥1 offline và ≥2 online");
  }

  return getMentorSessions(mentorId);
}

// Xóa buổi
export async function deleteSession(mentorId, sessionId) {
  const old = await pool.query(
    `SELECT date, is_exam FROM mentor_sessions WHERE id=$1 AND mentor_id=$2`,
    [sessionId, mentorId]
  );
  if (old.rows.length === 0) throw new Error("Session not found");
  const { date, is_exam } = old.rows[0];

  await pool.query(`DELETE FROM mentor_sessions WHERE id=$1 AND mentor_id=$2`, [sessionId, mentorId]);

  // Nếu không phải lịch thi thì kiểm tra lại ràng buộc tuần
  if (!is_exam) {
    const { weekStart, weekEnd } = getWeekRange(date);
    const ok = await validateWeeklyConstraint(mentorId, weekStart, weekEnd);
    if (!ok) throw new Error("Mỗi tuần phải có ≥1 offline và ≥2 online");
  }

  return getMentorSessions(mentorId);
}
