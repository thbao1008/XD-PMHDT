import pool from "../config/db.js";
import {
  getMentorSessions,
  addSession,
  updateSession,
  deleteSession
} from "../services/mentorService.js";


// ================== CRUD Mentor ==================
export async function createMentor(req, res) {
  const { name, email, phone, dob, bio, experience_years, specialization, rating } = req.body;
  try {
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

    res.status(201).json({
      message: "Mentor created successfully",
      mentorId: mentorRes.rows[0].id,
      userId
    });
  } catch (err) {
    console.error("Error createMentor: - mentorController.js:33", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getAllMentors(req, res) {
  try {
    const result = await pool.query(`
      SELECT m.id AS mentor_id, u.id AS user_id,
             u.name, u.email, u.phone, u.dob, u.status,
             m.bio, m.experience_years, m.specialization, m.rating
      FROM mentors m
      JOIN users u ON m.user_id = u.id
      ORDER BY m.id DESC
    `);
    res.json({ mentors: result.rows });
  } catch (err) {
    console.error("Error getAllMentors: - mentorController.js:50", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getMentorById(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT m.id AS mentor_id, u.id AS user_id,
             u.name, u.email, u.phone, u.dob, u.status,
             m.bio, m.experience_years, m.specialization, m.rating
      FROM mentors m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = $1
    `, [id]);

    if (!result.rows[0]) return res.status(404).json({ message: "Mentor not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error getMentorById: - mentorController.js:70", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function updateMentor(req, res) {
  const { id } = req.params;
  const { name, email, phone, dob, bio, experience_years, specialization, rating } = req.body;
  try {
    const mentorRes = await pool.query("SELECT user_id FROM mentors WHERE id=$1", [id]);
    if (!mentorRes.rows[0]) return res.status(404).json({ message: "Mentor not found" });
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

    res.json({ message: "Mentor updated" });
  } catch (err) {
    console.error("Error updateMentor: - mentorController.js:105", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function removeMentor(req, res) {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM mentors WHERE id=$1", [id]);
    res.json({ message: "Mentor deleted" });
  } catch (err) {
    console.error("Error removeMentor: - mentorController.js:116", err);
    res.status(500).json({ message: "Server error" });
  }
}

// ================== Learners ==================
export async function getLearnersByMentor(req, res) {
  const { id } = req.params;
  try {
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
    `, [id]);

    res.json({ learners: result.rows });
  } catch (err) {
    console.error("Error getLearnersByMentor: - mentorController.js:141", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getMentorByUserId(req, res) {
  const { userId } = req.params;
  try {
    const result = await pool.query(`
      SELECT m.id AS mentor_id, u.id AS user_id,
             u.name, u.email, u.phone, u.dob, u.status,
             m.bio, m.experience_years, m.specialization, m.rating
      FROM mentors m
      JOIN users u ON m.user_id = u.id
      WHERE m.user_id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Mentor not found for this userId" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error getMentorByUserId: - mentorController.js:163", err);
    res.status(500).json({ message: "Server error" });
  }
}

// ================== Report ==================
export async function mentorCreateReport(req, res) {
  const { reporter_id, target_id, content } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO reports (reporter_id, target_id, content, status, created_at)
      VALUES ($1, $2, $3, 'pending', NOW()) RETURNING *
    `, [reporter_id, target_id, content]);

    res.json({ success: true, report: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ success: false, message: "Bạn đã report học viên này rồi" });
    }
    console.error("Error mentorCreateReport: - mentorController.js:182", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// ================== Note ==================
export async function updateLearnerNote(req, res) {
  const { learnerId } = req.params;
  const { note } = req.body;
  try {
    const result = await pool.query(
      "UPDATE learners SET note = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [note, learnerId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Learner not found" });
    }
    res.json({ success: true, learner: result.rows[0] });
  } catch (err) {
    console.error("Error updateLearnerNote: - mentorController.js:201", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}


export async function finalizeSchedule(req, res) {
  try {
    const mentorId = parseInt(req.params.id, 10);
    const { sessions } = req.body;

    if (!mentorId || Number.isNaN(mentorId)) {
      return res.status(400).json({ success: false, message: "mentorId is required and must be integer" });
    }
    if (!Array.isArray(sessions) || sessions.length === 0) {
      return res.status(400).json({ success: false, message: "sessions must be a non-empty array" });
    }

    const final = await finalizeScheduleService(mentorId, sessions);
    res.json({ success: true, final });
  } catch (err) {
    console.error("Error finalizeSchedule: - mentorController.js:222", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}
// ================== Sessions ==================//

// Lấy tất cả sessions
export async function getSessions(req, res) {
  try {
    const mentorId = parseInt(req.params.id, 10);
    if (!mentorId) {
      return res.status(400).json({ success: false, message: "mentorId required" });
    }
    const sessions = await getMentorSessions(mentorId);
    res.json({ success: true, sessions });
  } catch (err) {
    console.error("Error getSessions: - mentorController.js:238", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// Thêm buổi
export async function addSessionController(req, res) {
  try {
    const mentorId = parseInt(req.params.id, 10);
    const session = req.body;
    const sessions = await addSession(mentorId, session);
    res.json({ success: true, sessions });
  } catch (err) {
    console.error("Error addSession: - mentorController.js:251", err);
    res.status(400).json({ success: false, message: err.message });
  }
}
// ================== Sessions Batch ==================//
export async function addSessionsBatchController(req, res) {
  try {
    const mentorId = parseInt(req.params.id, 10);
    const sessions = req.body; // FE gửi mảng buổi

    if (!mentorId || Number.isNaN(mentorId)) {
      return res.status(400).json({ success: false, message: "mentorId required" });
    }
    if (!Array.isArray(sessions) || sessions.length === 0) {
      return res.status(400).json({ success: false, message: "sessions must be a non-empty array" });
    }

    // kiểm tra số buổi offline/online trong tuần
    const offlineCount = sessions.filter(s => s.type.toLowerCase() === "offline").length;
    const onlineCount = sessions.filter(s => s.type.toLowerCase() === "online").length;

    if (offlineCount < 1 || onlineCount < 2) {
      return res.status(400).json({ success: false, message: "Mỗi tuần phải có ≥1 offline và ≥2 online" });
    }

    // lưu tất cả buổi
    for (const s of sessions) {
  await addSession(mentorId, { ...s, type: s.type.toLowerCase() }, { skipValidation: true });
}


    res.json({ success: true, message: "Batch sessions created" });
  } catch (err) {
    console.error("Error addSessionsBatchController: - mentorController.js:284", err);
    res.status(400).json({ success: false, message: err.message });
  }
}


// Cập nhật buổi
export async function updateSessionController(req, res) {
  try {
    const mentorId = parseInt(req.params.id, 10);
    const sessionId = parseInt(req.params.sessionId, 10);
    const session = req.body;
    const sessions = await updateSession(mentorId, sessionId, session);
    res.json({ success: true, sessions });
  } catch (err) {
    console.error("Error updateSession: - mentorController.js:299", err);
    res.status(400).json({ success: false, message: err.message });
  }
}

// Xóa buổi
export async function deleteSessionController(req, res) {
  try {
    const mentorId = parseInt(req.params.id, 10);
    const sessionId = parseInt(req.params.sessionId, 10);
    const sessions = await deleteSession(mentorId, sessionId);
    res.json({ success: true, sessions });
  } catch (err) {
    console.error("Error deleteSession: - mentorController.js:312", err);
    res.status(400).json({ success: false, message: err.message });
  }
}
