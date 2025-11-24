// Mentor Service
import pool from "../config/db.js";
import { getWeekRange, validateWeeklyConstraint } from "./utils.js";
import * as mentorAiService from "./mentorAiService.js";

/* =========================
  Mentor CRUD and helpers
  ========================= */

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

  return { mentorId: mentorRes.rows[0].id, userId };
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

/* =========================
  Learners
  ========================= */

export async function getLearnersByMentor(mentorId) {
  const mentorUserIdRes = await pool.query(
    `SELECT user_id FROM mentors WHERE id = $1`,
    [mentorId]
  );
  const mentorUserId = mentorUserIdRes.rows[0]?.user_id;
  
  if (!mentorUserId) {
    const result = await pool.query(`
      SELECT lp.*, l.user_id,
            NULL AS report_id, NULL AS report,
            NULL AS report_status, NULL AS report_reply,
            NULL AS reply_by, NULL AS reply_at
      FROM learner_package_view lp
      JOIN learners l ON lp.learner_id = l.id
      WHERE lp.mentor_id = $1
      ORDER BY lp.learner_id DESC
    `, [mentorId]);
    return result.rows;
  }
  
  const result = await pool.query(`
    SELECT lp.*, l.user_id,
          r.id AS report_id, 
          r.content AS report,
          r.status AS report_status, 
          r.reply AS report_reply,
          r.reply_by, 
          r.reply_at
    FROM learner_package_view lp
    JOIN learners l ON lp.learner_id = l.id
    LEFT JOIN (
      SELECT r1.*
      FROM reports r1
      INNER JOIN (
        SELECT target_id, MAX(created_at) AS max_created_at
        FROM reports
        WHERE reporter_id = $2
        GROUP BY target_id
      ) r2 ON r1.target_id = r2.target_id 
           AND r1.created_at = r2.max_created_at
           AND r1.reporter_id = $2
    ) r ON r.target_id = l.user_id
    WHERE lp.mentor_id = $1
    ORDER BY lp.learner_id DESC
  `, [mentorId, mentorUserId]);
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

/* =========================
  Resources
  ========================= */

export async function getResourcesByMentor(mentorId, includeHidden = true) {
  let query = "SELECT * FROM mentor_resources WHERE mentor_id = $1";
  const params = [mentorId];
  if (!includeHidden) {
    query += " AND is_published = true";
  }
  query += " ORDER BY created_at DESC";
  const result = await pool.query(query, params);
  return result.rows;
}

export async function createResource({ mentor_id, title, description, type, file_url, is_published = true }) {
  const result = await pool.query(
    `INSERT INTO mentor_resources (mentor_id, title, description, type, file_url, is_published)
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [mentor_id, title, description, type, file_url, is_published]
  );
  return result.rows[0];
}

export async function updateResource(id, fields) {
  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (fields.title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    values.push(fields.title);
  }
  if (fields.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(fields.description);
  }
  if (fields.type !== undefined) {
    updates.push(`type = $${paramIndex++}`);
    values.push(fields.type);
  }
  if (fields.file_url !== undefined) {
    updates.push(`file_url = $${paramIndex++}`);
    values.push(fields.file_url);
  }
  if (fields.is_published !== undefined) {
    updates.push(`is_published = $${paramIndex++}`);
    values.push(fields.is_published);
  }

  if (updates.length === 0) {
    const existing = await pool.query("SELECT * FROM mentor_resources WHERE id = $1", [id]);
    return existing.rows[0];
  }

  const columnCheck = await pool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'mentor_resources' 
    AND column_name = 'updated_at'
  `);
  
  if (columnCheck.rows.length > 0) {
    updates.push(`updated_at = NOW()`);
  }
  
  values.push(id);

  const result = await pool.query(
    `UPDATE mentor_resources SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0];
}

export async function deleteResource(id) {
  await pool.query("DELETE FROM mentor_resources WHERE id=$1", [id]);
}

export async function toggleResourceVisibility(id, is_published) {
  const result = await pool.query(
    `UPDATE mentor_resources SET is_published = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [is_published, id]
  );
  return result.rows[0];
}

/* =========================
  Report
  ========================= */

export async function mentorCreateReport({ reporter_id, target_id, content, image_url, video_url }) {
  // Check if report already exists
  const existingReport = await pool.query(
    `SELECT id, status, created_at FROM reports
     WHERE reporter_id = $1 AND target_id = $2
     ORDER BY created_at DESC LIMIT 1`,
    [reporter_id, target_id]
  );
  
  // If report exists and status is 'pending' or 'rejected', allow update
  if (existingReport.rows.length > 0) {
    const existing = existingReport.rows[0];
    
    // If status is 'resolved' or 'dismissed', check 24h constraint
    if (existing.status === 'resolved' || existing.status === 'dismissed') {
      const lastReportTime = new Date(existing.created_at).getTime();
      const now = Date.now();
      const hoursSince = (now - lastReportTime) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        const hoursRemaining = Math.ceil(24 - hoursSince);
        const error = new Error(`Bạn chỉ có thể report lại sau 24 giờ. Còn ${hoursRemaining} giờ nữa.`);
        error.canReport = false;
        error.hoursRemaining = hoursRemaining;
        throw error;
      }
    }
    
    // Update existing report (if pending or rejected, allow update)
    try {
      const result = await pool.query(
        `UPDATE reports 
         SET content = $1, status = 'pending', updated_at = NOW(), image_url = COALESCE($2, image_url), video_url = COALESCE($3, video_url)
         WHERE id = $4 RETURNING *`,
        [content, image_url || null, video_url || null, existing.id]
      );
      return result.rows[0];
    } catch (err) {
      if (err.code === "42703" || err.message.includes("image_url") || err.message.includes("video_url")) {
        const result = await pool.query(
          `UPDATE reports 
           SET content = $1, status = 'pending', updated_at = NOW()
           WHERE id = $2 RETURNING *`,
          [content, existing.id]
        );
        return result.rows[0];
      }
      throw err;
    }
  }
  
  // Create new report if doesn't exist
  try {
    const result = await pool.query(
      `INSERT INTO reports (reporter_id, target_id, content, status, created_at, updated_at, image_url, video_url)
      VALUES ($1, $2, $3, 'pending', NOW(), NOW(), $4, $5) RETURNING *`,
      [reporter_id, target_id, content, image_url || null, video_url || null]
    );
    return result.rows[0];
  } catch (err) {
    if (err.code === "42703" || err.message.includes("image_url") || err.message.includes("video_url")) {
      const result = await pool.query(
        `INSERT INTO reports (reporter_id, target_id, content, status, created_at, updated_at)
        VALUES ($1, $2, $3, 'pending', NOW(), NOW()) RETURNING *`,
        [reporter_id, target_id, content]
      );
      return result.rows[0];
    }
    // If unique constraint violation, try to update instead
    if (err.code === "23505") {
      const existing = await pool.query(
        `SELECT id FROM reports WHERE reporter_id = $1 AND target_id = $2 ORDER BY created_at DESC LIMIT 1`,
        [reporter_id, target_id]
      );
      if (existing.rows.length > 0) {
        const result = await pool.query(
          `UPDATE reports 
           SET content = $1, status = 'pending', updated_at = NOW(), image_url = COALESCE($2, image_url), video_url = COALESCE($3, video_url)
           WHERE id = $4 RETURNING *`,
          [content, image_url || null, video_url || null, existing.rows[0].id]
        );
        return result.rows[0];
      }
    }
    throw err;
  }
}

