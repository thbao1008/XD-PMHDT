// Mentor Dashboard Service
import pool from "../config/db.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Tìm project root (đi lên từ mentor-service/src/services đến backend)
 */
function getProjectRoot() {
  // __dirname = backend/services/mentor-service/src/services
  // Đi lên 3 cấp: services -> src -> mentor-service -> services -> backend
  return path.resolve(__dirname, "..", "..", "..");
}

export async function getMentorDashboardStats(mentorId) {
  try {
    const learnersResult = await pool.query(
      `SELECT COUNT(*) as count 
       FROM learners 
       WHERE mentor_id = $1`,
      [mentorId]
    );
    const totalLearners = parseInt(learnersResult.rows[0].count) || 0;

    const challengesResult = await pool.query(
      `SELECT COUNT(*) as count 
       FROM challenges 
       WHERE mentor_id = $1`,
      [mentorId]
    );
    const totalChallenges = parseInt(challengesResult.rows[0].count) || 0;

    const pendingSubmissionsResult = await pool.query(
      `SELECT COUNT(DISTINCT s.id) as count
       FROM submissions s
       JOIN learners l ON s.learner_id = l.id
       WHERE l.mentor_id = $1 
         AND s.status = 'submitted'
         AND NOT EXISTS (
           SELECT 1 FROM feedbacks f 
           WHERE f.submission_id = s.id
         )`,
      [mentorId]
    );
    const pendingSubmissions = parseInt(pendingSubmissionsResult.rows[0].count) || 0;

    const ratingResult = await pool.query(
      `SELECT rating 
       FROM mentors 
       WHERE id = $1`,
      [mentorId]
    );
    const rating = parseFloat(ratingResult.rows[0]?.rating) || 0;

    const lessonsResult = await pool.query(
      `SELECT COUNT(*) as count 
       FROM mentor_resources
       WHERE mentor_id = $1`,
      [mentorId]
    );
    const totalLessons = parseInt(lessonsResult.rows[0].count) || 0;

    return {
      totalLearners,
      totalChallenges,
      pendingSubmissions,
      rating,
      totalLessons
    };
  } catch (err) {
    console.error("Error getMentorDashboardStats:", err);
    throw err;
  }
}

export async function getPendingSubmissions(mentorId, limit = 10) {
  try {
    const result = await pool.query(
      `SELECT s.id, s.created_at, s.status, s.audio_url,
              s.challenge_id,
              lc.id AS learner_challenge_id,
              lc.status AS challenge_status, lc.attempts,
              f.final_score, f.pronunciation_score, f.fluency_score,
              f.content AS feedback,
              f.audio_url AS feedback_audio_url,
              c.title, c.level,
              l.id AS learner_id, u.name AS learner_name, u.email AS learner_email
       FROM submissions s
       JOIN challenges c ON s.challenge_id = c.id
       JOIN learners l ON s.learner_id = l.id
       JOIN users u ON l.user_id = u.id
       LEFT JOIN learner_challenges lc 
         ON lc.challenge_id = s.challenge_id 
        AND lc.learner_id = l.id
       LEFT JOIN feedbacks f ON f.submission_id = s.id
       WHERE l.mentor_id = $1
         AND f.id IS NULL
       ORDER BY s.created_at DESC
       LIMIT $2`,
      [mentorId, limit]
    );
    return result.rows;
  } catch (err) {
    console.error("Error getPendingSubmissions:", err);
    throw err;
  }
}

