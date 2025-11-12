import React, { useEffect, useState } from "react";
import api from "../../api.js";
import Modal from "./Modal.jsx";
import UserForPage from "../admin/UserForPage.jsx";

export default function AssignedLearnersModal({ mentorId, onClose }) {
  const [learners, setLearners] = useState([]);
  const [selectedLearnerId, setSelectedLearnerId] = useState(null);

  useEffect(() => {
    if (!mentorId) return;
    const fetchLearners = async () => {
      try {
        // nếu mentorId thực chất là userId thì phải đổi sang mentorId thật
        const mentorRes = await api.get(`/mentors/by-user/${mentorId}`);
        const realMentorId = mentorRes.data.mentor_id || mentorRes.data.id;

        const learnersRes = await api.get(`/admin/mentors/${realMentorId}/learners`);
        setLearners(learnersRes.data.learners || []);
      } catch (err) {
        console.error("❌ Lỗi load learners:", err);
      }
    };
    fetchLearners();
  }, [mentorId]);

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
                <button onClick={() => setSelectedLearnerId(l.user_id)}>
                  Xem
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
