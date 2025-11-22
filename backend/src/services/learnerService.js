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

// Xóa learner khỏi mentor: ban user, set mentor_id = NULL, KHÔNG xóa lịch sử
export async function removeLearnerFromMentor(learnerId, mentorId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Lấy user_id từ learner_id
    const learnerRes = await client.query(
      "SELECT user_id FROM learners WHERE id=$1",
      [learnerId]
    );
    if (!learnerRes.rows[0]) {
      throw new Error("Learner not found");
    }
    const userId = learnerRes.rows[0].user_id;

    // Ban user (set status = 'banned')
    await client.query(
      "UPDATE users SET status='banned', updated_at=NOW() WHERE id=$1",
      [userId]
    );

    // Set mentor_id = NULL (KHÔNG xóa lịch sử)
    await client.query(
      "UPDATE learners SET mentor_id=NULL, updated_at=NOW() WHERE id=$1",
      [learnerId]
    );

    // Pause purchases
    await client.query(
      `UPDATE purchases SET status='paused' 
       WHERE learner_id=$1 AND status='active'`,
      [learnerId]
    );

    await client.query("COMMIT");
    return { success: true };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Đổi mentor: thêm mentor cũ vào blocklist, tự động gán mentor mới
export async function changeMentor(learnerId, oldMentorId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Thêm mentor cũ vào blocklist
    if (oldMentorId) {
      // Kiểm tra xem đã có trong blocklist chưa
      const existingCheck = await client.query(
        `SELECT id FROM mentor_blocklist WHERE mentor_id = $1 AND learner_id = $2`,
        [oldMentorId, learnerId]
      );
      if (existingCheck.rows.length === 0) {
        await client.query(
          `INSERT INTO mentor_blocklist (mentor_id, learner_id, created_at)
           VALUES ($1, $2, NOW())`,
          [oldMentorId, learnerId]
        );
      }
    }

    // Tự động chọn mentor mới (ưu tiên ít học viên, rating cao)
    const mentorRes = await client.query(`
      SELECT m.id AS mentor_id
      FROM mentors m
      JOIN users u ON m.user_id = u.id
      LEFT JOIN learners l ON l.mentor_id = m.id
      WHERE NOT EXISTS (
        SELECT 1 FROM mentor_blocklist mb
        WHERE mb.learner_id = $1 AND mb.mentor_id = m.id
      )
      AND u.status = 'active'
      GROUP BY m.id
      HAVING COUNT(l.id) < 15
      ORDER BY COUNT(l.id) ASC, m.rating DESC NULLS LAST
      LIMIT 1
    `, [learnerId]);

    const newMentorId = mentorRes.rows[0]?.mentor_id || null;

    if (newMentorId) {
      // Gán mentor mới
      await client.query(
        "UPDATE learners SET mentor_id=$1, updated_at=NOW() WHERE id=$2",
        [newMentorId, learnerId]
      );
    } else {
      // Không có mentor nào có sẵn, set mentor_id = NULL
      await client.query(
        "UPDATE learners SET mentor_id=NULL, updated_at=NOW() WHERE id=$1",
        [learnerId]
      );
    }

    await client.query("COMMIT");
    return { success: true, newMentorId };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Lấy danh sách mentors có sẵn để gán (không bị blocklist, ưu tiên ít học viên và rating cao)
export async function getAvailableMentorsForLearner(learnerId) {
  const result = await pool.query(`
    SELECT 
      m.id AS mentor_id,
      u.id AS user_id,
      u.name AS mentor_name,
      m.rating,
      COUNT(l.id) AS learner_count
    FROM mentors m
    JOIN users u ON m.user_id = u.id
    LEFT JOIN learners l ON l.mentor_id = m.id
    WHERE NOT EXISTS (
      SELECT 1 FROM mentor_blocklist mb
      WHERE mb.learner_id = $1 AND mb.mentor_id = m.id
    )
    AND u.status = 'active'
    GROUP BY m.id, u.id, u.name, m.rating
    HAVING COUNT(l.id) < 15
    ORDER BY COUNT(l.id) ASC, m.rating DESC NULLS LAST
  `, [learnerId]);
  return result.rows;
}

// Xử lý khi mentor bị ban: giải phóng learners, thêm vào blocklist, chia đều cho mentors khác
export async function handleMentorBanned(mentorId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Lấy tất cả learners của mentor này
    const learnersRes = await client.query(
      "SELECT id FROM learners WHERE mentor_id = $1",
      [mentorId]
    );
    const learners = learnersRes.rows;

    if (learners.length === 0) {
      await client.query("COMMIT");
      return { success: true, reassignedCount: 0 };
    }

    // 2. Lấy danh sách mentors có sẵn (không bị ban, không quá 15 learners)
    const availableMentorsRes = await client.query(`
      SELECT 
        m.id AS mentor_id,
        COUNT(l.id) AS learner_count,
        m.rating
      FROM mentors m
      JOIN users u ON m.user_id = u.id
      LEFT JOIN learners l ON l.mentor_id = m.id
      WHERE m.id != $1
        AND u.status = 'active'
      GROUP BY m.id, m.rating
      HAVING COUNT(l.id) < 15
      ORDER BY COUNT(l.id) ASC, m.rating DESC NULLS LAST
    `, [mentorId]);
    const availableMentors = availableMentorsRes.rows;

    if (availableMentors.length === 0) {
      // Không có mentor nào có sẵn, set mentor_id = NULL cho tất cả learners
      for (const learner of learners) {
        // Thêm vào blocklist (kiểm tra trước)
        const existingCheck = await client.query(
          `SELECT id FROM mentor_blocklist WHERE mentor_id = $1 AND learner_id = $2`,
          [mentorId, learner.id]
        );
        if (existingCheck.rows.length === 0) {
          await client.query(
            `INSERT INTO mentor_blocklist (mentor_id, learner_id, created_at)
             VALUES ($1, $2, NOW())`,
            [mentorId, learner.id]
          );
        }
        // Set mentor_id = NULL
        await client.query(
          "UPDATE learners SET mentor_id = NULL, updated_at = NOW() WHERE id = $1",
          [learner.id]
        );
        // Cập nhật schedules: set mentor_id = NULL hoặc xóa (tùy logic)
        await client.query(
          "UPDATE schedules SET mentor_id = NULL, status = 'cancelled', updated_at = NOW() WHERE learner_id = $1 AND mentor_id = $2",
          [learner.id, mentorId]
        );
      }
      await client.query("COMMIT");
      return { success: true, reassignedCount: 0, message: "Không có mentor nào có sẵn" };
    }

    // 3. Chia đều learners cho các mentors có sẵn (round-robin)
    let reassignedCount = 0;
    for (let i = 0; i < learners.length; i++) {
      const learner = learners[i];
      const mentorIndex = i % availableMentors.length;
      const newMentor = availableMentors[mentorIndex];

      // Thêm mentor cũ vào blocklist (kiểm tra trước)
      const existingCheck = await client.query(
        `SELECT id FROM mentor_blocklist WHERE mentor_id = $1 AND learner_id = $2`,
        [mentorId, learner.id]
      );
      if (existingCheck.rows.length === 0) {
        await client.query(
          `INSERT INTO mentor_blocklist (mentor_id, learner_id, created_at)
           VALUES ($1, $2, NOW())`,
          [mentorId, learner.id]
        );
      }

      // Gán mentor mới
      await client.query(
        "UPDATE learners SET mentor_id = $1, updated_at = NOW() WHERE id = $2",
        [newMentor.mentor_id, learner.id]
      );

      // Cập nhật schedules: chuyển mentor_id sang mentor mới
      await client.query(
        "UPDATE schedules SET mentor_id = $1, updated_at = NOW() WHERE learner_id = $2 AND mentor_id = $3",
        [newMentor.mentor_id, learner.id, mentorId]
      );

      reassignedCount++;
    }

    await client.query("COMMIT");
    return { success: true, reassignedCount, totalLearners: learners.length };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
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

/**
 * Get mentor info for learner feedback (including current rating)
 */
export async function getMentorInfoForFeedback(learnerId) {
  const result = await pool.query(
    `SELECT m.id AS mentor_id, m.rating, u.id AS mentor_user_id, u.name AS mentor_name
     FROM learners l
     JOIN mentors m ON l.mentor_id = m.id
     JOIN users u ON m.user_id = u.id
     WHERE l.id = $1`,
    [learnerId]
  );
  return result.rows[0] || null;
}

/**
 * Check if learner can feedback mentor (28 days since last feedback)
 */
export async function canFeedbackMentor(learnerId, mentorId) {
  const result = await pool.query(
    `SELECT MAX(created_at) AS last_feedback_date
     FROM feedbacks
     WHERE learner_id = $1 AND mentor_id = $2 AND submission_id IS NULL`,
    [learnerId, mentorId]
  );
  
  const lastDate = result.rows[0]?.last_feedback_date;
  if (!lastDate) return { canFeedback: true, daysRemaining: 0 };
  
  const daysSince = Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
  const canFeedback = daysSince >= 28;
  const daysRemaining = canFeedback ? 0 : 28 - daysSince;
  
  return { canFeedback, daysRemaining, lastFeedbackDate: lastDate };
}

/**
 * Get learner feedbacks for mentor (not related to submissions)
 */
export async function getLearnerFeedbacksForMentor(learnerId, mentorId) {
  // Join rating từ bảng mentors (rating hiện tại của mentor)
  const result = await pool.query(
    `SELECT f.id, f.content, f.created_at, f.updated_at,
            m.rating AS mentor_rating
     FROM feedbacks f
     LEFT JOIN mentors m ON m.id = f.mentor_id
     WHERE f.learner_id = $1 AND f.mentor_id = $2 AND f.submission_id IS NULL
     ORDER BY f.created_at DESC`,
    [learnerId, mentorId]
  );
  // Map để giữ tương thích với frontend (frontend đang expect rating)
  return result.rows.map(row => ({
    ...row,
    rating: row.mentor_rating // Sử dụng mentor_rating làm rating cho mỗi feedback
  }));
}

/**
 * Create learner feedback for mentor (update mentor rating)
 * rating: 0-10 scale
 */
export async function createLearnerFeedbackForMentor(learnerId, mentorId, { content, rating }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Check 28 days constraint
    const canFeedback = await canFeedbackMentor(learnerId, mentorId);
    if (!canFeedback.canFeedback) {
      await client.query("ROLLBACK");
      return {
        ok: false,
        status: 400,
        message: `Bạn chỉ có thể đánh giá mentor mỗi 28 ngày. Còn ${canFeedback.daysRemaining} ngày nữa.`
      };
    }
    
    // Insert feedback (submission_id = NULL để phân biệt với submission feedbacks)
    // KHÔNG lưu rating vào feedbacks vì bảng không có cột rating
    // Lưu ý: submission_id có thể là NULL nếu bảng cho phép, nếu không thì cần sửa constraint
    const feedbackRes = await client.query(
      `INSERT INTO feedbacks (submission_id, learner_id, mentor_id, content, created_at)
       VALUES (NULL, $1, $2, $3, NOW())
       RETURNING id, created_at`,
      [learnerId, mentorId, content || null]
    );
    
    // Calculate new average rating for mentor từ bảng mentors hiện tại
    // Lấy rating hiện tại và số lượng feedbacks để tính trung bình
    if (rating !== null && rating !== undefined) {
      // Lấy rating hiện tại của mentor
      const currentMentor = await client.query(
        `SELECT rating FROM mentors WHERE id = $1`,
        [mentorId]
      );
      const currentRating = currentMentor.rows[0]?.rating || null;
      
      // Đếm số feedbacks đã có (không tính submission feedbacks)
      const countRes = await client.query(
        `SELECT COUNT(*) AS count
         FROM feedbacks
         WHERE mentor_id = $1 AND submission_id IS NULL`,
        [mentorId]
      );
      const feedbackCount = parseInt(countRes.rows[0]?.count || 0);
      
      // Tính trung bình: (currentRating * (count-1) + newRating) / count
      let newRating;
      if (currentRating === null || feedbackCount === 1) {
        // Nếu chưa có rating hoặc đây là feedback đầu tiên
        newRating = rating;
      } else {
        // Tính trung bình từ rating cũ và rating mới
        const totalRating = (parseFloat(currentRating) * (feedbackCount - 1)) + parseFloat(rating);
        newRating = (totalRating / feedbackCount).toFixed(2);
      }
      
      console.log(`[learnerService] Updating mentor ${mentorId} rating to ${newRating} (from ${feedbackCount} feedbacks, new rating: ${rating})`);
      
      // Update mentor rating
      await client.query(
        `UPDATE mentors SET rating = $1::numeric, updated_at = NOW() WHERE id = $2`,
        [newRating, mentorId]
      );
    }
    
    await client.query("COMMIT");
    
    return {
      ok: true,
      feedback: feedbackRes.rows[0],
      newRating: rating !== null && rating !== undefined ? (await pool.query(
        `SELECT rating FROM mentors WHERE id = $1`,
        [mentorId]
      )).rows[0]?.rating : null
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
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
  
  const submission = r.rows[0];
  
  // Lưu để Challenge Creator AI học (async, không block)
  try {
    const challengeLearningService = await import("./challengeLearningService.js");
    await challengeLearningService.learnFromLearnerSubmission(
      submission.id,
      challengeId,
      learnerId
    ).catch(err => console.warn("⚠️ Failed to save learner submission for AI learning:", err));
  } catch (err) {
    // Ignore errors, không block response
  }
  
  return submission;
}

export async function getSubmissionById(id) {
  const r = await pool.query(
    `SELECT s.*,
            ar.overall_score, ar.pronunciation_score, ar.fluency_score, ar.grammar_issues, ar.pronunciation_issues, ar.suggestions, ar.raw_ai_response, ar.word_analysis,
            ar.topic, ar.topic_confidence, ar.topic_alignment,
            ar.created_at AS ai_report_at,
            -- lấy learner_challenges (chỉ status, attempts)
            lc.id AS learner_challenge_id, lc.status AS lc_status, lc.attempts AS lc_attempts,
            -- lấy feedback từ feedbacks theo submission_id (mỗi submission có feedback riêng)
            f.id AS feedback_id, 
            f.content AS feedback_content, 
            f.audio_url AS feedback_audio_url,
            f.final_score AS feedback_final_score,
            f.pronunciation_score AS feedback_pronunciation_score,
            f.fluency_score AS feedback_fluency_score,
            f.created_at AS feedback_created_at,
            f.updated_at AS feedback_updated_at
     FROM submissions s
     LEFT JOIN ai_reports ar ON ar.submission_id = s.id
     LEFT JOIN learners l ON s.learner_id = l.id
     LEFT JOIN learner_challenges lc ON lc.learner_id = s.learner_id AND lc.challenge_id = s.challenge_id
     LEFT JOIN feedbacks f ON f.submission_id = s.id
     WHERE s.id = $1`,
    [id]
  );
  if (!r.rows[0]) return null;

  const row = r.rows[0];

  // parse mentor_reviews removed; keep ai_reports parsing as before
  return {
    ...row,
    // normalize ai raw response
    raw_ai_response: (() => {
      try {
        return typeof row.raw_ai_response === "string" ? JSON.parse(row.raw_ai_response) : row.raw_ai_response || null;
      } catch {
        return null;
      }
    })(),
    // Mentor review từ feedbacks (theo submission_id)
    mentor_review: row.feedback_id ? {
      id: row.feedback_id,
      final_score: row.feedback_final_score,
      pronunciation_score: row.feedback_pronunciation_score,
      fluency_score: row.feedback_fluency_score,
      feedback: row.feedback_content,
      audio_url: row.feedback_audio_url,
      created_at: row.feedback_created_at,
      updated_at: row.feedback_updated_at
    } : null,
    learner_challenge: row.learner_challenge_id ? {
      id: row.learner_challenge_id,
      status: row.lc_status,
      attempts: row.lc_attempts
    } : null
  };
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
  mentorId, finalScore = null, feedback = null, pronunciation_score = null, fluency_score = null, audio_url = null, overrideAI = false
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // verify submission + learner + challenge
    const check = await client.query(
      `SELECT s.id AS submission_id, s.learner_id, s.challenge_id, l.mentor_id
       FROM submissions s
       JOIN learners l ON s.learner_id = l.id
       WHERE s.id = $1
       LIMIT 1`,
      [submissionId]
    );
    if (check.rows.length === 0) {
      await client.query("ROLLBACK");
      return { ok: false, status: 404, message: "Submission not found" };
    }
    const { learner_id, challenge_id, mentor_id } = check.rows[0];
    if (Number(mentor_id) !== Number(mentorId)) {
      await client.query("ROLLBACK");
      return { ok: false, status: 403, message: "Forbidden: learner not assigned to this mentor" };
    }

    // tạo feedback nếu có text hoặc audio
    let feedbackId = null;
    if (feedback || audio_url) {
      const fRes = await client.query(
        `INSERT INTO feedbacks (submission_id, learner_id, mentor_id, content, audio_url, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id`,
        [submissionId, learner_id, mentorId, feedback || null, audio_url || null]
      );
      feedbackId = fRes.rows[0]?.id || null;
    }

    // upsert learner_challenges: lưu điểm + feedback_id + status
    const lcRes = await client.query(
      `INSERT INTO learner_challenges
         (learner_id, challenge_id, final_score, pronunciation_score, fluency_score, feedback_id, status, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,'completed',NOW())
       ON CONFLICT (learner_id, challenge_id)
       DO UPDATE SET
         final_score = EXCLUDED.final_score,
         pronunciation_score = EXCLUDED.pronunciation_score,
         fluency_score = EXCLUDED.fluency_score,
         feedback_id = COALESCE(EXCLUDED.feedback_id, learner_challenges.feedback_id),
         status = 'completed',
         updated_at = NOW()
       RETURNING *`,
      [
        learner_id,
        challenge_id,
        finalScore ?? null,
        pronunciation_score ?? null,
        fluency_score ?? null,
        feedbackId
      ]
    );

    // (tuỳ chọn) cập nhật ai_reports nếu overrideAI
    if (overrideAI && finalScore != null) {
      await client.query(
        `UPDATE ai_reports SET overall_score = $1, updated_at = NOW() WHERE submission_id = $2`,
        [finalScore, submissionId]
      );
    }

    // cập nhật trạng thái submission nếu bạn muốn (nếu cột tồn tại)
    // chỉ cập nhật cột tồn tại: tránh lỗi nếu submissions không có cột final_score...
    // ví dụ cập nhật status
    await client.query(
      `UPDATE submissions SET status = 'reviewed', updated_at = NOW() WHERE id = $1`,
      [submissionId]
    );

    await client.query("COMMIT");
    
    // Lưu challenge evaluation để AI học (async, không block)
    if (finalScore !== null && finalScore !== undefined) {
      try {
        const progressAnalyticsService = await import("./progressAnalyticsService.js");
        await progressAnalyticsService.learnFromChallengeEvaluation(
          learner_id,
          challenge_id,
          submissionId,
          {
            final_score: finalScore,
            pronunciation_score: pronunciation_score,
            fluency_score: fluency_score
          },
          feedback || ""
        ).catch(err => {
          console.warn("⚠️ Failed to save challenge evaluation for AI learning:", err);
        });
      } catch (err) {
        // Ignore errors, không block response
      }
    }
    
    return {
      ok: true,
      learner_challenge: lcRes.rows[0],
      feedback_id: feedbackId
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
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
