import { useEffect, useState } from "react";
import {
  FiPlus,
  FiTrash2,
  FiCalendar,
  FiClock,
  FiPauseCircle,
  FiEdit,
  FiMonitor,
  FiHome,
  FiRepeat,
  FiChevronUp
} from "react-icons/fi";
import { getAuth } from "../../utils/auth";
import "../../styles/mentorsessions.css";
import api from "../../api";
import Modal from "../common/Modal";

// Hàm tính tuần
function getWeekRange(dateStr) {
  if (!dateStr) return { weekStart: null, weekEnd: null };
  const d = new Date(dateStr);
  if (isNaN(d)) return { weekStart: null, weekEnd: null };
  const day = d.getDay();
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  return { weekStart: fmt(monday), weekEnd: fmt(sunday) };
}

function getNextMonday() {
  const today = new Date();
  const day = today.getDay();
  const diffToNextMonday = (day === 0 ? 1 : 8 - day);
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + diffToNextMonday);
  return `${nextMonday.getFullYear()}-${String(nextMonday.getMonth() + 1).padStart(2,"0")}-${String(nextMonday.getDate()).padStart(2,"0")}`;
}

function safeDateForInput(src) {
  if (!src) return "";
  const d = new Date(src);
  if (isNaN(d)) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
function safeTimeForInput(src) {
  if (!src) return "";
  if (typeof src === "string") {
    if (/^\d{2}:\d{2}$/.test(src)) return src;
    return src.slice(0,5);
  }
  const d = new Date(src);
  if (isNaN(d)) return "";
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

export default function MentorSessions() {
  const auth = getAuth();
  const [mentorId, setMentorId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newSessions, setNewSessions] = useState([
    { date: "", startTime: "", endTime: "", type: "online", note: "", isExam: false }
  ]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [noteEdit, setNoteEdit] = useState("");

  // Thêm state để toggle giữa lịch hiện tại / đã giảng dạy
  const [activeTab, setActiveTab] = useState("upcoming");
  // Nút scroll-top khi cuộn xa
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    async function fetchMentorId() {
      const userId = auth?.user?.id || auth?.user?.user_id;
      const mentorRes = await api.get(`/mentors/by-user/${userId}`);
      setMentorId(mentorRes.data.mentor_id || mentorRes.data.id);
    }
    fetchMentorId();
  }, [auth]);

  useEffect(() => {
    if (!mentorId) return;
    fetchSessions();
  }, [mentorId]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const fetchSessions = async () => {
  const res = await api.get(`/mentors/${mentorId}/sessions`);
  const final = (res.data.sessions || [])
    .map(s => ({
      id: s.id,
      date: safeDateForInput(s.date),
      startTime: safeTimeForInput(s.start_time),
      endTime: safeTimeForInput(s.end_time),
      type: s.type,
      note: s.note || "",
      isExam: !!s.is_exam,
      paused: !!s.paused
    }))
    .sort((a, b) => new Date(a.date + " " + a.startTime) - new Date(b.date + " " + b.startTime));

  // phân loại theo thời gian
  const now = new Date();
  const withStatus = final.map(s => {
    const start = new Date(`${s.date} ${s.startTime}`);
    const end = new Date(`${s.date} ${s.endTime}`);
    let status = "upcoming";
    if (end < now) status = "completed";
    else if (start <= now && end >= now) status = "ongoing";
    return { ...s, status };
  });

  setSessions(withStatus);
};


  const updateSession = (index, field, value) => {
    const updated = [...newSessions];
    updated[index][field] = value;
    setNewSessions(updated);
  };

  const addNewSession = () =>
    setNewSessions([
      ...newSessions,
      { date: "", startTime: "", endTime: "", type: "online", note: "", isExam: false }
    ]);

  const removeSession = (index) => {
    const updated = [...newSessions];
    updated.splice(index, 1);
    setNewSessions(updated);
  };

  const saveSchedule = async () => {
  console.log("Saving schedule...", newSessions);

  // --- Kiểm tra dữ liệu trước khi gửi ---
  if (newSessions.length > 0) {
    const first = newSessions[0];
    const d = new Date(first.date);
    if (isNaN(d)) {
      alert("Ngày không hợp lệ");
      return;
    }

    // tìm thứ 2 tuần kế tiếp
    const today = new Date();
    const day = today.getDay();
    const diffToNextMonday = (day === 0 ? 1 : 8 - day);
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + diffToNextMonday);

    if (d < nextMonday) {
      alert("Ngày tạo phải từ thứ 2 tuần tiếp theo trở đi");
      return;
    }

    // kiểm tra số buổi (trừ lịch thi)
    const hasExam = newSessions.some(s => s.isExam);
    if (!hasExam) {
      const range = getWeekRange(first.date);
      if (range.weekStart && range.weekEnd) {
        const weekStart = new Date(range.weekStart);
        const weekEnd = new Date(range.weekEnd);

        const offlineCount = newSessions.filter(s => {
          const dd = new Date(s.date);
          return s.type.toLowerCase() === "offline" && dd >= weekStart && dd <= weekEnd;
        }).length;

        const onlineCount = newSessions.filter(s => {
          const dd = new Date(s.date);
          return s.type.toLowerCase() === "online" && dd >= weekStart && dd <= weekEnd;
        }).length;

        // ✅ cả 2 cùng pass thì mới cho tạo
        if (!(offlineCount >= 1 && onlineCount >= 2)) {
          alert("Mỗi tuần phải có ≥1 offline và ≥2 online (trừ lịch thi)");
          return;
        }
      }
    }
  }

  // --- Kiểm tra giờ bắt đầu/kết thúc ---
  for (const s of newSessions) {
    const start = safeTimeForInput(s.startTime);
    const end = safeTimeForInput(s.endTime);

    if (!start || !end) {
      alert("Giờ bắt đầu/kết thúc không hợp lệ");
      return;
    }
    if (start >= end) {
      alert("Giờ bắt đầu phải nhỏ hơn giờ kết thúc");
      return;
    }
  }

  // --- Gửi API theo batch ---
  try {
    const payloads = newSessions.map(s => ({
      date: safeDateForInput(s.date),
      start_time: `${safeTimeForInput(s.startTime)}:00`,
      end_time: `${safeTimeForInput(s.endTime)}:00`,
      type: s.type.toLowerCase(), // ép về đúng format DB
      note: s.note || "",
      is_exam: s.isExam
    }));

    console.log("Posting batch:", payloads);

    await api.post(`/mentors/${mentorId}/sessions/batch`, payloads);

    setCreating(false);
    setNewSessions([{ date:"", startTime:"", endTime:"", type:"online", note:"", isExam:false }]);
    await fetchSessions();
    alert("Lưu lịch thành công!");
    console.log("Schedule saved and reloaded");
  } catch (err) {
    console.error("Save schedule error:", err);
    const msg = err?.response?.data?.message || "Có lỗi khi lưu lịch";
    alert(msg);
  }
};
  

  const handleSaveNote = async () => {
    await api.put(`/mentors/${mentorId}/sessions/${selectedSession.id}`, { note: noteEdit });
    fetchSessions();
    setSelectedSession(null);
  };

  const renderSession = (s) => (
  <div
    key={s.id}
    className={`schedule-row ${s.paused ? "paused" : ""}`}
    onClick={() => {
      setSelectedSession(s);
      setNoteEdit(s.note);
    }}
  >
    {s.paused && <span className="paused-badge"><FiPauseCircle /> Tạm ngưng</span>}
    <div className="row-left">
      <h4><FiCalendar /> {s.date}</h4>
      <p><FiClock /> {s.startTime} – {s.endTime}</p>
    </div>

    <div className="row-middle">
      <p>{s.type === "online" ? <><FiMonitor /> Online</> : <><FiHome /> Offline</>}</p>
      {s.isExam && <strong>📌 Lịch thi</strong>}
    </div>

    <div className="row-right">
      {s.isExam && s.note ? (
        <div className="exam-note">📒 {s.note}</div>
      ) : (
        <p>{s.note || "Không có ghi chú"}</p>
      )}
    </div>
  </div>
);

  const handlePause = async () => {
    if (window.confirm("Sau khi tạm ngưng sẽ không mở lại được, bạn chắc chắn chứ?")) {
      await api.put(`/mentors/${mentorId}/sessions/${selectedSession.id}`, { paused: true });
      fetchSessions();
      setSelectedSession(null);
    }
  };

  return (
    <div className="mentor-sessions">
      <h2><FiCalendar /> Lịch dạy của Mentor</h2>

      {!creating ? (
        <>
          {/* Header đối xứng: nút tạo lịch mới bên trái, nút toggle bên phải */}
          <div className="header-actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <button className="btn-create" onClick={() => setCreating(true)}>
              <FiPlus /> Tạo lịch mới
            </button>
            <button
              className="btn-toggle"
              onClick={() => setActiveTab(activeTab === "upcoming" ? "completed" : "upcoming")}
              title={activeTab === "upcoming" ? "Xem lịch đã giảng dạy" : "Xem lịch hiện tại"}
            >
              <FiRepeat /> {activeTab === "upcoming" ? "Chuyển sang lịch đã giảng dạy" : "Chuyển sang lịch hiện tại"}
            </button>
          </div>

          <div className="schedule-list">
          
            {sessions.length === 0 && <p>Chưa có lịch nào</p>}
            {/* Lọc theo tab đang chọn thay vì render tất cả */}
            {sessions
              .filter(s => s.status === activeTab)
              .map((s) => {
                const range = getWeekRange(s.date);
                const inSameWeek = range.weekStart && range.weekEnd
                  ? sessions.some(
                      other => other.id !== s.id &&
                        other.date >= range.weekStart &&
                        other.date <= range.weekEnd
                    )
                  : false;
                return (
                  <div
                    key={s.id}
                    className={`schedule-row ${s.paused ? "paused" : ""} ${inSameWeek ? "same-week" : ""}`}
                    onClick={() => {
                      setSelectedSession(s);
                      setNoteEdit(s.note);
                    }}
                  >
                    {s.paused && <span className="paused-badge"><FiPauseCircle /> Tạm ngưng</span>}
                    <div className="row-left">
                      <h4><FiCalendar /> {s.date}</h4>
                      <p><FiClock /> {s.startTime} – {s.endTime}</p>
                    </div>

                    <div className="row-middle">
                      <p>{s.type === "online" ? <><FiMonitor /> Online</> : <><FiHome /> Offline</>}</p>
                      {s.isExam && <strong>📌 Lịch thi</strong>}
                    </div>

                    <div className="row-right">
                      {s.isExam && s.note ? (
                        <div className="exam-note">📒 {s.note}</div>
                      ) : (
                        <p>{s.note || "Không có ghi chú"}</p>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </>
      ) : (
        <div className="new-schedule-form">
          <h3>
            <FiPlus /> Tạo lịch mới
          </h3>
          <table className="schedule-table">
            <thead>
              <tr>
                <th><FiCalendar /> Ngày</th>
                <th><FiClock /> Bắt đầu</th>
                <th><FiClock /> Kết thúc</th>
                <th><FiMonitor /> Loại</th>
                <th><FiEdit /> Ghi chú</th>
                <th>📌 Thi</th>
                <th>🛠️ Hành động</th>
              </tr>
            </thead>
            <tbody>
              {newSessions.map((s, idx) => {
                const range = getWeekRange(s.date);
                const inSameWeek = range.weekStart && range.weekEnd
                  ? newSessions.some(
                      other => other !== s &&
                        other.date >= range.weekStart &&
                        other.date <= range.weekEnd
                    )
                  : false;
                return (
                  <tr key={idx} className={inSameWeek ? "same-week" : ""}>
                    <td>
                      <input
                        type="date"
                        required
                        min={getNextMonday()}
                        value={safeDateForInput(s.date)}
                        onChange={(e) => updateSession(idx, "date", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        required
                        value={safeTimeForInput(s.startTime)}
                        onChange={(e) => updateSession(idx, "startTime", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        required
                        value={safeTimeForInput(s.endTime)}
                        onChange={(e) => updateSession(idx, "endTime", e.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        value={s.type}
                        onChange={(e) => updateSession(idx, "type", e.target.value)}
                      >
                        <option value="online">💻 Online</option>
                        <option value="offline">🏫 Offline</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={s.note}
                        placeholder="Thêm ghi chú..."
                        onChange={(e) => updateSession(idx, "note", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={s.isExam}
                        onChange={(e) => updateSession(idx, "isExam", e.target.checked)}
                      />
                    </td>
                    <td>
                      <button onClick={() => removeSession(idx)} className="btn-icon">
                        <FiTrash2 /> Xóa
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="form-actions">
            <button onClick={addNewSession}>
              <FiPlus /> Thêm buổi
            </button>
            <button onClick={saveSchedule}>
              <FiEdit /> Lưu lịch
            </button>
            <button onClick={() => setCreating(false)} className="btn-secondary">⬅️ Quay về</button>
          </div>
        </div>
      )}

      {selectedSession && (
        <Modal title="Chi tiết buổi học" onClose={() => setSelectedSession(null)}>
          <p><strong>Ngày:</strong> {selectedSession.date}</p>
          <p><strong>Giờ:</strong> {selectedSession.startTime} – {selectedSession.endTime}</p>
          <p><strong>Loại:</strong> {selectedSession.type === "online" ? "💻 Online" : "🏫 Offline"}</p>
          {selectedSession.isExam && <p><strong>📌 Đây là lịch thi</strong></p>}
          <label>
            <strong>Ghi chú:</strong>
            <textarea
              value={noteEdit}
              onChange={(e) => setNoteEdit(e.target.value)}
              rows={3}
              style={{ width: "100%", marginTop: "8px" }}
            />
          </label>
          <div className="modal-actions">
            <button className="btn-save" onClick={handleSaveNote}>
              <FiEdit /> Lưu ghi chú
            </button>
            <button onClick={handlePause} className="btn-pause">
              <FiPauseCircle /> Tạm ngưng
            </button>
          </div>
        </Modal>
      )}

      {showScrollTop && (
        <button
          className="btn-scroll-top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          title="Trở lên trên cùng"
        >
          <FiChevronUp /> Trở lên trên cùng
        </button>
      )}
    </div>
  );
}