export async function getMentorSchedules(mentorId, startDate, endDate) {
  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (title, start_time, end_time, type, meeting_link, is_exam)
        id,
        title,
        description,
        start_time,
        end_time,
        type,
        meeting_link,
        status,
        is_exam,
        notes,
        created_at
       FROM schedules
       WHERE mentor_id = $1
         AND start_time >= $2
         AND start_time <= $3
       ORDER BY title, start_time, end_time, type, meeting_link, is_exam, id ASC`,
      [mentorId, startDate, endDate]
    );
    return result.rows;
  } catch (err) {
    console.error("Error getMentorSchedules:", err);
    throw err;
  }
}

/**
 * Khởi tạo AI learning - học từ các nguồn có sẵn và bắt đầu training
 */
export async function initializeAILearning(mentorId) {
  try {
    console.log(`🤖 [Mentor ${mentorId}] Initializing AI learning...`);
    
    // 1. Học từ challenges của mentor
    const challenges = await pool.query(
      `SELECT id, title, description, level, type 
       FROM challenges 
       WHERE mentor_id = $1 
       LIMIT 50`,
      [mentorId]
    );
    
    let learnedCount = 0;
    for (const challenge of challenges.rows) {
      try {
        await pool.query(
          `INSERT INTO challenge_creator_training 
           (training_type, input_data, expected_output, created_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (training_type, md5(input_data::text)) DO NOTHING`,
          [
            'challenge_creation',
            JSON.stringify({
              mentor_id: mentorId,
              request_context: 'challenge_created'
            }),
            JSON.stringify({
              challenge_id: challenge.id,
              title: challenge.title,
              description: challenge.description,
              level: challenge.level,
              type: challenge.type
            })
          ]
        );
        learnedCount++;
      } catch (err) {
        // Ignore duplicate errors
      }
    }
    
    // 2. Khởi động continuous learning engine (async, không block)
    const backendDir = getProjectRoot();
    const learningScript = path.join(backendDir, "ai_models", "aiespContinuousLearning.py");
    
    if (fs.existsSync(learningScript)) {
      // Chạy learning engine trong background
      const pythonProcess = spawn('python', [learningScript, 'train', 'challenge_creation'], {
        cwd: backendDir,
        stdio: 'pipe',
        shell: true,
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8'
        }
      });
      
      pythonProcess.stdout.on('data', (data) => {
        console.log(`[AI Learning] ${data.toString()}`);
      });
      
      pythonProcess.stderr.on('data', (data) => {
        console.error(`[AI Learning Error] ${data.toString()}`);
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ [Mentor ${mentorId}] AI learning completed`);
        } else {
          console.warn(`⚠️ [Mentor ${mentorId}] AI learning exited with code ${code}`);
        }
      });
      
      pythonProcess.on('error', (err) => {
        console.error(`❌ [Mentor ${mentorId}] AI learning error:`, err);
      });
    }
    
    return {
      success: true,
      learnedFromChallenges: learnedCount,
      message: `Đã khởi tạo AI learning từ ${learnedCount} challenges`
    };
  } catch (err) {
    console.error(`❌ [Mentor ${mentorId}] Error initializing AI learning:`, err);
    throw err;
  }
}

/**
 * Lấy tiến trình AI cho mentor
 */
export async function getAIProgress(mentorId) {
  try {
    // Training samples từ challenges của mentor
    const trainingSamplesResult = await pool.query(
      `SELECT COUNT(*) as count 
       FROM challenge_creator_training 
       WHERE input_data->>'mentor_id' = $1::text`,
      [mentorId.toString()]
    );
    const trainingSamples = parseInt(trainingSamplesResult.rows[0].count) || 0;
    
    // AI reports đã tạo (từ challenges của mentor)
    const aiReportsResult = await pool.query(
      `SELECT COUNT(*) as count 
       FROM challenges 
       WHERE mentor_id = $1`,
      [mentorId]
    );
    const aiReports = parseInt(aiReportsResult.rows[0].count) || 0;
    
    // Accuracy từ model performance (nếu có)
    let accuracy = null;
    try {
      const accuracyResult = await pool.query(
        `SELECT accuracy_score 
         FROM assistant_ai_models 
         WHERE task_type = 'challenge_creation'
         ORDER BY trained_at DESC 
         LIMIT 1`
      );
      if (accuracyResult.rows.length > 0) {
        accuracy = parseFloat(accuracyResult.rows[0].accuracy_score) || null;
      }
    } catch (e) {
      // Bảng không tồn tại, bỏ qua
    }
    
    // Status
    let status = 'initializing';
    if (trainingSamples > 0) {
      if (accuracy !== null) {
        status = accuracy >= 0.8 ? 'excellent' : accuracy >= 0.6 ? 'good' : 'training';
      } else {
        status = 'training';
      }
    }
    
    return {
      trainingSamples,
      aiReports,
      accuracy,
      status
    };
  } catch (err) {
    console.error("Error getAIProgress:", err);
    throw err;
  }
}

/**
 * Lấy các hoạt động gần đây của AI
 */
export async function getAIActivities(mentorId, limit = 10) {
  try {
    // Lấy các challenge mới được tạo
    const recentChallenges = await pool.query(
      `SELECT id, title, created_at, level, type
       FROM challenges
       WHERE mentor_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [mentorId, limit]
    );
    
    // Lấy các training samples mới
    const recentTraining = await pool.query(
      `SELECT id, training_type, created_at
       FROM challenge_creator_training
       WHERE input_data->>'mentor_id' = $1::text
       ORDER BY created_at DESC
       LIMIT $2`,
      [mentorId.toString(), limit]
    );
    
    const activities = [];
    
    // Thêm challenges
    for (const challenge of recentChallenges.rows) {
      activities.push({
        type: 'challenge_created',
        title: `Đã tạo challenge: ${challenge.title}`,
        timestamp: challenge.created_at,
        metadata: {
          challenge_id: challenge.id,
          level: challenge.level,
          type: challenge.type
        }
      });
    }
    
    // Thêm training samples
    for (const training of recentTraining.rows) {
      activities.push({
        type: 'training_sample',
        title: `Đã thêm training sample: ${training.training_type}`,
        timestamp: training.created_at,
        metadata: {
          training_id: training.id,
          training_type: training.training_type
        }
      });
    }
    
    // Sắp xếp theo timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return activities.slice(0, limit);
  } catch (err) {
    console.error("Error getAIActivities:", err);
    throw err;
  }
}

