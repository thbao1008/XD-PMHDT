// frontend/src/components/common/Calendar.jsx
import React, { useState, useEffect } from "react";
import { getAuth } from "../../utils/auth";
import api from "../../api";
import { FiCalendar, FiClock, FiUser, FiVideo, FiMapPin, FiAlertCircle } from "react-icons/fi";
import "../../styles/common-calendar.css";

export default function Calendar({ learnerId, mentorId }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [hasMentor, setHasMentor] = useState(false);
  const [mentorIdFromLearner, setMentorIdFromLearner] = useState(null);

  useEffect(() => {
    if (mentorId) {
      // Nếu có mentorId (từ mentor dashboard), load trực tiếp
      loadSchedules();
    } else if (learnerId) {
      // Nếu có learnerId (từ learner dashboard), kiểm tra mentor trước
      checkMentorAndLoadSchedules();
    } else {
      setLoading(false);
    }
  }, [learnerId, mentorId, currentDate]);

  const checkMentorAndLoadSchedules = async () => {
    try {
      setLoading(true);
      
      // Kiểm tra xem learner có mentor không
      const mentorRes = await api.get(`/learners/${learnerId}/mentor`);
      const mid = mentorRes.data?.mentor_id;
      
      if (mid) {
        setMentorIdFromLearner(mid);
        setHasMentor(true);
        await loadSchedules();
      } else {
        setHasMentor(false);
        setSchedules([]);
      }
    } catch (err) {
      console.error("Error checking mentor:", err);
      setHasMentor(false);
      setError("Không thể kiểm tra mentor");
    } finally {
      setLoading(false);
    }
  };

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
      
      let res;
      if (mentorId) {
        // Load schedules cho mentor
        res = await api.get(`/mentors/${mentorId}/dashboard/schedules`, {
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          }
        });
        setSchedules(res.data.schedules || []);
      } else if (learnerId) {
        // Load schedules cho learner
        res = await api.get(`/learners/${learnerId}/schedules`, {
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          }
        });
        setSchedules(res.data || []);
      }
    } catch (err) {
      console.error("Error loading schedules:", err);
      setError(err.message || "Lỗi khi tải lịch học");
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Thêm các ngày trống ở đầu tháng
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Thêm các ngày trong tháng
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getSchedulesForDate = (date) => {
    if (!date) return [];
    // Lấy ngày local (YYYY-MM-DD) để so sánh
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const filtered = schedules.filter(s => {
      // Lấy date từ string trực tiếp để tránh lỗi timezone
      // start_time có format: "2025-11-25T08:40:00" hoặc "2025-11-25T08:40:00.000Z"
      const startTimeStr = s.start_time;
      let scheduleDateStr;
      
      if (typeof startTimeStr === 'string') {
        // Lấy phần date (YYYY-MM-DD) từ string
        const datePart = startTimeStr.split('T')[0];
        scheduleDateStr = datePart;
      } else {
        // Fallback: dùng Date object
        const scheduleDate = new Date(startTimeStr);
        const sYear = scheduleDate.getFullYear();
        const sMonth = String(scheduleDate.getMonth() + 1).padStart(2, '0');
        const sDay = String(scheduleDate.getDate()).padStart(2, '0');
        scheduleDateStr = `${sYear}-${sMonth}-${sDay}`;
      }
      
      return scheduleDateStr === dateStr;
    });
    
    // Sắp xếp theo start_time: sớm hơn ở trên, muộn hơn ở dưới
    return filtered.sort((a, b) => {
      const timeA = new Date(a.start_time).getTime();
      const timeB = new Date(b.start_time).getTime();
      return timeA - timeB;
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Kiểm tra schedule đã qua chưa
  const isSchedulePassed = (schedule) => {
    const now = new Date();
    const endTime = new Date(schedule.end_time);
    return now > endTime;
  };

  const getStatusColor = (schedule) => {
    // Lịch thi: màu đỏ
    if (schedule.is_exam) {
      return '#ef4444';
    }
    // Đã qua: màu xanh lá
    if (isSchedulePassed(schedule)) {
      return '#10b981';
    }
    // Sắp tới: màu xanh dương
    return '#3b82f6';
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'scheduled':
        return 'Đã lên lịch';
      case 'completed':
        return 'Đã hoàn thành';
      case 'in_progress':
        return 'Đang diễn ra';
      case 'cancelled':
        return 'Đã hủy';
      case 'paused':
        return 'Tạm ngưng';
      default:
        return status;
    }
  };

  const days = getDaysInMonth();
  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  if (loading) {
    return (
      <div className="calendar-container">
        <div className="loading-state">Đang tải lịch học...</div>
      </div>
    );
  }

  if (learnerId && !hasMentor) {
    return (
      <div className="calendar-container">
        <div className="no-mentor-message">
          <FiUser style={{ fontSize: 48, color: "#999", marginBottom: 16 }} />
          <p>Bạn chưa được gán với mentor</p>
          <p style={{ fontSize: 14, color: "#666", marginTop: 8 }}>
            Vui lòng liên hệ admin để được gán mentor và xem lịch học
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <h3>
          <FiCalendar /> {mentorId ? 'Lịch dạy' : 'Lịch học'}
        </h3>
        <div className="calendar-nav">
          <button onClick={goToPreviousMonth} className="nav-btn">‹</button>
          <button onClick={goToToday} className="nav-btn today-btn">
            Hôm nay
          </button>
          <button onClick={goToNextMonth} className="nav-btn">›</button>
        </div>
      </div>

      <div className="calendar-month">
        <h4>
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h4>
      </div>

      <div className="calendar-grid">
        {/* Day names */}
        <div className="calendar-weekdays">
          {dayNames.map((day, idx) => (
            <div key={idx} className="calendar-weekday">{day}</div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="calendar-days">
          {days.map((date, idx) => {
            const daySchedules = getSchedulesForDate(date);
            const isToday = date && 
              date.toDateString() === new Date().toDateString();
            
            return (
              <div
                key={idx}
                className={`calendar-day ${!date ? 'empty' : ''} ${isToday ? 'today' : ''}`}
              >
                {date && (
                  <>
                    <div className="day-number">{date.getDate()}</div>
                    {daySchedules.length > 0 && (
                      <div className="day-schedules">
                        {daySchedules.map((schedule) => (
                          <div
                            key={schedule.id}
                            className="schedule-block"
                            style={{ borderLeftColor: getStatusColor(schedule) }}
                            onClick={() => setSelectedSchedule(schedule)}
                          >
                            <div className="schedule-block-title">{schedule.title}</div>
                            <div className="schedule-block-time">
                              <FiClock /> {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                            </div>
                            <div className="schedule-block-type">
                              {schedule.type === 'online' ? '🌐 Online' : '🏠 Offline'}
                              {schedule.is_exam && <span className="exam-badge-inline">Lịch thi</span>}
                              {schedule.status === 'paused' && <span className="paused-badge-inline">Tạm ngưng</span>}
                            </div>
                            {schedule.type === 'online' && schedule.meeting_link && (
                              <div className="schedule-block-link">
                                <FiVideo />
                                <a 
                                  href={schedule.meeting_link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Link học
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Schedule detail modal */}
      {selectedSchedule && (
        <div className="schedule-modal-overlay" onClick={() => setSelectedSchedule(null)}>
          <div className="schedule-modal" onClick={(e) => e.stopPropagation()}>
            <div className="schedule-modal-header">
              <h3>{selectedSchedule.title}</h3>
              <button
                className="close-btn"
                onClick={() => setSelectedSchedule(null)}
              >
                ×
              </button>
            </div>
            <div className="schedule-modal-body">
              <div className="schedule-info-item">
                <FiCalendar /> {formatDate(selectedSchedule.start_time)}
              </div>
              <div className="schedule-info-item">
                <FiClock /> {formatTime(selectedSchedule.start_time)} - {formatTime(selectedSchedule.end_time)}
              </div>
              {selectedSchedule.is_exam && (
                <div className="schedule-info-item" style={{ color: '#ef4444', fontWeight: 600 }}>
                  <FiAlertCircle /> Lịch thi định kỳ
                </div>
              )}
              <div className="schedule-info-item">
                <strong>Loại:</strong> {selectedSchedule.type === 'online' ? '🌐 Online' : '🏠 Offline'}
              </div>
              {selectedSchedule.meeting_link && (
                <div className="schedule-info-item">
                  <FiVideo /> 
                  <a href={selectedSchedule.meeting_link} target="_blank" rel="noopener noreferrer">
                    Link meeting
                  </a>
                </div>
              )}
              {selectedSchedule.description && (
                <div className="schedule-description">
                  <strong>Mô tả:</strong>
                  <p>{selectedSchedule.description}</p>
                </div>
              )}
              {selectedSchedule.notes && (
                <div className="schedule-notes">
                  <strong>Ghi chú:</strong>
                  <p>{selectedSchedule.notes}</p>
                </div>
              )}
              <div className="schedule-status">
                <span
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(selectedSchedule) }}
                >
                  {getStatusLabel(selectedSchedule.status)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

