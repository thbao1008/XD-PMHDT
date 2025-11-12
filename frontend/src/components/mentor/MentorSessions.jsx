import React, { useState, useEffect } from "react";
import api from "../../api.js";
import "../../styles/mentorsessions.css";
function getNextMonday() {
  const today = new Date();
  const day = today.getDay(); // 0=CN, 1=T2,...
  const diff = (8 - day) % 7; // số ngày tới thứ 2 tuần sau
  today.setDate(today.getDate() + diff);
  return today.toISOString().split("T")[0];
}

const validateSessions = (sessions) => {
  if (!sessions || sessions.length === 0) return false;
  for (const s of sessions) {
    if (!s.date || !s.startTime || !s.endTime || !s.type) return false;
  }
  return true;
};

export default function MentorSessions({ mentorId }) {
  const [finalSessions, setFinalSessions] = useState([]);   // lịch chính thức
  const [draftSessions, setDraftSessions] = useState([]);   // lịch nháp
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (mentorId) {
      fetchFinal();
      fetchDraft();
    }
  }, [mentorId]);

  const fetchFinal = async () => {
    try {
      const res = await api.get(`/mentors/${mentorId}/sessions?status=final`);
      setFinalSessions(res.data.sessions || []);
    } catch (err) {
      console.error("❌ lỗi load final:", err);
    }
  };

  const fetchDraft = async () => {
    try {
      const res = await api.get(`/mentors/${mentorId}/sessions?status=draft`);
      const draft = res.data.sessions || [];
      setDraftSessions(
        draft.length > 0
          ? draft
          : [{ date: "", startTime: "", endTime: "", type: "online", note: "" }]
      );
    } catch (err) {
      console.error("❌ lỗi load draft:", err);
      setDraftSessions([{ date: "", startTime: "", endTime: "", type: "online", note: "" }]);
    }
  };

  const addNewSession = () =>
    setDraftSessions([...draftSessions, { date: "", startTime: "", endTime: "", type: "online", note: "" }]);

  const updateSession = (index, field, value) => {
    const updated = [...draftSessions];
    updated[index][field] = value;
    setDraftSessions(updated);
  };

  const removeSession = (index) => {
    const updated = [...draftSessions];
    updated.splice(index, 1);
    setDraftSessions(updated);
  };

  const saveDraft = async () => {
    if (!validateSessions(draftSessions)) {
      alert("❌ vui lòng nhập đủ ngày, giờ bắt đầu, giờ kết thúc, loại buổi trước khi lưu nháp.");
      return;
    }
    try {
      await api.post(`/mentors/${mentorId}/sessions/draft`, { sessions: draftSessions });
      alert("✅ đã lưu nháp");
    } catch (err) {
      console.error("❌ lỗi save draft:", err);
    }
  };

  const finalizeSchedule = async () => {
    if (!validateSessions(draftSessions)) {
      alert("❌ vui lòng nhập đủ thông tin trước khi chốt lịch.");
      return;
    }
    try {
      await api.post(`/mentors/${mentorId}/sessions/finalize`, { sessions: draftSessions });
      setCreating(false);
      setDraftSessions([]);
      fetchFinal();
    } catch (err) {
      console.error("❌ lỗi finalize:", err);
    }
  };

  return (
    <div className="mentor-sessions">
      <h2>📅 lịch dạy của mentor</h2>

      {!creating ? (
        <>
          <button
            className="btn-create"
            onClick={() => {
              setCreating(true);
              fetchDraft();
            }}
          >
            ➕ tạo lịch tuần mới
          </button>

          <div className="schedule-cards">
            {finalSessions.length === 0 && <p>chưa có lịch chính thức</p>}
            {finalSessions.map((s, idx) => (
              <div key={idx} className="schedule-card">
                <h4>{new Date(s.date).toLocaleDateString("vi-VN")}</h4>
                <p>{s.startTime} – {s.endTime}</p>
                <p>{s.type}</p>
                <p>{s.note || "không có ghi chú"}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="new-schedule-form">
          <h3>➕ tạo lịch mới (nháp)</h3>
          <table className="schedule-table">
            <thead>
              <tr>
                <th>ngày</th>
                <th>giờ bắt đầu</th>
                <th>giờ kết thúc</th>
                <th>loại buổi</th>
                <th>ghi chú</th>
                <th>hành động</th>
              </tr>
            </thead>
            <tbody>
              {draftSessions.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center" }}>
                    chưa có buổi nào, hãy bấm "thêm buổi"
                  </td>
                </tr>
              ) : (
                draftSessions.map((s, idx) => (
                  <tr key={idx}>
                    <td>
                      <input
                        type="date"
                        min={getNextMonday()}
                        value={s.date}
                        onChange={e => updateSession(idx, "date", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        value={s.startTime}
                        onChange={e => updateSession(idx, "startTime", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        value={s.endTime}
                        onChange={e => updateSession(idx, "endTime", e.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        value={s.type}
                        onChange={e => updateSession(idx, "type", e.target.value)}
                      >
                        <option value="online">online</option>
                        <option value="offline">offline</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        placeholder="ghi chú..."
                        value={s.note}
                        onChange={e => updateSession(idx, "note", e.target.value)}
                      />
                    </td>
                    <td>
                      <button onClick={() => removeSession(idx)}>xóa</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="form-actions">
            <button onClick={addNewSession}>➕ thêm buổi</button>
            <button onClick={saveDraft}>💾 lưu nháp</button>
            <button onClick={finalizeSchedule}>✅ chốt lịch</button>
            <button onClick={() => setCreating(false)}>⬅️ quay về</button>
          </div>
        </div>
      )}
    </div>
  );
}
