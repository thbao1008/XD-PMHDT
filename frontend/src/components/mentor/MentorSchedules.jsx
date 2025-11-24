// frontend/src/components/mentor/MentorSchedules.jsx
import React, { useState, useEffect } from "react";
import { getAuth } from "../../utils/auth";
import api from "../../api";
import { FiCalendar, FiClock, FiUser, FiVideo, FiPlus, FiEdit, FiTrash2, FiX, FiPause, FiCheckCircle, FiAlertCircle, FiSend } from "react-icons/fi";
import "../../styles/mentor-schedules.css";

// Helper: Lấy thứ 2 tuần tiếp theo (luôn là tuần sau, không bao giờ là tuần này)
function getNextMonday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ...
  
  // Tính số ngày đến thứ 2 tuần tiếp theo
  // Nếu hôm nay là thứ 2 (1), thì tuần tiếp theo là thứ 2 tuần sau (7 ngày)
  // Nếu hôm nay là thứ 3-7 (2-6), thì tuần tiếp theo là thứ 2 tuần sau (8 - dayOfWeek ngày)
  // Nếu hôm nay là CN (0), thì tuần tiếp theo là thứ 2 tuần sau (8 ngày)
  let daysUntilNextMonday;
  if (dayOfWeek === 0) {
    // CN: thứ 2 tuần sau là 8 ngày nữa
    daysUntilNextMonday = 8;
  } else if (dayOfWeek === 1) {
    // Thứ 2: thứ 2 tuần sau là 7 ngày nữa
    daysUntilNextMonday = 7;
  } else {
    // Thứ 3-7: thứ 2 tuần sau là (8 - dayOfWeek) ngày nữa
    daysUntilNextMonday = 8 - dayOfWeek;
  }
  
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilNextMonday);
  return nextMonday;
}

// Helper: Lấy chủ nhật tuần tiếp theo
function getNextSunday() {
  const nextMonday = getNextMonday();
  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextMonday.getDate() + 6);
  nextSunday.setHours(23, 59, 59, 999);
  return nextSunday;
}

// Helper: Kiểm tra xem date có trong tuần tiếp theo không
function isInNextWeek(date) {
  const nextMonday = getNextMonday();
  const nextSunday = getNextSunday();
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate >= nextMonday && checkDate <= nextSunday;
}

// Helper: Kiểm tra xem tuần đã qua chưa
function isWeekPassed(weekStartDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStartDate);
  weekEnd.setDate(weekStartDate.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return today > weekEnd;
}

