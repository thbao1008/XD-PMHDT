import React, { useEffect, useState } from "react";
import api from "../../api.js";
import Modal from "./Modal.jsx";
import UserForPage from "../admin/UserForPage.jsx";

export default function AssignedLearnersModal({ mentorId, onClose }) {
  const [learners, setLearners] = useState([]);
  const [selectedLearnerId, setSelectedLearnerId] = useState(null);
  const [realMentorId, setRealMentorId] = useState(null);

  useEffect(() => {
    if (!mentorId) return;
    const fetchLearners = async () => {
      try {
        const mentorRes = await api.get(`/mentors/by-user/${mentorId}`);
        const mentorIdValue = mentorRes.data.mentor_id || mentorRes.data.id;
        setRealMentorId(mentorIdValue);

        const learnersRes = await api.get(`/admin/mentors/${mentorIdValue}/learners`);
        setLearners(learnersRes.data.learners || []);
      } catch (err) {
        console.error("❌ Lỗi load learners:", err);
      }
    };
    fetchLearners();
  }, [mentorId]);

  const handleRemoveLearner = async (learnerId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa học viên này khỏi giảng viên? Học viên sẽ bị ban tạm thời và không được tự động gán lại.")) {
      return;
    }

    try {
      await api.post("/admin/users/learners/remove-from-mentor", {
        learnerId,
        mentorId: realMentorId,
      });
      alert("Đã xóa học viên khỏi giảng viên thành công");
      // Refresh danh sách
      const learnersRes = await api.get(`/admin/mentors/${realMentorId}/learners`);
      setLearners(learnersRes.data.learners || []);
    } catch (err) {
      console.error("❌ Lỗi xóa learner:", err);
      alert("Có lỗi xảy ra khi xóa học viên");
    }
  };

  return (
    <Modal title="Danh sách học viên được bổ nhiệm" onClose={onClose}>
      <table className="table">
        <thead>
          <tr>
            <th>STT</th>
            <th>Tên học viên</th>
            <th>Email</th>
            <th>SĐT</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {learners.map((l, idx) => (
            <tr key={l.learner_id || l.id}>
              <td>{idx + 1}</td>
              <td>{l.learner_name || l.name}</td>
              <td>{l.email}</td>
              <td>{l.phone}</td>
              <td>
                <button 
                  onClick={() => setSelectedLearnerId(l.user_id)}
                  style={{ marginRight: "8px" }}
                >
                  Xem
                </button>
                <button 
                  onClick={() => handleRemoveLearner(l.learner_id || l.id)}
                  style={{ 
                    backgroundColor: "#dc3545", 
                    color: "white",
                    border: "none",
                    padding: "4px 12px",
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                >
                  Xóa
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedLearnerId && (
        <UserForPage
          userId={selectedLearnerId}
          onClose={() => setSelectedLearnerId(null)}
        />
      )}
    </Modal>
  );
}
