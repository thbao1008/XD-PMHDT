import pool from "../config/db.js";
import { getWeekRange, validateWeeklyConstraint } from "./utils.js";

// ========== Mentor CRUD ==========
export async function createMentor(data) {
  const { name, email, phone, dob, bio, experience_years, specialization, rating } = data;

  const userRes = await pool.query(
    `INSERT INTO users (name, email, phone, dob, role, status, created_at)
     VALUES ($1,$2,$3,$4,'mentor','active',NOW()) RETURNING id`,
    [name, email, phone, dob]
  );
  const userId = userRes.rows[0].id;

  const mentorRes = await pool.query(
    `INSERT INTO mentors (user_id, bio, experience_years, specialization, rating, created_at)
     VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING id`,
    [userId, bio, experience_years, specialization, rating]
  );

  return {
    mentorId: mentorRes.rows[0].id,
    userId
  };
}

export async function getAllMentors() {
  const result = await pool.query(`
    SELECT m.id AS mentor_id, u.id AS user_id,
           u.name, u.email, u.phone, u.dob, u.status,
           m.bio, m.experience_years, m.specialization, m.rating
    FROM mentors m
    JOIN users u ON m.user_id = u.id
    ORDER BY m.id DESC
  `);
  return result.rows;
}

export async function getMentorById(id) {
  const result = await pool.query(`
    SELECT m.id AS mentor_id, u.id AS user_id,
           u.name, u.email, u.phone, u.dob, u.status,
           m.bio, m.experience_years, m.specialization, m.rating
    FROM mentors m
    JOIN users u ON m.user_id = u.id
    WHERE m.id = $1
  `, [id]);
  return result.rows[0];
}

export async function updateMentor(id, data) {
  const { name, email, phone, dob, bio, experience_years, specialization, rating } = data;

  const mentorRes = await pool.query("SELECT user_id FROM mentors WHERE id=$1", [id]);
  if (!mentorRes.rows[0]) throw new Error("Mentor not found");
  const userId = mentorRes.rows[0].user_id;

  await pool.query(`
    UPDATE users SET
      name = COALESCE($1, name),
      email = COALESCE($2, email),
      phone = COALESCE($3, phone),
      dob = COALESCE($4, dob),
      updated_at = NOW()
    WHERE id=$5
  `, [name, email, phone, dob, userId]);

  await pool.query(`
    UPDATE mentors SET
      bio = COALESCE($1, bio),
      experience_years = COALESCE($2, experience_years),
      specialization = COALESCE($3, specialization),
      rating = COALESCE($4, rating),
      updated_at = NOW()
    WHERE id=$5
  `, [bio, experience_years, specialization, rating, id]);
}

export async function removeMentor(id) {
  await pool.query("DELETE FROM mentors WHERE id=$1", [id]);
}

// ========== Learners ==========
export async function getLearnersByMentor(mentorId) {
  const result = await pool.query(`
    SELECT lp.*, l.user_id,
           r.id AS report_id, r.content AS report,
           r.status AS report_status, r.reply AS report_reply,
           r.reply_by, r.reply_at
    FROM learner_package_view lp
    JOIN learners l ON lp.learner_id = l.id
    LEFT JOIN reports r 
      ON r.target_id = l.user_id 
     AND r.reporter_id = (SELECT user_id FROM mentors WHERE id = $1)
    WHERE lp.mentor_id = $1
    ORDER BY lp.learner_id DESC
  `, [mentorId]);
  return result.rows;
}

export async function getMentorByUserId(userId) {
  const result = await pool.query(`
    SELECT m.id AS mentor_id, u.id AS user_id,
           u.name, u.email, u.phone, u.dob, u.status,
           m.bio, m.experience_years, m.specialization, m.rating
    FROM mentors m
    JOIN users u ON m.user_id = u.id
    WHERE m.user_id = $1
  `, [userId]);
  return result.rows[0];
}

export async function updateLearnerNote(learnerId, note) {
  const result = await pool.query(
    "UPDATE learners SET note = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
    [note, learnerId]
  );
  return result.rows[0];
}

// ========== Sessions ==========
export async function getSessions(mentorId) {
  const result = await pool.query(
    "SELECT * FROM mentor_sessions WHERE mentor_id=$1 ORDER BY date ASC",
    [mentorId]
  );
  return result.rows;
}

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

  if (!skipValidation && !session.is_exam) {
    const { weekStart, weekEnd } = getWeekRange(session.date);
    const ok = await validateWeeklyConstraint(mentorId, weekStart, weekEnd);
    if (!ok) throw new Error("Mỗi tuần phải có ≥1 offline và ≥2 online");
  }

  return getSessions(mentorId);
}

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

  return getSessions(mentorId);
}

export async function deleteSession(mentorId, sessionId) {
  const old = await pool.query(
    `SELECT date, is_exam FROM mentor_sessions WHERE id=$1 AND mentor_id=$2`,
    [sessionId, mentorId]
  );
  if (old.rows.length === 0) throw new Error("Session not found");
  const { date, is_exam } = old.rows[0];

  await pool.query("DELETE FROM mentor_sessions WHERE id=$1 AND mentor_id=$2", [sessionId, mentorId]);

  if (!is_exam) {
    const { weekStart, weekEnd } = getWeekRange(date);
    const ok = await validateWeeklyConstraint(mentorId, weekStart, weekEnd);
    if (!ok) throw new Error("Mỗi tuần phải có ≥1 offline và ≥2 online");
  }

  return getSessions(mentorId);
}

export async function addSessionsBatch(mentorId, sessions) {
  for (const s of sessions) {
    await addSession(mentorId, { ...s, type: s.type.toLowerCase() }, { skipValidation: true });
  }

  const { weekStart, weekEnd } = getWeekRange(sessions[0].date);
  const ok = await validateWeeklyConstraint(mentorId, weekStart, weekEnd);
  if (!ok) throw new Error("Mỗi tuần phải có ≥1 offline và ≥2 online");

  return getSessions(mentorId);
}

// ========== Resources ==========
export async function getResourcesByMentor(mentorId) {
  const result = await pool.query(
    "SELECT * FROM mentor_resources WHERE mentor_id = $1 ORDER BY created_at DESC",
    [mentorId]
  );
  return result.rows;
}

export async function createResource({ mentor_id, title, description, type, file_url }) {
  const result = await pool.query(
    `INSERT INTO mentor_resources (mentor_id, title, description, type, file_url)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [mentor_id, title, description, type, file_url]
  );
  return result.rows[0];
}

export async function updateResource(id, fields) {
  const result = await pool.query(
    `UPDATE mentor_resources
     SET title=$2, description=$3, type=$4, file_url=$5, is_public=$6, is_published=$7
     WHERE id=$1 RETURNING *`,
    [
      id,
      fields.title,
      fields.description,
      fields.type,
      fields.file_url,
      fields.is_public,
      fields.is_published
    ]
  );
  return result.rows[0];
}

export async function deleteResource(id) {
  await pool.query("DELETE FROM mentor_resources WHERE id=$1", [id]);
}

// ========== Report ==========
export async function mentorCreateReport({ reporter_id, target_id, content }) {
  const result = await pool.query(
    `INSERT INTO reports (reporter_id, target_id, content, status, created_at)
     VALUES ($1, $2, $3, 'pending', NOW()) RETURNING *`,
    [reporter_id, target_id, content]
  );
  return result.rows[0];
}
