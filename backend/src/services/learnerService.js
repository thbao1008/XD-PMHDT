// backend/src/services/learnerService.js
import pool from "../config/db.js";
import { getPurchasesByLearner } from "../models/purchaseModel.js";
import * as learnerAiService from "./learnerAiService.js";

/* -------------------- Learners -------------------- */

export async function getAllLearners({ page, limit, q } = {}) {
  const result = await pool.query(`
    SELECT l.id AS learner_id,
           u.id AS user_id,
           u.name, u.email, u.phone, u.dob,
           l.mentor_id,
           (SELECT p.id 
              FROM purchases p 
             WHERE p.learner_id = l.id 
          ORDER BY p.created_at DESC 
             LIMIT 1) AS latest_purchase_id
    FROM learners l
    JOIN users u ON l.user_id = u.id
    ORDER BY l.id DESC
  `);
  return result.rows;
}

export async function getLearnerById(id) {
  const result = await pool.query(`
    SELECT l.id AS learner_id, l.mentor_id, u.*
    FROM learners l
    JOIN users u ON l.user_id = u.id
    WHERE l.id = $1
  `, [id]);
  return result.rows[0] || null;
}

export async function getLearnerPurchases(id) {
  return await getPurchasesByLearner(id);
}

export async function createLearner({ name, email, phone, dob, packageId }) {
  const userRes = await pool.query(`
    INSERT INTO users (name, email, phone, dob, role, status, created_at)
    VALUES ($1,$2,$3,$4,'learner','active',NOW())
    RETURNING id
  `, [name, email, phone, dob]);
  const userId = userRes.rows[0].id;

  const learnerRes = await pool.query(`
    INSERT INTO learners (user_id, mentor_id, start_date, created_at, updated_at)
    VALUES ($1, NULL, NOW(), NOW(), NOW())
    RETURNING id, mentor_id
  `, [userId]);
  const learnerId = learnerRes.rows[0].id;
  const mentorId = learnerRes.rows[0].mentor_id;

  if (packageId) {
    await pool.query(`
      INSERT INTO purchases (learner_id, package_id, status, created_at, extra_days)
      VALUES ($1, $2, 'active', NOW(), 0)
    `, [learnerId, packageId]);
  }

  return { learnerId, userId, mentorId };
}

export async function updateLearner(id, { name, email, phone, dob }) {
  const userIdRes = await pool.query("SELECT user_id FROM learners WHERE id=$1", [id]);
  if (!userIdRes.rows[0]) return null;
  const userId = userIdRes.rows[0].user_id;

  await pool.query(`
    UPDATE users SET
      name = COALESCE($1, name),
      email = COALESCE($2, email),
      phone = COALESCE($3, phone),
      dob = COALESCE($4, dob),
      updated_at = NOW()
    WHERE id=$5
  `, [name, email, phone, dob, userId]);

  return true;
}

export async function reassignMentorService(id) {
  const learnerRes = await pool.query("SELECT id FROM learners WHERE id=$1", [id]);
  if (!learnerRes.rows[0]) return null;

  await pool.query("UPDATE learners SET mentor_id=NULL, updated_at=NOW() WHERE id=$1", [id]);
  const updatedRes = await pool.query("SELECT mentor_id FROM learners WHERE id=$1", [id]);
  return updatedRes.rows[0].mentor_id;
}

export async function deleteLearner(id) {
  await pool.query("DELETE FROM learners WHERE id=$1", [id]);
  return true;
}

