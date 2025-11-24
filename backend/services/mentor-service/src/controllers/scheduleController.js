// Schedule Controller
import * as scheduleService from "../services/scheduleService.js";
import pool from "../config/db.js";

export async function getLearnerSchedules(req, res) {
  try {
    const { learnerId } = req.params;
    const { startDate, endDate, status } = req.query;
    
    const learnerCheck = await pool.query(
      `SELECT mentor_id FROM learners WHERE id = $1`,
      [learnerId]
    );
    
    if (!learnerCheck.rows[0]?.mentor_id) {
      return res.json([]);
    }
    
    const schedules = await scheduleService.getLearnerSchedules(learnerId, {
      startDate,
      endDate,
      status
    });
    
    res.json(schedules);
  } catch (err) {
    console.error("❌ Error in getLearnerSchedules:", err);
    res.status(500).json({ error: err.message || "Lỗi khi lấy lịch học" });
  }
}

export async function getMentorSchedules(req, res) {
  try {
    const { mentorId } = req.params;
    const { startDate, endDate, status } = req.query;
    
    const schedules = await scheduleService.getMentorSchedules(mentorId, {
      startDate,
      endDate,
      status
    });
    
    res.json(schedules);
  } catch (err) {
    console.error("❌ Error in getMentorSchedules:", err);
    res.status(500).json({ error: err.message || "Lỗi khi lấy lịch học" });
  }
}

export async function createSchedule(req, res) {
  try {
    const { mentorId } = req.params;
    const { learnerId, title, description, startTime, endTime, type, meetingLink, isExam, notes } = req.body;
    
    const learnerCheck = await pool.query(
      `SELECT id FROM learners WHERE id = $1 AND mentor_id = $2`,
      [learnerId, mentorId]
    );
    
    if (!learnerCheck.rows[0]) {
      return res.status(403).json({ error: "Learner không thuộc mentor này" });
    }
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    const startHour = start.getHours();
    const endHour = end.getHours();
    if (startHour < 8 || startHour >= 21 || endHour < 8 || endHour > 21) {
      return res.status(400).json({ error: "Giờ học phải trong khoảng 8h-21h" });
    }
    
    if (start >= end) {
      return res.status(400).json({ error: "Giờ bắt đầu phải nhỏ hơn giờ kết thúc" });
    }
    
    const existingSchedules = await pool.query(
      `SELECT id, start_time, end_time 
       FROM schedules 
       WHERE mentor_id = $1 
         AND learner_id = $2
         AND DATE(start_time) = DATE($3)
         AND status != 'cancelled'
         AND (
           (start_time < $4 AND end_time > $3) OR
           (start_time < $5 AND end_time > $4)
         )`,
      [mentorId, learnerId, startTime, startTime, endTime]
    );
    
    if (existingSchedules.rows.length > 0) {
      return res.status(400).json({ error: "Khung giờ này bị trùng với lịch đã đăng ký trong cùng ngày" });
    }
    
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilNextMonday);
    nextMonday.setHours(0, 0, 0, 0);
    
    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);
    nextSunday.setHours(23, 59, 59, 999);
    
    const scheduleDate = new Date(startTime);
    if (scheduleDate < nextMonday || scheduleDate > nextSunday) {
      return res.status(400).json({ error: "Chỉ được đăng ký lịch cho tuần tiếp theo (từ thứ 2 đến chủ nhật)" });
    }
    
    const schedule = await scheduleService.createSchedule({
      learnerId,
      mentorId,
      title,
      description,
      startTime,
      endTime,
      type: type || 'online',
      meetingLink,
      isExam: isExam || false,
      notes
    });
    
    res.status(201).json(schedule);
  } catch (err) {
    console.error("❌ Error in createSchedule:", err);
    res.status(500).json({ error: err.message || "Lỗi khi tạo lịch học" });
  }
}

export async function updateSchedule(req, res) {
  try {
    const { scheduleId } = req.params;
    const updates = req.body;
    
    const schedule = await scheduleService.updateSchedule(scheduleId, updates);
    
    if (!schedule) {
      return res.status(404).json({ error: "Không tìm thấy lịch học" });
    }
    
    res.json(schedule);
  } catch (err) {
    console.error("❌ Error in updateSchedule:", err);
    res.status(500).json({ error: err.message || "Lỗi khi cập nhật lịch học" });
  }
}

export async function deleteSchedule(req, res) {
  try {
    const { scheduleId } = req.params;
    
    await scheduleService.deleteSchedule(scheduleId);
    
    res.json({ message: "Đã xóa lịch học" });
  } catch (err) {
    console.error("❌ Error in deleteSchedule:", err);
    res.status(500).json({ error: err.message || "Lỗi khi xóa lịch học" });
  }
}

export async function getScheduleById(req, res) {
  try {
    const { scheduleId } = req.params;
    const schedule = await scheduleService.getScheduleById(scheduleId);
    
    if (!schedule) {
      return res.status(404).json({ error: "Không tìm thấy lịch học" });
    }
    
    res.json(schedule);
  } catch (err) {
    console.error("❌ Error in getScheduleById:", err);
    res.status(500).json({ error: err.message || "Lỗi khi lấy lịch học" });
  }
}

