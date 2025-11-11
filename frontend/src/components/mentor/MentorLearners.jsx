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

  useEffect(() => {
    async function fetchLearners() {
      try {
        const userId = auth?.user?._id || auth?.user?.id || auth?.user?.user_id;
        const mentorRes = await api.get(`/mentors/by-user/${userId}`);
        const mid = mentorRes.data.mentor_id || mentorRes.data.id;
        setMentorId(mid);

        const learnersRes = await api.get(`/mentors/${mid}/learners`);
        setLearners(learnersRes.data.learners);
      } catch (err) {
        console.error("❌ Error fetching learners:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLearners();
  }, [auth]);

  if (loading) return <p>Đang tải danh sách học viên...</p>;
  if (!learners.length) return <p>Chưa có học viên nào</p>;

  // mở modal ghi chú
  const openNoteModal = (learner) => {
    setSelectedLearner(learner);
    setNoteInput(learner.note || "");
    setShowNoteModal(true);
  };

  const saveNote = async () => {
    try {
      await api.put(`/mentors/learners/${selectedLearner.learner_id}/note`, {
        note: noteInput,
      });
      setLearners(prev =>
        prev.map(l =>
          l.learner_id === selectedLearner.learner_id ? { ...l, note: noteInput } : l
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
    // Khai báo biến ngay đầu hàm
    const reporterId = auth?.user?.id;          // user_id của người gửi
    const targetId = selectedLearner?.user_id;  // user_id của người bị tố cáo
    console.log("selectedLearner:", selectedLearner);
    console.log("Payload gửi lên:", {
      reporter_id: reporterId,
      target_id: targetId,
      content: reportInput,
    });

    await api.post("/reports", {
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
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {learners.map((l, index) => (
            <tr key={l.learner_id}>
              <td>{index + 1}</td>
              <td>{l.learner_name}</td>
              <td>{l.email}</td>
              <td>{l.phone}</td>
              <td>{l.dob}</td>
              <td>{l.package_status || "Chưa có"}</td>
              <td>{l.note || "—"}</td>
              <td>{l.report || "—"}</td>
              <td>
                <button className="note-btn" onClick={() => openNoteModal(l)}>
                  Ghi chú
                </button>
                <button className="report-btn" onClick={() => openReportModal(l)}>
                  Report
                </button>
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
          />
          <div className="modal-actions">
            <button className="save-btn" onClick={saveNote}>Lưu</button>
            <button className="cancel-btn" onClick={() => setShowNoteModal(false)}>Hủy</button>
          </div>
        </Modal>
      )}

      {/* Modal report */}
      {showReportModal && (
        <Modal
          title={`Report học viên ${selectedLearner.learner_name}`}
          onClose={() => setShowReportModal(false)}
        >
          <textarea
            value={reportInput}
            onChange={(e) => setReportInput(e.target.value)}
            rows="5"
            style={{ width: "100%" }}
            placeholder="Nhập lý do báo cáo..."
          />
          <div className="modal-actions">
            <button className="save-btn" onClick={saveReport}>Gửi Report</button>
            <button className="cancel-btn" onClick={() => setShowReportModal(false)}>Hủy</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