export async function getLatestPurchaseService(id) {
  const result = await pool.query(
    `SELECT *
     FROM learner_package_view
     WHERE learner_id = $1
     ORDER BY purchase_id DESC
     LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function updateLearnerNoteService(learnerId, note) {
  const result = await pool.query(
    "UPDATE learners SET note=$1, updated_at=NOW() WHERE id=$2 RETURNING *",
    [note, learnerId]
  );
  return result.rows[0] || null;
}

export async function createReportService({ mentor_id, learner_id, content }) {
  const result = await pool.query(
    `INSERT INTO reports (mentor_id, learner_id, content, status, created_at, updated_at)
     VALUES ($1,$2,$3,'pending',NOW(),NOW())
     RETURNING *`,
    [mentor_id, learner_id, content]
  );
  return result.rows[0];
}

export async function getMentorByLearnerIdService(id) {
  const result = await pool.query("SELECT mentor_id FROM learners WHERE id=$1", [id]);
  return result.rows[0]?.mentor_id || null;
}

export async function getLearnerByUserIdService(userId) {
  const result = await pool.query(
    "SELECT id, user_id, mentor_id FROM learners WHERE user_id = $1",
    [userId]
  );
  return result.rows[0] || null;
}

export async function downloadLearnerResourceService(learnerId, resourceId) {
  try {
    const result = await pool.query(
      `SELECT file_url 
       FROM mentor_resources 
       WHERE id = $1 
         AND mentor_id = (SELECT mentor_id FROM learners WHERE id = $2)`,
      [resourceId, learnerId]
    );

    return result.rows[0]?.file_url || null;
  } catch (err) {
    console.error("Error downloadLearnerResourceService: - learnerService.js:153", err);
    throw err;
  }
}

/* -------------------- Challenges / Learner view -------------------- */

export async function getChallenges({ query, level, topicId, page = 1, limit = 20 }) {
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
  const params = [];
  const where = [];

  if (query) {
    params.push(query);
    where.push(`c.title ILIKE '%' || $${params.length} || '%'`);
  }
  if (level) {
    params.push(level);
    where.push(`c.level = $${params.length}`);
  }
  if (topicId) {
    params.push(parseInt(topicId));
    where.push(`c.topic_id = $${params.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  params.push(parseInt(limit), offset);

  const sql = `
    SELECT c.id, c.topic_id, c.title, c.description, c.type, c.level, c.created_at,
           t.mentor_id,
           u.name AS mentor_name
    FROM challenges c
    JOIN topics t ON c.topic_id = t.id
    LEFT JOIN mentors m ON m.id = t.mentor_id
    LEFT JOIN users u ON u.id = m.user_id
    ${whereSql}
    ORDER BY c.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;
  const r = await pool.query(sql, params);
  return r.rows;
}

export async function getChallengeById(id) {
  const sql = `
    SELECT c.id, c.title, c.description, c.level, c.type, c.created_at,
           c.topic_id, t.mentor_id,
           u.name AS mentor_name
    FROM challenges c
    JOIN topics t ON c.topic_id = t.id
    LEFT JOIN mentors m ON m.id = t.mentor_id
    LEFT JOIN users u ON u.id = m.user_id
    WHERE c.id = $1
  `;
  const r = await pool.query(sql, [id]);
  return r.rows[0] || null;
}

export async function getLearnerChallenges(
  learnerId,
  { page = 1, limit = 20 } = {},
  mentorId = null
) {
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
  const params = [learnerId, parseInt(limit), offset];

  let sql = `
    SELECT c.id, c.title, c.description, c.level, c.type, c.created_at,
           t.mentor_id,
           lc.id AS learner_challenge_id, lc.status, lc.attempts, lc.score,
           lc.is_bookmarked, lc.last_attempt_at
    FROM challenges c
    JOIN topics t ON c.topic_id = t.id
    LEFT JOIN learner_challenges lc
      ON c.id = lc.challenge_id AND lc.learner_id = $1
  `; // ✅ fixed stray quote

  if (mentorId) {
    params.push(parseInt(mentorId));
    sql += ` WHERE t.mentor_id = $${params.length}`;
  }

  sql += ` ORDER BY c.created_at DESC LIMIT $2 OFFSET $3`;

  const r = await pool.query(sql, params);
  return r.rows;
}

/* -------------------- Submissions & learner_challenges -------------------- */

export async function getNextAttemptNumber(learnerId, challengeId) {
  const r = await pool.query(
    `SELECT COALESCE(MAX(attempt_number),0) + 1 AS next 
     FROM submissions 
     WHERE learner_id=$1 AND challenge_id=$2`,
    [learnerId, challengeId]
  );
  return r.rows[0].next;
}

export async function createSubmission({
  learnerId,
  challengeId,
  assignmentId = null,
  attemptNumber = 1,
  audioUrl,
  transcript = null
}) {
  const r = await pool.query(
    `INSERT INTO submissions 
       (learner_id, challenge_id, assignment_id, attempt_number, audio_url, transcript, status, submitted_at, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,'pending',NOW(),NOW()) 
     RETURNING *`,
    [learnerId, challengeId, assignmentId, attemptNumber, audioUrl, transcript]
  );
  return r.rows[0];
}

export async function getSubmissionById(id) {
  const r = await pool.query(
    `SELECT s.*,
            ar.overall_score, ar.pronunciation_score, ar.fluency_score, ar.grammar_issues, ar.pronunciation_issues, ar.suggestions, ar.raw_ai_response, ar.word_analysis,
            ar.topic, ar.topic_confidence, ar.topic_alignment,
            ar.created_at AS ai_report_at,
            (SELECT json_agg(mr.* ORDER BY mr.created_at DESC) 
             FROM mentor_reviews mr 
             WHERE mr.submission_id = s.id) AS mentor_reviews
     FROM submissions s
     LEFT JOIN ai_reports ar ON ar.submission_id = s.id
     WHERE s.id = $1`,
    [id]
  );
  return r.rows[0] || null;
}

export async function updateSubmissionTranscript(id, transcript) {
  const r = await pool.query(
    "UPDATE submissions SET transcript=$1, updated_at=NOW() WHERE id=$2 RETURNING *",
    [transcript, id]
  );
  return r.rows[0] || null;
}

export async function updateSubmissionStatus(id, status) {
  await pool.query("UPDATE submissions SET status=$1, updated_at=NOW() WHERE id=$2", [status, id]);
  return true;
}

export async function updateSubmissionAnalysis(submissionId, analysisObj) {
  const client = await pool.connect();
  try {
    const sql = `
      INSERT INTO ai_reports (
        submission_id,
        overall_score,
        pronunciation_score,
        fluency_score,
        grammar_issues,
        pronunciation_issues,
        suggestions,
        raw_ai_response,
        word_analysis,
        topic,
        topic_confidence,
        topic_alignment,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11, $12::jsonb, NOW(), NOW()
      )
      ON CONFLICT (submission_id) DO UPDATE SET
        overall_score = EXCLUDED.overall_score,
        pronunciation_score = EXCLUDED.pronunciation_score,
        fluency_score = EXCLUDED.fluency_score,
        grammar_issues = EXCLUDED.grammar_issues,
        pronunciation_issues = EXCLUDED.pronunciation_issues,
        suggestions = EXCLUDED.suggestions,
        raw_ai_response = EXCLUDED.raw_ai_response,
        word_analysis = EXCLUDED.word_analysis,
        topic = EXCLUDED.topic,
        topic_confidence = EXCLUDED.topic_confidence,
        topic_alignment = EXCLUDED.topic_alignment,
        updated_at = NOW()
      RETURNING *;
    `;

    // Merge thêm topic_detection_raw vào raw_ai_response
    const rawResp = {
      ...(analysisObj.raw_ai_response ?? {}),
      topic_detection_raw: analysisObj.topic_detection_raw ?? null
    };

    const values = [
      submissionId,
      analysisObj.overall_score ?? null,
      analysisObj.pronunciation_score ?? null,
      analysisObj.fluency_score ?? null,
      JSON.stringify(analysisObj.grammar_issues ?? []),
      JSON.stringify(analysisObj.pronunciation_issues ?? []),
      JSON.stringify(analysisObj.suggestions ?? []),
      JSON.stringify(rawResp),
      JSON.stringify(analysisObj.word_analysis ?? []),
      analysisObj.topic ?? null,
      analysisObj.topic_confidence ?? null,
      JSON.stringify(analysisObj.topic_alignment ?? null)
    ];

    const res = await client.query(sql, values);
    return res.rows[0];
  } finally {
    client.release();
  }
}


export async function getAnalysisBySubmissionId(submissionId) {
  const client = await pool.connect();
  try {
    const sql = `
      SELECT
        submission_id,
        overall_score,
        pronunciation_score,
        fluency_score,
        grammar_issues,
        pronunciation_issues,
        suggestions,
        raw_ai_response,
        word_analysis,
        topic,
        topic_confidence,
        topic_alignment,
        created_at,
        updated_at
      FROM ai_reports
      WHERE submission_id = $1
    `;
    const res = await client.query(sql, [submissionId]);
    if (!res.rows[0]) return null;

    const row = res.rows[0];

    // Parse raw_ai_response JSON để lấy topic_detection_raw
    let rawResp = {};
    try {
      rawResp = typeof row.raw_ai_response === "string"
        ? JSON.parse(row.raw_ai_response)
        : row.raw_ai_response || {};
    } catch {
      rawResp = {};
    }

    return {
      ...row,
      raw_ai_response: rawResp,
      topic_detection_raw: rawResp.topic_detection_raw ?? null
    };
  } finally {
    client.release();
  }
}


/* Convenience wrapper: analyze a submission using learnerAiService and persist result */
export async function analyzeSubmissionWithAI(submissionId) {
  const sub = await getSubmissionById(submissionId);
  if (!sub || !sub.transcript) throw new Error("Transcript not found");

  const result = await learnerAiService.analyzeLearnerTranscript(
    sub.transcript,
    { runTopicDetection: true, challenge: null }
  );

  return await updateSubmissionAnalysis(submissionId, result);
}

export async function upsertLearnerChallenge({
  learnerId, challengeId, assignmentId = null, status = "in_progress", attempts = 0, is_bookmarked = false
}) {
  const r = await pool.query(
    `INSERT INTO learner_challenges (learner_id, challenge_id, assignment_id, status, attempts, is_bookmarked, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
     ON CONFLICT (learner_id, challenge_id)
     DO UPDATE SET
       status = EXCLUDED.status,
       attempts = learner_challenges.attempts + GREATEST(EXCLUDED.attempts,0),
       is_bookmarked = EXCLUDED.is_bookmarked,
       updated_at = NOW()
     RETURNING *;`,
    [learnerId, challengeId, assignmentId, status, attempts, is_bookmarked]
  );
  return r.rows[0];
}

export async function listSubmissionsForLearner(learnerId, { limit = 100 } = {}) {
  const r = await pool.query(
    `SELECT s.*,
            ar.overall_score, ar.created_at AS ai_report_at
     FROM submissions s
     LEFT JOIN ai_reports ar ON ar.submission_id = s.id
     WHERE s.learner_id = $1
     ORDER BY s.submitted_at DESC
     LIMIT $2`,
    [learnerId, parseInt(limit)]
  );
  return r.rows;
}

export async function reviewSubmissionByMentor(submissionId, {
  mentorId, finalScore = null, feedback = null, overrideAI = false
}) {
  await pool.query(
    `UPDATE submissions SET status = 'reviewed', mentor_reviewed = true, updated_at = NOW() WHERE id = $1`,
    [submissionId]
  );

  const r = await pool.query(
    `INSERT INTO mentor_reviews (submission_id, mentor_id, final_score, feedback, created_at)
     VALUES ($1,$2,$3,$4,NOW())
     RETURNING *`,
    [submissionId, mentorId, finalScore, feedback]
  );

  if (overrideAI && finalScore != null) {
    await pool.query(
      `UPDATE ai_reports SET overall_score = $1 WHERE submission_id = $2`,
      [finalScore, submissionId]
    );
  }

  return await getSubmissionById(submissionId);
}

export async function updateLearnerChallenge(id, payload) {
  const fields = [];
  const params = [];
  let idx = 1;
  for (const key of Object.keys(payload)) {
    fields.push(`${key} = $${idx++}`);
    params.push(payload[key]);
  }
  if (fields.length === 0) return null;
  params.push(id);
  const sql = `UPDATE learner_challenges SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${idx} RETURNING *`;
  const r = await pool.query(sql, params);
  return r.rows[0] || null;
}

export async function saveSubmissionAnalysis(submissionId, analysis) {
  return db("submission_analysis")
    .insert({ submission_id: submissionId, analysis: JSON.stringify(analysis) })
    .onConflict("submission_id")
    .merge();
}
export async function updateSubmissionSegments(submissionId, segments) {
  return pool.query(
    "UPDATE submissions SET segments = $1, updated_at = NOW() WHERE id = $2",
    [JSON.stringify(segments), submissionId]
  );
}