/* =========================
  Topics & Challenges
  ========================= */

export async function getTopicsByMentor(mentorId) {
  const result = await pool.query(
    "SELECT * FROM topics WHERE mentor_id = $1 ORDER BY created_at DESC",
    [parseInt(mentorId)]
  );
  return result.rows;
}

export async function createTopic(mentorId, title, description, level) {
  const result = await pool.query(
    `INSERT INTO topics (mentor_id, title, description, level)
    VALUES ($1, $2, $3, $4) RETURNING *`,
    [parseInt(mentorId), title, description, level]
  );
  return result.rows[0];
}

export async function getChallengesByTopic(topicId) {
  const result = await pool.query(
    "SELECT * FROM challenges WHERE topic_id = $1 ORDER BY created_at DESC",
    [parseInt(topicId)]
  );
  return result.rows;
}

export async function getChallengesByMentor(mentorId) {
  const result = await pool.query(
    `SELECT c.* FROM challenges c
     WHERE c.mentor_id = $1
     ORDER BY c.created_at DESC`,
    [parseInt(mentorId)]
  );
  return result.rows;
}

export async function createChallenge(mentorId, title, description, type, level, created_by) {
  const result = await pool.query(
    `INSERT INTO challenges (mentor_id, title, description, type, level, created_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [parseInt(mentorId), title, description, type, level, created_by]
  );
  
  const challenge = result.rows[0];
  
  // Lưu để AI học (async, không block)
  try {
    // Lưu challenge creation để AI học (async, không block)
    try {
      const token = process.env.INTERNAL_SERVICE_TOKEN || ""; // Optional internal token
      await fetch(`${process.env.AI_SERVICE_URL || 'http://localhost:4010'}/api/ai/challenge/learn-creation`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          challengeId: challenge.id,
          mentorId: parseInt(mentorId)
        })
      }).catch(err => {
        console.warn("⚠️ Failed to save challenge creation for AI learning:", err);
      });
    } catch (err) {
      console.warn("⚠️ Failed to notify AI Service about challenge creation:", err);
    }
  } catch (err) {
    // Ignore errors
  }
  
  return challenge;
}

export async function deleteTopic(topicId) {
  const result = await pool.query(
    `DELETE FROM topics WHERE id = $1 RETURNING *`,
    [parseInt(topicId)]
  );
  if (result.rowCount === 0) {
    return null;
  }
  return true;
}

/* =========================
  Submissions & Reviews
  ========================= */

export async function getSubmissionForMentor(submissionId, mentorId) {
  const client = await pool.connect();
  try {
    const sql = `
      SELECT s.*,
             l.id AS learner_id, l.mentor_id,
             u.id AS learner_user_id, u.name AS learner_name, u.email AS learner_email, u.phone AS learner_phone,
             c.id AS challenge_id, c.title AS challenge_title, c.description AS challenge_description, c.type AS challenge_type, c.level AS challenge_level,
             lc.id AS learner_challenge_id, 
             lc.status AS lc_status, lc.attempts,
             f.id AS feedback_id,
             f.content AS feedback_text,
             f.audio_url AS feedback_audio_url,
             f.final_score AS feedback_final_score,
             f.pronunciation_score AS feedback_pronunciation_score,
             f.fluency_score AS feedback_fluency_score,
             f.created_at AS feedback_created_at,
             f.updated_at AS feedback_updated_at,
             ar.overall_score, ar.pronunciation_score AS ai_pronunciation_score, ar.fluency_score AS ai_fluency_score,
             ar.grammar_issues, ar.pronunciation_issues, ar.suggestions, ar.raw_ai_response, ar.word_analysis,
             ar.topic, ar.topic_confidence, ar.topic_alignment,
             ar.created_at AS ai_report_at
      FROM submissions s
      JOIN learners l ON s.learner_id = l.id
      JOIN users u ON l.user_id = u.id
      LEFT JOIN challenges c ON s.challenge_id = c.id
      LEFT JOIN learner_challenges lc 
        ON lc.challenge_id = s.challenge_id 
       AND lc.learner_id = l.id
      LEFT JOIN feedbacks f ON f.submission_id = s.id
      LEFT JOIN ai_reports ar ON ar.submission_id = s.id
      WHERE s.id = $1
      LIMIT 1
    `;
    const { rows } = await client.query(sql, [submissionId]);
    if (!rows.length) return null;
    const row = rows[0];
  
    const allowed = Number(row.mentor_id) === Number(mentorId);
  
    let transcript = null;
    try {
      transcript = typeof row.transcript === "string"
        ? JSON.parse(row.transcript)
        : row.transcript || null;
    } catch {
      transcript = null;
    }
  
    let word_analysis = null;
    let segments = null;
    let analysis = null;
    try {
      word_analysis = typeof row.word_analysis === "string" ? JSON.parse(row.word_analysis) : row.word_analysis;
      if (row.raw_ai_response) {
        const rawResp = typeof row.raw_ai_response === "string" ? JSON.parse(row.raw_ai_response) : row.raw_ai_response;
        segments = rawResp?.segments || null;
        analysis = {
          feedback: row.suggestions ? (typeof row.suggestions === "string" ? JSON.parse(row.suggestions) : row.suggestions) : null
        };
      }
    } catch (e) {
      console.warn("[mentorService] Error parsing AI report data:", e);
    }

    const submission = {
      id: row.id,
      title: row.title,
      audioUrl: row.audio_url || null,
      audio_url: row.audio_url || null,
      transcript,
      created_at: row.created_at,
      status: row.status,
      overall_score: row.overall_score ?? null,
      pronunciation_score: row.ai_pronunciation_score ?? null,
      fluency_score: row.ai_fluency_score ?? null,
      score: row.overall_score ?? null,
      mentor_pronunciation_score: row.feedback_pronunciation_score ?? null,
      mentor_fluency_score: row.feedback_fluency_score ?? null,
      final_score: row.feedback_final_score ?? null,
      word_analysis,
      segments,
      analysis,
      topic: row.topic ?? null,
      topic_confidence: row.topic_confidence ?? null,
      topic_alignment: row.topic_alignment ? (typeof row.topic_alignment === "string" ? JSON.parse(row.topic_alignment) : row.topic_alignment) : null,
      suggestions: row.suggestions ? (typeof row.suggestions === "string" ? JSON.parse(row.suggestions) : row.suggestions) : null,
      feedback: {
        text: row.feedback_text ?? null,
        audio_url: row.feedback_audio_url ?? null,
      },
      mentor_review: row.feedback_id ? {
        id: row.feedback_id,
        final_score: row.feedback_final_score,
        pronunciation_score: row.feedback_pronunciation_score,
        fluency_score: row.feedback_fluency_score,
        feedback: row.feedback_text,
        audio_url: row.feedback_audio_url,
        created_at: row.feedback_created_at,
        updated_at: row.feedback_updated_at
      } : null,
      learner: {
        id: row.learner_id,
        user_id: row.learner_user_id,
        name: row.learner_name,
        email: row.learner_email,
        phone: row.learner_phone
      },
      learner_challenge: row.learner_challenge_id ? {
        id: row.learner_challenge_id,
        final_score: row.feedback_final_score,
        pronunciation_score: row.feedback_pronunciation_score,
        fluency_score: row.feedback_fluency_score,
        feedback_text: row.feedback_text,
        feedback_audio_url: row.feedback_audio_url,
        status: row.lc_status,
        attempts: row.attempts
      } : null
    };
  
    const challenge = row.challenge_id ? {
      id: row.challenge_id,
      title: row.challenge_title,
      description: row.challenge_description,
      type: row.challenge_type,
      level: row.challenge_level
    } : null;
  
    return { allowed, submission, challenge };
  } finally {
    client.release();
  }
}

export async function listSubmissionsForMentor(
  mentorId,
  { limit = 50, offset = 0 } = {}
) {
  const res = await pool.query(
    `SELECT s.id, s.created_at, s.status, s.audio_url,
            s.challenge_id,
            lc.id AS learner_challenge_id,
            lc.status AS challenge_status, lc.attempts,
            f.final_score, f.pronunciation_score, f.fluency_score,
            f.content AS feedback,
            f.audio_url AS feedback_audio_url,
            c.title, c.level,
            l.id AS learner_id, u.name AS learner_name
     FROM submissions s
     JOIN challenges c ON s.challenge_id = c.id
     JOIN learners l ON s.learner_id = l.id
     JOIN users u ON l.user_id = u.id
     LEFT JOIN learner_challenges lc 
       ON lc.challenge_id = s.challenge_id 
      AND lc.learner_id = l.id
     LEFT JOIN feedbacks f ON f.submission_id = s.id
     WHERE l.mentor_id = $1
     ORDER BY s.created_at DESC
     LIMIT $2 OFFSET $3`,
    [mentorId, limit, offset]
  );
  return res.rows;
}

export async function saveMentorReview(submissionId, mentorId, payload) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
  
    const check = await client.query(
      `SELECT s.challenge_id, l.mentor_id, l.id AS learner_id 
       FROM submissions s 
       JOIN learners l ON s.learner_id = l.id 
       WHERE s.id = $1 LIMIT 1`,
      [submissionId]
    );
    if (check.rows.length === 0) {
      await client.query("ROLLBACK");
      return { ok: false, status: 404, message: "Submission not found" };
    }
    if (Number(check.rows[0].mentor_id) !== Number(mentorId)) {
      await client.query("ROLLBACK");
      return { ok: false, status: 403, message: "Forbidden: learner not assigned to this mentor" };
    }
  
    const { learner_id, challenge_id } = check.rows[0];
  
    const existingFeedback = await client.query(
      `SELECT id FROM feedbacks WHERE submission_id = $1 LIMIT 1`,
      [submissionId]
    );

    let feedbackId = null;
    if (existingFeedback.rows.length > 0) {
      const fRes = await client.query(
        `UPDATE feedbacks 
         SET content = COALESCE($1, content),
             audio_url = COALESCE($2, audio_url),
             final_score = $3::numeric,
             pronunciation_score = $4::numeric,
             fluency_score = $5::numeric,
             updated_at = NOW()
         WHERE submission_id = $6
         RETURNING id`,
        [
          payload.feedback || null,
          payload.audio_url || null,
          payload.final_score !== null && payload.final_score !== undefined ? payload.final_score : null,
          payload.pronunciation_score !== null && payload.pronunciation_score !== undefined ? payload.pronunciation_score : null,
          payload.fluency_score !== null && payload.fluency_score !== undefined ? payload.fluency_score : null,
          submissionId
        ]
      );
      feedbackId = fRes.rows[0]?.id || existingFeedback.rows[0].id;
    } else {
      const fRes = await client.query(
        `INSERT INTO feedbacks (submission_id, learner_id, mentor_id, content, audio_url, final_score, pronunciation_score, fluency_score, created_at)
         VALUES ($1, $2, $3, $4, $5, $6::numeric, $7::numeric, $8::numeric, NOW())
         RETURNING id`,
        [
          submissionId, 
          learner_id, 
          mentorId, 
          payload.feedback || null, 
          payload.audio_url || null,
          payload.final_score !== null && payload.final_score !== undefined ? payload.final_score : null,
          payload.pronunciation_score !== null && payload.pronunciation_score !== undefined ? payload.pronunciation_score : null,
          payload.fluency_score !== null && payload.fluency_score !== undefined ? payload.fluency_score : null
        ]
      );
      feedbackId = fRes.rows[0]?.id || null;
    }

    const learnerChallengeRes = await client.query(
      `INSERT INTO learner_challenges 
         (learner_id, challenge_id, feedback_id, status, updated_at)
       VALUES ($1, $2, $3, 'completed', NOW())
       ON CONFLICT (learner_id, challenge_id)
       DO UPDATE SET
         feedback_id = COALESCE(EXCLUDED.feedback_id, learner_challenges.feedback_id),
         status = 'completed',
         updated_at = NOW()
       RETURNING *`,
      [
        learner_id,
        challenge_id,
        feedbackId
      ]
    );
  
    await client.query("COMMIT");
    
    if (payload.audio_url && feedbackId) {
      try {
        const { enqueue } = await import("../utils/queue.js");
        await enqueue("processMentorAudioFeedback", {
          feedbackId,
          audioUrl: payload.audio_url,
          submissionId,
          scores: {
            final_score: payload.final_score,
            pronunciation_score: payload.pronunciation_score,
            fluency_score: payload.fluency_score
          }
        });
        console.log("✅ Queued mentor audio feedback for AI learning:", feedbackId);
      } catch (err) {
        console.error("⚠️ Failed to queue mentor audio feedback:", err);
      }
    }
    
    // Note: progressAnalyticsService và challengeLearningService sẽ được migrate sau
    // Tạm thời bỏ qua các async learning calls
    
    const reviewData = {
      id: feedbackId,
      submission_id: submissionId,
      final_score: payload.final_score ?? null,
      pronunciation_score: payload.pronunciation_score ?? null,
      fluency_score: payload.fluency_score ?? null,
      feedback: payload.feedback || null,
      audio_url: payload.audio_url || null
    };
    
    return { 
      ok: true,
      review: reviewData,
      feedback_id: feedbackId,
      learner_challenge: learnerChallengeRes.rows[0]
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function listReviewsByMentor(mentorId, { limit = 50, offset = 0 } = {}) {
  const res = await pool.query(
    `SELECT r.*, s.id AS submission_id, s.title AS submission_title, u.name AS learner_name
    FROM mentor_reviews r
    JOIN submissions s ON r.submission_id = s.id
    JOIN learners l ON s.learner_id = l.id
    JOIN users u ON l.user_id = u.id
    WHERE r.mentor_id = $1
    ORDER BY r.created_at DESC
    LIMIT $2 OFFSET $3`,
    [mentorId, limit, offset]
  );
  return res.rows;
}

export async function deleteChallenge(challengeId) {
  const res = await pool.query(`DELETE FROM challenges WHERE id = $1 RETURNING *`, [parseInt(challengeId)]);
  if (res.rowCount === 0) return null;
  return true;
}

export async function createChallengeAI(topicId, prompt, level = "medium") {
  // Placeholder - will be implemented with AI Service integration
  return null;
}

export async function editChallengeAI(challengeId, content) {
  try {
    const currentChallenge = await pool.query(
      "SELECT * FROM challenges WHERE id = $1",
      [parseInt(challengeId)]
    );
    
    if (currentChallenge.rows.length === 0) {
      throw new Error("Challenge not found");
    }
    
    const existingContent = currentChallenge.rows[0].description || "";
    
    const improvedContent = await mentorAiService.editChallengeAI(
      existingContent || content,
      content
    );
    
    const updated = await pool.query(
      `UPDATE challenges 
       SET description = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [improvedContent, parseInt(challengeId)]
    );
    
    return {
      challenge: updated.rows[0],
      issues: []
    };
  } catch (err) {
    console.error("editChallengeAI error in mentorService:", err);
    throw err;
  }
}

export async function updateChallenge(challengeId, fields) {
  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (fields.title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    values.push(fields.title);
  }
  if (fields.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(fields.description);
  }
  if (fields.type !== undefined) {
    updates.push(`type = $${paramIndex++}`);
    values.push(fields.type);
  }
  if (fields.level !== undefined) {
    updates.push(`level = $${paramIndex++}`);
    values.push(fields.level);
  }

  if (updates.length === 0) {
    const existing = await pool.query("SELECT * FROM challenges WHERE id = $1", [parseInt(challengeId)]);
    return existing.rows[0];
  }

  updates.push(`updated_at = NOW()`);
  values.push(parseInt(challengeId));

  const result = await pool.query(
    `UPDATE challenges SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0];
}