// Helper: Lấy thứ 2 của tuần chứa date
function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export default function MentorSchedules() {
  const auth = getAuth();
  const userId = auth?.user?.id ?? auth?.user?._id ?? auth?.user?.user_id ?? null;
  const [mentorId, setMentorId] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [learners, setLearners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(getNextMonday());
  const [draftSchedules, setDraftSchedules] = useState([]);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    loadData();
  }, [userId, currentWeek]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get mentor ID
      const mentorRes = await api.get(`/mentors/by-user/${userId}`);
      const mid = mentorRes.data?.mentor_id ?? mentorRes.data?.id ?? null;
      
      if (!mid) {
        setLoading(false);
        return;
      }
      
      setMentorId(mid);
      
      // Load learners and schedules
      const weekStart = new Date(currentWeek);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      const [learnersRes, schedulesRes] = await Promise.all([
        api.get(`/mentors/${mid}/learners`),
        api.get(`/mentors/${mid}/schedules`, {
          params: {
            startDate: weekStart.toISOString(),
            endDate: weekEnd.toISOString()
          }
        })
      ]);
      
      // Map learners giống như MentorLearners.jsx
      const learnersData = learnersRes.data?.learners || learnersRes.data || [];
      setLearners(learnersData.map(learner => ({
        ...learner,
        id: learner.learner_id || learner.id,
        full_name: learner.learner_name || learner.name || learner.full_name
      })));
      setSchedules(schedulesRes.data || []);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  const addDraftSchedule = () => {
    const nextMonday = getNextMonday();
    const newDraft = {
      id: Date.now(), // Temporary ID
      title: "",
      date: nextMonday.toISOString().split('T')[0],
      startTime: "",
      endTime: "",
      type: "online",
      meetingLink: "",
      isExam: false
    };
    setDraftSchedules([...draftSchedules, newDraft]);
  };

  const updateDraftSchedule = (id, field, value) => {
    setDraftSchedules(prev => prev.map(draft => 
      draft.id === id ? { ...draft, [field]: value } : draft
    ));
  };

  const removeDraftSchedule = (id) => {
    setDraftSchedules(draftSchedules.filter(draft => draft.id !== id));
  };

  const validateDraftSchedule = (draft) => {
    if (!draft.title || draft.title.trim() === "") return "Chưa nhập tiêu đề";
    if (!draft.date) return "Chưa chọn ngày";
    if (!isInNextWeek(draft.date)) return "Ngày phải trong tuần tiếp theo";
    if (!draft.startTime) return "Chưa chọn giờ bắt đầu";
    if (!draft.endTime) return "Chưa chọn giờ kết thúc";
    
    const startHour = parseInt(draft.startTime.split(':')[0]);
    const endHour = parseInt(draft.endTime.split(':')[0]);
    if (startHour < 8 || startHour >= 21 || endHour < 8 || endHour > 21) {
      return "Giờ học phải trong khoảng 8h-21h";
    }
    
    const start = new Date(`${draft.date}T${draft.startTime}`);
    const end = new Date(`${draft.date}T${draft.endTime}`);
    if (start >= end) {
      return "Giờ bắt đầu phải nhỏ hơn giờ kết thúc";
    }
    
    // Link meeting không bắt buộc, có thể để trống và chỉnh sau
    // if (draft.type === "online" && !draft.meetingLink) {
    //   return "Lịch online phải có link meeting";
    // }
    
    return null;
  };

  const handleSubmitAll = async () => {
    if (!mentorId) return;
    
    // Validate all drafts
    const errors = [];
    draftSchedules.forEach((draft, index) => {
      const error = validateDraftSchedule(draft);
      if (error) {
        errors.push(`Lịch học ${index + 1}: ${error}`);
      }
    });
    
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }
    
    if (draftSchedules.length === 0) {
      alert("Chưa có lịch học nào để gửi");
      return;
    }
    
    if (learners.length === 0) {
      alert("Bạn chưa có học viên nào. Vui lòng liên hệ admin để được gán học viên.");
      return;
    }
    
    try {
      // Tạo lịch cho TẤT CẢ learners của mentor
      const promises = [];
      
      draftSchedules.forEach(draft => {
        // Tạo date string với local time để tránh lỗi timezone
        const dateStr = draft.date; // YYYY-MM-DD
        const startDateTimeStr = `${dateStr}T${draft.startTime}:00`;
        const endDateTimeStr = `${dateStr}T${draft.endTime}:00`;
        
        // Tạo lịch cho mỗi learner
        learners.forEach(learner => {
          const payload = {
            learnerId: parseInt(learner.learner_id || learner.id),
            title: draft.title.trim(),
            description: "",
            startTime: startDateTimeStr,
            endTime: endDateTimeStr,
            type: draft.type,
            meetingLink: draft.type === "online" ? (draft.meetingLink || null) : null,
            isExam: draft.isExam,
            notes: ""
          };
          
          promises.push(api.post(`/mentors/${mentorId}/schedules`, payload));
        });
      });
      
      await Promise.all(promises);
      setDraftSchedules([]);
      loadData();
      alert(`Đã tạo lịch học thành công cho ${learners.length} học viên!`);
    } catch (err) {
      console.error("Error saving schedules:", err);
      const errorMsg = err.response?.data?.error || "Có lỗi xảy ra. Vui lòng thử lại.";
      alert(errorMsg);
    }
  };

  const handleEdit = (schedule) => {
    // Tìm tất cả lịch có cùng title, date, time để edit cùng lúc
    const scheduleDate = new Date(schedule.start_time);
    const dateStr = scheduleDate.toISOString().split('T')[0];
    const startTime = scheduleDate.toTimeString().slice(0, 5);
    const endTime = new Date(schedule.end_time).toTimeString().slice(0, 5);
    
    const matchingSchedules = schedules.filter(s => {
      const sDate = new Date(s.start_time).toISOString().split('T')[0];
      const sStartTime = new Date(s.start_time).toTimeString().slice(0, 5);
      const sEndTime = new Date(s.end_time).toTimeString().slice(0, 5);
      return s.title === schedule.title && 
             sDate === dateStr && 
             sStartTime === startTime && 
             sEndTime === endTime;
    });
    
    // Set thông tin để chỉnh sửa
    setEditingSchedule({
      scheduleIds: matchingSchedules.map(s => s.id),
      title: schedule.title,
      date: dateStr,
      startTime: startTime,
      endTime: endTime,
      type: schedule.type,
      meetingLink: schedule.meeting_link || "",
      isExam: schedule.is_exam || false
    });
    setShowEditModal(true);
  };

  const handleUpdateSchedule = async () => {
    if (!editingSchedule || !mentorId) return;
    
    // Validate
    if (!editingSchedule.title || editingSchedule.title.trim() === "") {
      alert("Chưa nhập tiêu đề");
      return;
    }
    if (!editingSchedule.date) {
      alert("Chưa chọn ngày");
      return;
    }
    if (!isInNextWeek(editingSchedule.date)) {
      alert("Ngày phải trong tuần tiếp theo");
      return;
    }
    if (!editingSchedule.startTime) {
      alert("Chưa chọn giờ bắt đầu");
      return;
    }
    if (!editingSchedule.endTime) {
      alert("Chưa chọn giờ kết thúc");
      return;
    }
    
    const startHour = parseInt(editingSchedule.startTime.split(':')[0]);
    const endHour = parseInt(editingSchedule.endTime.split(':')[0]);
    if (startHour < 8 || startHour >= 21 || endHour < 8 || endHour > 21) {
      alert("Giờ học phải trong khoảng 8h-21h");
      return;
    }
    
    const start = new Date(`${editingSchedule.date}T${editingSchedule.startTime}`);
    const end = new Date(`${editingSchedule.date}T${editingSchedule.endTime}`);
    if (start >= end) {
      alert("Giờ bắt đầu phải nhỏ hơn giờ kết thúc");
      return;
    }
    
    try {
      // Cập nhật tất cả các lịch có cùng title/date/time
      const dateStr = editingSchedule.date;
      const startDateTimeStr = `${dateStr}T${editingSchedule.startTime}:00`;
      const endDateTimeStr = `${dateStr}T${editingSchedule.endTime}:00`;
      
      const promises = editingSchedule.scheduleIds.map(scheduleId => {
        const payload = {
          title: editingSchedule.title.trim(),
          description: "",
          startTime: startDateTimeStr,
          endTime: endDateTimeStr,
          type: editingSchedule.type,
          meetingLink: editingSchedule.type === "online" ? (editingSchedule.meetingLink || null) : null,
          isExam: editingSchedule.isExam,
          notes: ""
        };
        
        return api.put(`/mentors/schedules/${scheduleId}`, payload);
      });
      
      await Promise.all(promises);
      setShowEditModal(false);
      setEditingSchedule(null);
      loadData();
      alert("Đã cập nhật lịch học thành công!");
    } catch (err) {
      console.error("Error updating schedules:", err);
      const errorMsg = err.response?.data?.error || "Có lỗi xảy ra. Vui lòng thử lại.";
      alert(errorMsg);
    }
  };

  const handlePause = async (scheduleId) => {
    if (!confirm("Bạn có chắc muốn tạm ngưng lịch học này?")) return;

    try {
      await api.put(`/mentors/schedules/${scheduleId}`, { status: "paused" });
      loadData();
    } catch (err) {
      console.error("Error pausing schedule:", err);
      alert("Có lỗi xảy ra. Vui lòng thử lại.");
    }
  };

  const handleDelete = async (scheduleId) => {
    if (!confirm("Bạn có chắc muốn xóa lịch học này?")) return;

    try {
      await api.delete(`/mentors/schedules/${scheduleId}`);
      loadData();
    } catch (err) {
      console.error("Error deleting schedule:", err);
      alert("Có lỗi xảy ra. Vui lòng thử lại.");
    }
  };

  // Lấy lịch theo ngày trong tuần (group theo title/date/time để chỉ hiện 1 lịch)
  const getSchedulesByDate = (date) => {
    if (!date) return [];
    
    // Lấy ngày local (YYYY-MM-DD) để so sánh
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const schedulesForDate = schedules.filter(s => {
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
    
    // Group theo title, date, start_time, end_time để chỉ hiện 1 lịch cho tất cả học viên
    const grouped = {};
    schedulesForDate.forEach(s => {
      const key = `${s.title}_${s.start_time}_${s.end_time}`;
      if (!grouped[key]) {
        grouped[key] = s; // Lấy lịch đầu tiên làm đại diện
      }
    });
    
    // Sắp xếp theo start_time: sớm hơn ở trên, muộn hơn ở dưới
    return Object.values(grouped).sort((a, b) => {
      const timeA = new Date(a.start_time).getTime();
      const timeB = new Date(b.start_time).getTime();
      return timeA - timeB;
    });
  };
  
  // Kiểm tra xem có thể chỉnh sửa/xóa lịch không
  // Logic: Chỉ có thể sửa/xóa khi tuần của lịch CHƯA ĐẾN (tuần tương lai)
  // Nếu tuần của lịch đã đến hoặc đã qua (tuần hiện tại hoặc tuần đã qua), thì không thể sửa/xóa, chỉ có thể tạm ngưng
  const canEditSchedule = (schedule) => {
    const scheduleDate = new Date(schedule.start_time);
    const scheduleWeekMonday = getMondayOfWeek(scheduleDate);
    
    // Lấy thứ 2 của tuần hiện tại (hôm nay)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentWeekMonday = getMondayOfWeek(today);
    
    // So sánh tuần của schedule với tuần hiện tại
    // Nếu tuần của schedule < tuần hiện tại (đã qua) → không thể sửa/xóa
    // Nếu tuần của schedule = tuần hiện tại (đang trong tuần) → không thể sửa/xóa (đã đến tuần)
    // Nếu tuần của schedule > tuần hiện tại (tuần tương lai) → có thể sửa/xóa (chưa đến tuần)
    const scheduleWeekTime = scheduleWeekMonday.getTime();
    const currentWeekTime = currentWeekMonday.getTime();
    
    // Chỉ có thể sửa/xóa nếu tuần của schedule > tuần hiện tại (chưa đến tuần)
    return scheduleWeekTime > currentWeekTime;
  };

  // Kiểm tra schedule đã qua chưa
  const isSchedulePassed = (schedule) => {
    const now = new Date();
    const endTime = new Date(schedule.end_time);
    return now > endTime;
  };

  // Lấy màu cho schedule
  const getScheduleColor = (schedule) => {
    if (schedule.is_exam) return "#ef4444"; // Đỏ cho lịch thi
    if (isSchedulePassed(schedule)) return "#10b981"; // Xanh lá cho đã qua
    return "#3b82f6"; // Xanh dương cho sắp tới
  };

  // Lấy các ngày trong tuần
  const getWeekDays = () => {
    const days = [];
    const monday = new Date(currentWeek);
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const weekPassed = isWeekPassed(currentWeek);

  if (loading) {
    return (
      <div className="mentor-schedules">
        <div className="loading-state">Đang tải...</div>
      </div>
    );
  }

  if (!mentorId) {
    return (
      <div className="mentor-schedules">
        <div className="error-state">Không tìm thấy thông tin mentor</div>
      </div>
    );
  }

  return (
    <div className="mentor-schedules">
      <div className="schedules-header">
        <h2>
          <FiCalendar /> Quản lý lịch học
        </h2>
        <div className="header-actions">
          <button 
            className="btn-secondary" 
            onClick={() => setShowCalendar(!showCalendar)}
          >
            <FiCalendar /> {showCalendar ? "Ẩn lịch" : "Xem lịch dạy"}
          </button>
        </div>
      </div>

      {learners.length === 0 ? (
        <div className="empty-state">
          <p>Bạn chưa có học viên nào. Vui lòng liên hệ admin để được gán học viên.</p>
        </div>
      ) : (
        <>
          {/* Inline Form Section - chỉ hiển thị khi không xem lịch */}
          {!weekPassed && !showCalendar && (
            <div className="inline-schedule-form">
              <div className="form-section-header">
                <div>
                  <h3>Tạo lịch học mới</h3>
                  <p className="form-section-note">
                    Lịch học sẽ được tạo cho tất cả {learners.length} học viên được gán với bạn
                  </p>
                </div>
                <div className="form-section-actions">
                  <button className="btn-secondary" onClick={addDraftSchedule}>
                    <FiPlus /> Thêm lịch học
                  </button>
                  {draftSchedules.length > 0 && (
                    <button className="btn-primary" onClick={handleSubmitAll}>
                      <FiSend /> Gửi lịch ({draftSchedules.length})
                    </button>
                  )}
                </div>
              </div>

              {draftSchedules.length === 0 ? (
                <div className="empty-draft-message">
                  <p>Nhấn "Thêm lịch học" để bắt đầu tạo lịch học mới</p>
                </div>
              ) : (
                <div className="draft-schedules-table">
                  <div className="table-header">
                    <div className="col-title">Tiêu đề *</div>
                    <div className="col-date">Ngày *</div>
                    <div className="col-time">Giờ bắt đầu *</div>
                    <div className="col-time">Giờ kết thúc *</div>
                    <div className="col-type">Loại *</div>
                    <div className="col-link">Link (nếu online)</div>
                    <div className="col-exam">Lịch thi</div>
                    <div className="col-actions">Thao tác</div>
                  </div>
                  {draftSchedules.map((draft) => (
                    <div key={draft.id} className="table-row">
                      <div className="col-title">
                        <input
                          type="text"
                          value={draft.title}
                          onChange={(e) => updateDraftSchedule(draft.id, 'title', e.target.value)}
                          placeholder="Tiêu đề lịch học"
                          className="form-input"
                        />
                      </div>
                      <div className="col-date">
                        <input
                          type="date"
                          value={draft.date}
                          onChange={(e) => updateDraftSchedule(draft.id, 'date', e.target.value)}
                          min={getNextMonday().toISOString().split('T')[0]}
                          max={getNextSunday().toISOString().split('T')[0]}
                          className="form-input"
                        />
                      </div>
                      <div className="col-time">
                        <input
                          type="time"
                          value={draft.startTime}
                          onChange={(e) => updateDraftSchedule(draft.id, 'startTime', e.target.value)}
                          min="08:00"
                          max="20:59"
                          className="form-input"
                        />
                      </div>
                      <div className="col-time">
                        <input
                          type="time"
                          value={draft.endTime}
                          onChange={(e) => updateDraftSchedule(draft.id, 'endTime', e.target.value)}
                          min="08:00"
                          max="21:00"
                          className="form-input"
                        />
                      </div>
                      <div className="col-type">
                        <select
                          value={draft.type}
                          onChange={(e) => {
                            const newType = e.target.value;
                            setDraftSchedules(prev => prev.map(d => {
                              if (d.id === draft.id) {
                                return {
                                  ...d,
                                  type: newType,
                                  meetingLink: newType === 'offline' ? '' : d.meetingLink
                                };
                              }
                              return d;
                            }));
                          }}
                          className="form-input"
                        >
                          <option value="online">Online</option>
                          <option value="offline">Offline</option>
                        </select>
                      </div>
                      <div className="col-link">
                        {draft.type === "online" ? (
                          <input
                            type="url"
                            value={draft.meetingLink}
                            onChange={(e) => updateDraftSchedule(draft.id, 'meetingLink', e.target.value)}
                            placeholder="Có thể để trống, chỉnh sau..."
                            className="form-input"
                          />
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </div>
                      <div className="col-exam">
                        <input
                          type="checkbox"
                          checked={draft.isExam}
                          onChange={(e) => updateDraftSchedule(draft.id, 'isExam', e.target.checked)}
                        />
                      </div>
                      <div className="col-actions">
                        <button
                          className="btn-icon-small btn-danger"
                          onClick={() => removeDraftSchedule(draft.id)}
                          title="Xóa"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Calendar View */}
          {showCalendar && (
            <div className="week-calendar">
              <div className="week-header">
                <button 
                  className="btn-nav"
                  onClick={() => {
                    const prevWeek = new Date(currentWeek);
                    prevWeek.setDate(prevWeek.getDate() - 7);
                    setCurrentWeek(prevWeek);
                  }}
                >
                  ← Tuần trước
                </button>
                <h3>
                  Tuần {currentWeek.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })} - 
                  {new Date(currentWeek.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' })}
                </h3>
                <button 
                  className="btn-nav"
                  onClick={() => {
                    const nextWeek = new Date(currentWeek);
                    nextWeek.setDate(nextWeek.getDate() + 7);
                    setCurrentWeek(nextWeek);
                  }}
                >
                  Tuần sau →
                </button>
              </div>

              <div className="week-grid">
                {getWeekDays().map((day, idx) => {
                  const daySchedules = getSchedulesByDate(day);
                  // Lấy thứ thực tế của ngày (0 = CN, 1 = T2, ..., 6 = T7)
                  const dayOfWeek = day.getDay();
                  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                  const dayName = dayNames[dayOfWeek];
                  
                  return (
                    <div key={idx} className="week-day">
                      <div className="day-header">
                        <div className="day-name">{dayName}</div>
                        <div className="day-number">{day.getDate()}</div>
                      </div>
                      <div className="day-schedules">
                        {daySchedules.map((schedule) => {
                          const canEdit = canEditSchedule(schedule);
                          const isPaused = schedule.status === 'paused';
                          // Nếu đã tạm ngưng thì không thể sửa/xóa nữa (đã khóa)
                          const canModify = canEdit && !isPaused;
                          
                          return (
                            <div 
                              key={schedule.id} 
                              className="schedule-item"
                              style={{ borderLeftColor: getScheduleColor(schedule) }}
                            >
                              <div className="schedule-time">
                                {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                              </div>
                              <div className="schedule-title">{schedule.title}</div>
                              {schedule.is_exam && (
                                <div className="exam-badge">
                                  <FiAlertCircle /> Lịch thi
                                </div>
                              )}
                              {isPaused && (
                                <div className="exam-badge" style={{ backgroundColor: '#f59e0b', color: '#fff' }}>
                                  <FiPause /> Tạm ngưng
                                </div>
                              )}
                              <div className="schedule-type">{schedule.type === 'online' ? '🌐 Online' : '🏠 Offline'}</div>
                              {canModify ? (
                                <div className="schedule-actions">
                                  <button 
                                    className="btn-icon-small"
                                    onClick={() => handleEdit(schedule)}
                                    title="Chỉnh sửa"
                                  >
                                    <FiEdit />
                                  </button>
                                  <button 
                                    className="btn-icon-small btn-danger"
                                    onClick={() => handleDelete(schedule.id)}
                                    title="Xóa"
                                  >
                                    <FiTrash2 />
                                  </button>
                                </div>
                              ) : (
                                // Tuần đã qua hoặc đã tạm ngưng - chỉ hiển thị nút tạm ngưng (nếu chưa paused)
                                // Nếu đã paused rồi thì không hiển thị nút nữa (đã khóa)
                                !isPaused && (
                                  <button 
                                    className="btn-pause"
                                    onClick={() => handlePause(schedule.id)}
                                    title="Tạm ngưng"
                                  >
                                    <FiPause /> Tạm ngưng
                                  </button>
                                )
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      {showEditModal && editingSchedule && (
        <div className="modal-overlay" onClick={() => { setShowEditModal(false); setEditingSchedule(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chỉnh sửa lịch học</h3>
              <button className="btn-close" onClick={() => { setShowEditModal(false); setEditingSchedule(null); }}>
                <FiX />
              </button>
            </div>

            <div className="schedule-form">
              <div className="form-group">
                <label>Tiêu đề *</label>
                <input
                  type="text"
                  value={editingSchedule.title}
                  onChange={(e) => setEditingSchedule({ ...editingSchedule, title: e.target.value })}
                  required
                  placeholder="Tiêu đề lịch học"
                />
              </div>

              <div className="form-group">
                <label>Ngày học *</label>
                <input
                  type="date"
                  value={editingSchedule.date}
                  onChange={(e) => setEditingSchedule({ ...editingSchedule, date: e.target.value })}
                  required
                  min={getNextMonday().toISOString().split('T')[0]}
                  max={getNextSunday().toISOString().split('T')[0]}
                />
                <small>Chỉ được chọn ngày trong tuần tiếp theo</small>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Giờ bắt đầu * (8h-21h)</label>
                  <input
                    type="time"
                    value={editingSchedule.startTime}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, startTime: e.target.value })}
                    required
                    min="08:00"
                    max="20:59"
                  />
                </div>

                <div className="form-group">
                  <label>Giờ kết thúc * (8h-21h)</label>
                  <input
                    type="time"
                    value={editingSchedule.endTime}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, endTime: e.target.value })}
                    required
                    min="08:00"
                    max="21:00"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Loại *</label>
                  <select
                    value={editingSchedule.type}
                    onChange={(e) => {
                      setEditingSchedule({
                        ...editingSchedule,
                        type: e.target.value,
                        meetingLink: e.target.value === 'offline' ? '' : editingSchedule.meetingLink
                      });
                    }}
                    required
                  >
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={editingSchedule.isExam}
                      onChange={(e) => setEditingSchedule({ ...editingSchedule, isExam: e.target.checked })}
                    />
                    {" "}Lịch thi định kỳ
                  </label>
                </div>
              </div>

              {editingSchedule.type === "online" && (
                <div className="form-group">
                  <label>Link meeting (có thể để trống, chỉnh sau)</label>
                  <input
                    type="url"
                    value={editingSchedule.meetingLink}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, meetingLink: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              )}

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowEditModal(false); setEditingSchedule(null); }}>
                  Hủy
                </button>
                <button type="button" className="btn-primary" onClick={handleUpdateSchedule}>
                  Cập nhật
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
