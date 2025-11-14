import pool from "../config/db.js";
import { getPurchasesByLearner } from "../models/purchaseModel.js";

export async function getAllLearners() {
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
  return result.rows[0];
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
    INSERT INTO learners (user_id, mentor_id, start_date)
    VALUES ($1, NULL, NOW())
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

  await pool.query("UPDATE learners SET mentor_id=NULL WHERE id=$1", [id]);
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
  return result.rows[0];
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
    console.error("Error downloadLearnerResourceService: - learnerService.js:148", err);
    throw err;
  }
}