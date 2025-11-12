import pool from "../config/db.js"; 

export function getWeekRange(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0=CN, 1=T2,...
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  return { weekStart: fmt(monday), weekEnd: fmt(sunday) };
}

export async function validateWeeklyConstraint(mentorId, weekStart, weekEnd) {
  const res = await pool.query(
    `SELECT type, is_exam FROM mentor_sessions 
     WHERE mentor_id=$1 AND date BETWEEN $2 AND $3`,
    [mentorId, weekStart, weekEnd]
  );

  // nếu tuần này chỉ toàn lịch thi thì bỏ qua ràng buộc
  const hasNonExam = res.rows.some(r => !r.is_exam);
  if (!hasNonExam) return true;

  const types = res.rows.filter(r => !r.is_exam).map(r => r.type);
  const offlineCount = types.filter(t => t === "offline").length;
  const onlineCount = types.filter(t => t === "online").length;

  return offlineCount >= 1 && onlineCount >= 2;
}