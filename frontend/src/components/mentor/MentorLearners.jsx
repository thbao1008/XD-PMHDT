import { useEffect, useState } from "react";
import { getAuth } from "../../utils/auth";
import Modal from "../common/Modal";
import "../../styles/mentor.css";
import api from "../../api";   // axios instance với baseURL http://localhost:4002/api

export default function MentorLearners() {
  const auth = getAuth();
  const [learners, setLearners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mentorId, setMentorId] = useState(null);

  // Modal state
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedLearner, setSelectedLearner] = useState(null);
  const [noteInput, setNoteInput] = useState("");
  const [reportInput, setReportInput] = useState("");

  // Theo dõi số lượng học viên trước đó để phát hiện học viên mới
  const [prevCount, setPrevCount] = useState(0);

  useEffect(() => {
    async function fetchLearners() {
      try {
        const userId = auth?.user?._id || auth?.user?.id || auth?.user?.user_id;
        const mentorRes = await api.get(`/mentors/by-user/${userId}`);
        const mid = mentorRes.data.mentor_id || mentorRes.data.id;
        setMentorId(mid);

        const learnersRes = await api.get(`/mentors/${mid}/learners`);
        const newLearners = learnersRes.data.learners.map(l => ({
          ...l,
          report: l.report || null,
          report_reply: l.report_reply || null,
        }));

        // Nếu số lượng tăng lên thì báo có học viên mới
        if (prevCount && newLearners.length > prevCount) {
          alert("🎉 Bạn có 1 học viên mới được gán vào!");
        }

        setLearners(newLearners);
        setPrevCount(newLearners.length);
      } catch (err) {
        console.error("❌ Error fetching learners:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLearners();
  }, [auth, prevCount]);

  if (loading) return <p>Đang tải danh sách học viên...</p>;
  if (!learners.length) return <p>Chưa có học viên nào</p>;

  // mở modal ghi chú
  const openNoteModal = (learner) => {
    setSelectedLearner(learner);
    setNoteInput("");
    setShowNoteModal(true);
  };

  const saveNote = async () => {
    try {
      const res = await api.put(`/mentors/learners/${selectedLearner.learner_id}/note`, {
        note: noteInput,
      });
      const updatedLearner = res.data.learner;
      setLearners(prev =>
        prev.map(l =>
          l.learner_id === selectedLearner.learner_id ? { ...l, note: updatedLearner.note } : l
        )
      );
    } catch (err) {
      console.error("❌ Error saving note:", err);
    } finally {
      setShowNoteModal(false);
    }
  };

  // mở modal report
  const openReportModal = (learner) => {
    setSelectedLearner(learner);
    setReportInput("");
    setShowReportModal(true);
  };

  const saveReport = async () => {
    try {
      const reporterId = auth?.user?._id || auth?.user?.id || auth?.user?.user_id;
      const targetId = selectedLearner?.user_id;

      await api.post("/admin/reports", {
        reporter_id: reporterId,
        target_id: targetId,
        content: reportInput,
        status: "pending",
      });

      setLearners(prev =>
        prev.map(l =>
          l.learner_id === selectedLearner.learner_id
            ? { ...l, report: reportInput }
            : l
        )
      );
    } catch (err) {
      console.error("❌ Error saving report:", err);
    } finally {
      setShowReportModal(false);
    }
  };

  return (
    <div className="mentor-learners">
      <h3>Danh sách học viên</h3>
      <table className="learners-table">
        <thead>
          <tr>
            <th>STT</th>
            <th>Họ và tên</th>
            <th>Email</th>
            <th>Số điện thoại</th>
            <th>Ngày sinh</th>
            <th>Tình trạng gói</th>
            <th>Ghi chú</th>
            <th>Report</th>
          </tr>
        </thead>
        <tbody>
          {learners.map((l, index) => (
            <tr key={l.learner_id}>
              <td>{index + 1}</td>
              <td>{l.learner_name}</td>
              <td>{l.email}</td>
              <td>{l.phone}</td>
              <td>{l.dob ? new Date(l.dob).toLocaleDateString("vi-VN") : "—"}</td>
              <td>{l.package_status || "Chưa có"}</td>
              <td
                className="note-cell"
                style={{ whiteSpace: "pre-line" }}
                onClick={() => openNoteModal(l)}
              >
                {l.note || <span className="placeholder">Nhấn để ghi chú</span>}
              </td>
              <td>
                {l.report ? (
                  <>
                    <span
                      className="reported-label clickable"
                      onClick={() => {
                        setSelectedLearner(l);
                        setReportInput(l.report);
                        setShowReportModal(true);
                      }}
                    >
                      Đã gửi báo cáo (xem nội dung)
                    </span>
                    {l.report_reply && (
                      <div className="admin-reply">
                        <small>{l.report_reply}</small>
                      </div>
                    )}
                    {l.report_status === "dismissed" && (
                      <button
                        className="report-btn"
                        onClick={() => openReportModal(l)}
                        style={{ marginTop: "5px" }}
                      >
                        Gửi lại Report
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    className="report-btn"
                    onClick={() => openReportModal(l)}
                  >
                    Report
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal ghi chú */}
      {showNoteModal && (
        <Modal
          title={`Ghi chú cho ${selectedLearner.learner_name}`}
          onClose={() => setShowNoteModal(false)}
        >
          <textarea
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            rows="5"
            style={{ width: "100%" }}
            placeholder="Nhập ghi chú..."
          />
          <div className="modal-actions">
            <button className="btn-save" onClick={saveNote}>Lưu</button>
            <button className="btn-cancel" onClick={() => setShowNoteModal(false)}>Hủy</button>
          </div>
        </Modal>
      )}

      {/* Modal report */}
      {showReportModal && (
        <Modal
          title={`Report học viên ${selectedLearner.learner_name}`}
          onClose={() => setShowReportModal(false)}
        >
          {selectedLearner.report ? (
            <div>
              <p><strong>Nội dung report đã gửi:</strong></p>
              <p style={{ whiteSpace: "pre-line" }}>{selectedLearner.report}</p>

              {selectedLearner.report_reply && (
                <div style={{ marginTop: "10px" }}>
                  <p><strong>Thông báo từ admin:</strong></p>
                  <p style={{ whiteSpace: "pre-line" }}>{selectedLearner.report_reply}</p>
                </div>
              )}

              {selectedLearner.report_status === "dismissed" && (
                <>
                  <hr />
                  <p><strong>Gửi lại report:</strong></p>
                  <textarea
                    value={reportInput}
                    onChange={(e) => setReportInput(e.target.value)}
                    rows="5"
                    style={{ width: "100%" }}
                    placeholder="Nhập lý do báo cáo bổ sung..."
                  />
                  <div className="modal-actions">
                    <button className="btn-save" onClick={saveReport}>Gửi lại Report</button>
                    <button className="btn-cancel" onClick={() => setShowReportModal(false)}>Hủy</button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <textarea
                value={reportInput}
                onChange={(e) => setReportInput(e.target.value)}
                rows="5"
                style={{ width: "100%" }}
                placeholder="Nhập lý do báo cáo..."
              />
                            <div className="modal-actions">
                <button className="btn-save" onClick={saveReport}>Gửi Report</button>
                <button className="btn-cancel" onClick={() => setShowReportModal(false)}>Hủy</button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
