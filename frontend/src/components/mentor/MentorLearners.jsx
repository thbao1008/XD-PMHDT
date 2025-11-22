import { useEffect, useState } from "react";
import { getAuth } from "../../utils/auth";
import Modal from "../common/Modal";
import "../../styles/learnersofmentor.css";
import api from "../../api";   // axios instance với baseURL http://localhost:4002/api

export default function MentorLearners() {
  const auth = getAuth();
  const [learners, setLearners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mentorId, setMentorId] = useState(null);

  // Modal state
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLearner, setSelectedLearner] = useState(null);
  const [noteInput, setNoteInput] = useState("");
  const [reportInput, setReportInput] = useState("");
  const [reportImage, setReportImage] = useState(null);
  const [reportVideo, setReportVideo] = useState(null);
  const [reportStatus, setReportStatus] = useState({ canReport: true, hoursRemaining: 0 });
  const [checkingReport, setCheckingReport] = useState(false);

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
        const newLearners = learnersRes.data.learners.map(l => {
          // Normalize report data - ensure null if empty or invalid
          let report = null;
          if (l.report) {
            if (typeof l.report === 'string') {
              const trimmed = l.report.trim();
              if (trimmed.length > 0) {
                report = trimmed;
              }
            }
          }
          
          let report_reply = null;
          if (l.report_reply) {
            if (typeof l.report_reply === 'string') {
              const trimmed = l.report_reply.trim();
              if (trimmed.length > 0) {
                report_reply = trimmed;
              }
            }
          }
          
          return {
            ...l,
            report,
            report_reply,
          };
        });

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
  const openReportModal = async (learner) => {
    setSelectedLearner(learner);
    // Reset form - luôn bắt đầu với form trống
    setReportInput("");
    setReportImage(null);
    setReportVideo(null);
    setShowReportModal(true);
    
    // Check 24h constraint
    if (learner.user_id) {
      setCheckingReport(true);
      try {
        const reporterId = auth?.user?._id || auth?.user?.id || auth?.user?.user_id;
        const res = await api.get("/admin/reports/can-report", {
          params: { reporter_id: reporterId, target_id: learner.user_id }
        });
        setReportStatus(res.data);
      } catch (err) {
        console.error("❌ Error checking report status:", err);
        setReportStatus({ canReport: true, hoursRemaining: 0 });
      } finally {
        setCheckingReport(false);
      }
    }
  };

  const saveReport = async () => {
    if (!reportInput.trim()) {
      alert("Vui lòng nhập nội dung report");
      return;
    }

    if (!reportStatus.canReport) {
      alert(`Bạn chỉ có thể report lại sau 24 giờ. Còn ${reportStatus.hoursRemaining} giờ nữa.`);
      return;
    }

    try {
      const reporterId = auth?.user?._id || auth?.user?.id || auth?.user?.user_id;
      const targetId = selectedLearner?.user_id;

      const formData = new FormData();
      formData.append("reporter_id", reporterId);
      formData.append("target_id", targetId);
      formData.append("content", reportInput);
      formData.append("status", "pending");
      if (reportImage) formData.append("image", reportImage);
      if (reportVideo) formData.append("video", reportVideo);

      const res = await api.post("/mentors/reports", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      // Reload learners để lấy dữ liệu mới nhất từ backend
      if (mentorId) {
        try {
          const learnersRes = await api.get(`/mentors/${mentorId}/learners`);
          const newLearners = learnersRes.data.learners.map(l => {
            const report = (l.report && typeof l.report === 'string' && l.report.trim().length > 0) ? l.report : null;
            const report_reply = (l.report_reply && typeof l.report_reply === 'string' && l.report_reply.trim().length > 0) ? l.report_reply : null;
            return {
              ...l,
              report,
              report_reply,
            };
          });
          setLearners(newLearners);
        } catch (reloadErr) {
          console.error("❌ Error reloading learners:", reloadErr);
          // Fallback: update manually
          setLearners(prev =>
            prev.map(l =>
              l.learner_id === selectedLearner.learner_id
                ? { 
                    ...l, 
                    report: res.data?.report?.content || reportInput,
                    report_status: res.data?.report?.status || "pending"
                  }
                : l
            )
          );
        }
      }
      
      alert("Report đã được gửi thành công!");
      setShowReportModal(false);
      setReportInput("");
      setReportImage(null);
      setReportVideo(null);
      // Reset reportStatus sau khi gửi thành công
      setReportStatus({ canReport: false, hoursRemaining: 24 });
    } catch (err) {
      console.error("❌ Error saving report:", err);
      // Xử lý lỗi 24h constraint từ backend
      if (err?.response?.data?.canReport === false) {
        setReportStatus({
          canReport: false,
          hoursRemaining: err.response.data.hoursRemaining || 24
        });
        alert(`Bạn chỉ có thể report lại sau 24 giờ. Còn ${err.response.data.hoursRemaining || 24} giờ nữa.`);
      } else {
        alert(err?.response?.data?.message || err?.response?.data?.error || "Gửi report thất bại");
      }
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
            <th>Thông báo</th>
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
              <td>
                {(() => {
                  if (!l.purchase_id) return "Chưa có";
                  if (l.status === "paused") return "Tạm dừng";
                  if (l.status === "expired") return "Hết hạn";
                  if (l.days_left === null || l.days_left === undefined) return "Đang xử lý";
                  if (l.days_left > 0) return "Còn hạn";
                  return "Hết hạn";
                })()}
              </td>
              <td
                className="note-cell"
                style={{ whiteSpace: "pre-line" }}
                onClick={() => openNoteModal(l)}
              >
                {l.note || <span className="placeholder">Nhấn để ghi chú</span>}
              </td>
              <td>
                {(() => {
                  const hasReport = l.report !== null && l.report !== undefined && String(l.report).trim().length > 0;
                  const isDismissed = l.report_status === "dismissed";
                  
                  // Nếu có report và status là dismissed, hiển thị "Gửi lại Report"
                  if (hasReport && isDismissed) {
                    return (
                      <button
                        className="report-btn"
                        onClick={() => openReportModal(l)}
                      >
                        Gửi lại Report
                      </button>
                    );
                  } else {
                    // Luôn hiển thị nút Report (cho cả trường hợp chưa có report hoặc đã có report nhưng không phải dismissed)
                    return (
                      <button
                        className="report-btn"
                        onClick={() => openReportModal(l)}
                      >
                        Report
                      </button>
                    );
                  }
                })()}
              </td>
              <td>
                {(() => {
                  const hasReport = l.report !== null && l.report !== undefined && String(l.report).trim().length > 0;
                  
                  if (hasReport) {
                    const statusText = l.report_status === "resolved" ? "Đã xử lý" : l.report_status === "dismissed" ? "Từ chối" : "Đang chờ";
                    const statusColor = l.report_status === "resolved" ? "#10b981" : l.report_status === "dismissed" ? "#ef4444" : "#f59e0b";
                    
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
                        <div style={{ fontSize: "12px", color: statusColor }}>
                          <strong>{statusText}</strong>
                        </div>
                        <button
                          className="btn-ghost"
                          onClick={() => {
                            setSelectedLearner(l);
                            setShowDetailModal(true);
                          }}
                          style={{ fontSize: "12px", padding: "4px 8px" }}
                        >
                          Xem chi tiết
                        </button>
                      </div>
                    );
                  } else {
                    return <span className="placeholder" style={{ fontSize: "12px" }}>Chưa có report</span>;
                  }
                })()}
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
          {/* Hiển thị thông tin report đã gửi (nếu có) */}
          {selectedLearner.report && (
            <div style={{ marginBottom: 20, padding: 12, background: "#f9fafb", borderRadius: 6 }}>
              <p><strong>Nội dung report đã gửi:</strong></p>
              <p style={{ whiteSpace: "pre-line", marginBottom: 12 }}>{selectedLearner.report}</p>

              {selectedLearner.report_reply && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #e5e7eb" }}>
                  <p><strong>Thông báo từ admin:</strong></p>
                  <p style={{ whiteSpace: "pre-line" }}>{selectedLearner.report_reply}</p>
                </div>
              )}
            </div>
          )}

          {/* Form report - luôn hiển thị */}
          <div>
            <p><strong>{selectedLearner.report ? "Gửi lại report:" : "Gửi report:"}</strong></p>
            
            {checkingReport ? (
              <p>Đang kiểm tra...</p>
            ) : !reportStatus.canReport ? (
              <div style={{ padding: 12, background: "#fef3c7", borderRadius: 6, marginBottom: 12 }}>
                <strong>⚠️ Bạn chỉ có thể report lại sau 24 giờ.</strong>
                <p>Còn {reportStatus.hoursRemaining} giờ nữa.</p>
              </div>
            ) : null}
            
            <textarea
              value={reportInput}
              onChange={(e) => setReportInput(e.target.value)}
              rows="5"
              style={{ width: "100%", marginBottom: 12 }}
              placeholder={selectedLearner.report ? "Nhập lý do báo cáo bổ sung..." : "Nhập lý do báo cáo..."}
              disabled={!reportStatus.canReport}
            />
            
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 4 }}>Hình ảnh (tùy chọn):</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setReportImage(e.target.files[0] || null)}
                disabled={!reportStatus.canReport}
              />
              {reportImage && (
                <div style={{ marginTop: 8 }}>
                  <img src={URL.createObjectURL(reportImage)} alt="Preview" style={{ maxWidth: "200px", maxHeight: "200px" }} />
                  <button onClick={() => setReportImage(null)} style={{ marginLeft: 8 }}>Xóa</button>
                </div>
              )}
            </div>
            
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 4 }}>Video (tùy chọn):</label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setReportVideo(e.target.files[0] || null)}
                disabled={!reportStatus.canReport}
              />
              {reportVideo && (
                <div style={{ marginTop: 8 }}>
                  <video src={URL.createObjectURL(reportVideo)} controls style={{ maxWidth: "300px", maxHeight: "200px" }} />
                  <button onClick={() => setReportVideo(null)} style={{ marginLeft: 8 }}>Xóa</button>
                </div>
              )}
            </div>
            
            <div className="modal-actions">
              <button className="btn-save" onClick={saveReport} disabled={!reportStatus.canReport}>
                {selectedLearner.report ? "Gửi lại Report" : "Gửi Report"}
              </button>
              <button className="btn-cancel" onClick={() => setShowReportModal(false)}>Hủy</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal xem chi tiết report */}
      {showDetailModal && selectedLearner && (
        <Modal
          title={`Thông báo - ${selectedLearner.learner_name}`}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedLearner(null);
          }}
        >
          {(() => {
            const hasReport = selectedLearner.report !== null && selectedLearner.report !== undefined && String(selectedLearner.report).trim().length > 0;
            
            if (!hasReport) {
              return <p>Chưa có report</p>;
            }

            const statusText = selectedLearner.report_status === "resolved" ? "Đã xử lý" : selectedLearner.report_status === "dismissed" ? "Từ chối" : "Đang chờ";
            const statusColor = selectedLearner.report_status === "resolved" ? "#10b981" : selectedLearner.report_status === "dismissed" ? "#ef4444" : "#f59e0b";

            return (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <p><strong>Nội dung report:</strong></p>
                  <div style={{ marginTop: 8, padding: 12, background: "#f9fafb", borderRadius: 6, whiteSpace: "pre-line" }}>
                    {selectedLearner.report}
                  </div>
                </div>

                {selectedLearner.report_reply && (
                  <div style={{ marginBottom: 20 }}>
                    <p><strong>Phản hồi admin:</strong></p>
                    <div className="admin-reply" style={{ marginTop: 8, padding: 12, background: "#eff6ff", borderRadius: 6, borderLeft: "4px solid #3b82f6" }}>
                      <p style={{ whiteSpace: "pre-line", margin: 0 }}>{selectedLearner.report_reply}</p>
                    </div>
                  </div>
                )}

                <div>
                  <p><strong>Trạng thái:</strong></p>
                  <div style={{ marginTop: 8, fontSize: "14px", color: statusColor }}>
                    <strong>{statusText}</strong>
                  </div>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}
