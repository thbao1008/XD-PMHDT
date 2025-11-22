// src/components/mentor/AssessmentPanel.jsx
import React, { useEffect, useState, useMemo } from "react";
import api from "../../api";
import { getAuth } from "../../utils/auth";
import AssessmentModal from "./AssessmentModal";
import { FiCheckCircle, FiClock, FiEye } from "react-icons/fi";
import "../../styles/assessment.css";

export default function AssessmentPanel() {
  const [mentorId, setMentorId] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [showGradedOnly, setShowGradedOnly] = useState(false);

  useEffect(() => {
    async function fetchSubmissions() {
      console.log("[AssessmentPanel] Bắt đầu đọc auth từ localStorage...");
      try {
        const auth = getAuth();
        if (!auth || !auth.user) {
          console.warn("[AssessmentPanel] Không tìm thấy auth");
          setErr("Không tìm thấy thông tin đăng nhập");
          setLoading(false);
          return;
        }

        const userId = auth.user._id || auth.user.id || auth.user.user_id;
        console.log("[AssessmentPanel] auth.user:", auth.user);

        if (!userId) {
          console.warn("[AssessmentPanel] Không tìm thấy userId trong auth.user");
          setErr("Không xác định được người dùng");
          setLoading(false);
          return;
        }

        console.log(`[AssessmentPanel] Gọi API /mentors/by-user/${userId}`);
        const mentorRes = await api.get(`/mentors/by-user/${userId}`);
        console.log("[AssessmentPanel] Kết quả mentor:", mentorRes.data);

        const mid = mentorRes.data.mentor_id || mentorRes.data.id;
        if (!mid) {
          console.warn("[AssessmentPanel] Không tìm thấy mentor_id trong kết quả");
          setErr("Không tìm thấy mentor tương ứng");
          setLoading(false);
          return;
        }

        setMentorId(mid);

        console.log(`[AssessmentPanel] Gọi API /mentors/${mid}/submissions`);
        const submissionsRes = await api.get(`/mentors/${mid}/submissions`);
        console.log("[AssessmentPanel] Kết quả submissions:", submissionsRes.data);

        setSubmissions(submissionsRes.data.submissions || []);
      } catch (error) {
        console.error("[AssessmentPanel] Lỗi khi fetch submissions:", {
          message: error?.message,
          status: error?.response?.status,
          data: error?.response?.data,
        });
        setErr(error?.response?.data?.error || error?.response?.data?.message || "Không thể tải submissions");
      } finally {
        setLoading(false);
      }
    }

    fetchSubmissions();
  }, []);

  // Kiểm tra submission đã được chấm điểm chưa (từ feedbacks theo submission_id)
  // Chỉ coi là đã chấm nếu có điểm từ feedbacks (mỗi submission có điểm riêng)
  const isGraded = (submission) => {
    return !!(
      (submission.final_score !== null && submission.final_score !== undefined) ||
      (submission.pronunciation_score !== null && submission.pronunciation_score !== undefined) ||
      (submission.fluency_score !== null && submission.fluency_score !== undefined) ||
      submission.feedback
    );
  };

  // Lọc submissions
  const filteredSubmissions = useMemo(() => {
    if (!showGradedOnly) return submissions;
    return submissions.filter(isGraded);
  }, [submissions, showGradedOnly]);

  if (loading) return <div className="assessment-panel-loading">Đang tải submissions...</div>;
  if (err) return <div className="assessment-panel-error">{err}</div>;

  const gradedCount = submissions.filter(isGraded).length;
  const totalCount = submissions.length;

  return (
    <div className="assessment-panel">
      <div className="assessment-panel-header">
        <div className="assessment-panel-title">
          <h2>Danh sách bài nói đã nộp</h2>
          <span className="submission-count">
            {filteredSubmissions.length} / {totalCount} bài
          </span>
        </div>
        <div className="assessment-panel-filter">
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={showGradedOnly}
              onChange={(e) => setShowGradedOnly(e.target.checked)}
            />
            <span className="filter-label">
              <FiCheckCircle className="filter-icon" />
              Đã chấm điểm ({gradedCount})
            </span>
          </label>
        </div>
      </div>

      {filteredSubmissions.length === 0 ? (
        <div className="assessment-panel-empty">
          <p>{showGradedOnly ? "Chưa có bài nào đã được chấm điểm." : "Chưa có bài nào được nộp."}</p>
        </div>
      ) : (
        <div className="submission-grid">
          {filteredSubmissions.map((s, idx) => {
            const graded = isGraded(s);
            return (
              <div key={s.id} className="submission-card-item">
                <div className="submission-card-number">
                  <span className="card-number">{idx + 1}</span>
                </div>
                <div className="submission-card-content">
                  <div className="submission-card-header">
                    <h3 className="submission-card-title">
                      {s.title || `Bài nộp #${s.id}`}
                    </h3>
                    {graded && (
                      <span className="submission-badge graded">
                        <FiCheckCircle /> Đã chấm
                      </span>
                    )}
                    {!graded && (
                      <span className="submission-badge pending">
                        <FiClock /> Chưa chấm
                      </span>
                    )}
                  </div>
                  <div className="submission-card-info">
                    <div className="submission-info-row">
                      <span className="info-label">Học viên:</span>
                      <span className="info-value">{s.learner_name || "N/A"}</span>
                    </div>
                    {s.created_at && (
                      <div className="submission-info-row">
                        <span className="info-label">Ngày nộp:</span>
                        <span className="info-value">
                          {new Date(s.created_at).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                    )}
                    {graded && s.final_score !== null && s.final_score !== undefined && (
                      <div className="submission-info-row">
                        <span className="info-label">Điểm:</span>
                        <span className="info-value score">{(s.final_score / 10).toFixed(1)}/10</span>
                      </div>
                    )}
                  </div>
                  <div className="submission-card-actions">
                    <button
                      className="btn-view-detail"
                      onClick={() => setSelectedId(s.id)}
                    >
                      <FiEye /> Xem chi tiết
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedId && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) setSelectedId(null);
        }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <AssessmentModal
              submissionId={selectedId}
              onClose={() => setSelectedId(null)}
              onSaved={(review) => {
                console.log("[AssessmentPanel] Review đã lưu:", review);
                // Refresh submissions after saving
                if (mentorId) {
                  api.get(`/mentors/${mentorId}/submissions`)
                    .then(res => setSubmissions(res.data.submissions || []))
                    .catch(err => console.error("Error refreshing submissions:", err));
                }
                setSelectedId(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
