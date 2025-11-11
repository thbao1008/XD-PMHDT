import React, { useState } from "react";
import { FiUserCheck, FiMic, FiClipboard, FiAlertTriangle } from "react-icons/fi";
import AssessmentModal from "../common/AssessmentModal";

const MAX_LEARNERS = 20;

export default function AssessmentPanel() {
  // Mock data learners
  const [learners, setLearners] = useState([
    { id: 1, name: "Nguyen Van A", package: "Business English", status: "Pending" },
    { id: 2, name: "Tran Thi B", package: "Travel English", status: "Completed" },
    { id: 3, name: "Le Van C", package: "Daily Conversation", status: "Pending" }
  ]);

  const [selectedLearner, setSelectedLearner] = useState(null);

  // xử lý lưu đánh giá từ modal
  function handleSaveAssessment(data) {
    setLearners((prev) =>
      prev.map((l) =>
        l.id === data.learnerId ? { ...l, status: "Completed" } : l
      )
    );
  }

  // thêm learner mock để test giới hạn
  function addLearnerMock() {
    if (learners.length >= MAX_LEARNERS) return;
    const nextId = Math.max(...learners.map(l => l.id), 0) + 1;
    setLearners(prev => [
      ...prev,
      { id: nextId, name: `Learner ${nextId}`, package: "General English", status: "Pending" }
    ]);
  }

  const isFull = learners.length >= MAX_LEARNERS;

  return (
    <div className="mentor-assessment">
      <div className="panel-header">
        <h2>Assessment Panel</h2>
        <p>Danh sách learners cần được đánh giá</p>
        <div className="kpi-row">
          <span className={`kpi-pill ${isFull ? "kpi-full" : ""}`}>
            Learners: {learners.length}/{MAX_LEARNERS}
          </span>
          <button
            className="btn-add"
            onClick={addLearnerMock}
            disabled={isFull}
          >
            + Thêm learner
          </button>
        </div>
        {isFull && (
          <div className="limit-warning">
            <FiAlertTriangle />Đã đạt giới hạn quản lý 15 học.
          </div>
        )}
      </div>

      <table className="assessment-table">
        <thead>
          <tr>
            <th><FiUserCheck /> Learner</th>
            <th><FiClipboard /> Package</th>
            <th>Status</th>
            <th><FiMic /> Action</th>
          </tr>
        </thead>
        <tbody>
          {learners.map((learner) => (
            <tr key={learner.id}>
              <td>{learner.name}</td>
              <td>{learner.package}</td>
              <td>
                <span
                  className={`status-badge ${
                    learner.status === "Completed" ? "done" : "pending"
                  }`}
                >
                  {learner.status}
                </span>
              </td>
              <td>
                {learner.status === "Pending" ? (
                  <button
                    className="btn-assess"
                    onClick={() => setSelectedLearner(learner)}
                  >
                    Đánh giá
                  </button>
                ) : (
                  <span className="done-text">✔ Đã đánh giá</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Tích hợp modal */}
      {selectedLearner && (
        <AssessmentModal
          learner={selectedLearner}
          onClose={() => setSelectedLearner(null)}
          onSave={handleSaveAssessment}
        />
      )}
    </div>
  );
}
