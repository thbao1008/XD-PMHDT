import React, { useEffect, useState } from "react";
import api from "../../api.js";
import { FaUserGraduate, FaChalkboardTeacher, FaCommentDots, FaSearch } from "react-icons/fa";
import "../../styles/reportpage.css";
import UserForPage from "../admin/UserForPage.jsx";

export default function ReportsPage() {
  const [filters, setFilters] = useState({ from: "", to: "", status: "pending" });
  const [summary, setSummary] = useState({ total_learners: 0, total_mentors: 0, total_reports: 0 });
  const [feedbacks, setFeedbacks] = useState([]);
  const [progress, setProgress] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Load summary
  const fetchSummary = async () => {
    try {
      const params = {};
      if (filters.from && filters.to) {
        params.from = filters.from;
        params.to = filters.to;
      }
      const res = await api.get("/admin/reports/summary", { params });
      setSummary(res.data.summary || {});
    } catch (err) {
      console.error("❌ Lỗi load summary:", err);
    }
  };

  // Load reports
  const fetchReports = async (status) => {
    try {
      const params = {};
      if (status) params.status = status;
      else if (filters.status) params.status = filters.status;
      const fb = await api.get("/admin/reports", { params });
      setFeedbacks(fb.data.reports || []);
    } catch (err) {
      console.error("❌ Lỗi load reports:", err);
    }
  };

  // Load learner progress
  const fetchProgress = async () => {
    try {
      if (!searchQuery) return;
      const pr = await api.get("/admin/reports/learner-progress", { params: { query: searchQuery } });
      setProgress(pr.data.learners || []);
    } catch (err) {
      console.error("❌ Lỗi load progress:", err);
    }
  };

  // Change report status
  const changeStatus = async (reportId, newStatus) => {
    try {
      const res = await api.patch(`/admin/reports/${reportId}/status`, {
        status: newStatus,
        replyContent: newStatus === "resolved" ? "Học viên đã được xử lý theo quy định." : "",
        actorRole: "admin"
      });
      console.log("✅ Report updated:", res.data.report);

      // cập nhật lại state FE
      setFeedbacks(prev =>
        prev.map(r => r.report_id === reportId ? res.data.report : r)
      );
    } catch (err) {
      console.error("❌ Lỗi cập nhật trạng thái:", err);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchReports(filters.status);
  }, []);

  return (
    <div className="report-page">
      <h1>Báo cáo học viên, giảng viên & feedback</h1>

      {/* Bộ lọc thời gian */}
<div className="filters">
  <label>Từ ngày:
    <input
      type="date"
      value={filters.from}
      onChange={e => setFilters({ ...filters, from: e.target.value })}
    />
  </label>
  <label>Đến ngày:
    <input
      type="date"
      value={filters.to}
      onChange={e => {
        const newFilters = { ...filters, to: e.target.value };
        setFilters(newFilters);
        // Khi chọn ngày đến thì tự động load summary
        if (newFilters.from && newFilters.to) {
          fetchSummary();
        }
      }}
    />
  </label>
</div>

      {/* Cards tổng quan */}
      <div className="summary-cards" style={{ display: "flex", gap: "20px", margin: "20px 0" }}>
        <div className="card"><FaUserGraduate size={30} color="blue" /><p>Học viên</p><h3>{summary.total_learners}</h3></div>
        <div className="card"><FaChalkboardTeacher size={30} color="green" /><p>Mentor</p><h3>{summary.total_mentors}</h3></div>
        <div className="card"><FaCommentDots size={30} color="orange" /><p>Tố cáo</p><h3>{summary.total_reports}</h3></div>
      </div>

      {/* Tiến độ đào tạo */}
      <section>
        <h2>Tiến độ đào tạo</h2>
        <div className="search-box">
          <FaSearch style={{ marginRight: "8px" }} />
          <input
            type="text"
            placeholder="Tìm học viên theo tên hoặc số điện thoại..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <button onClick={fetchProgress}>Tìm kiếm</button>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Học viên</th>
              <th>Kỹ năng</th>
              <th>Điểm</th>
              <th>Mentor</th>
              <th>Feedback</th>
              <th>Ngày cập nhật</th>
            </tr>
          </thead>
          <tbody>
            {progress.map(p => (
              <tr key={p.learner_id + p.stage}>
                <td>{p.name} ({p.phone})</td>
                <td>{p.stage}</td>
                <td>{p.score}</td>
                <td>{p.mentor_name}</td>
                <td>{p.feedback}</td>
                <td>{new Date(p.updated_at).toLocaleDateString("vi-VN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Phản hồi & tố cáo */}
      <section>
        <h2>Phản hồi & Tố cáo</h2>
        <div className="filters">
          <select
            name="status-select"
            value={filters.status}
            onChange={e => {
              const newStatus = e.target.value;
              setFilters({ ...filters, status: newStatus });
              fetchReports(newStatus);
            }}
          >
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Người dùng</th>
              <th>Nội dung</th>
              <th>Trạng thái</th>
              <th>Ngày gửi</th>
              <th>Phản hồi admin</th>
            </tr>
          </thead>
          <tbody>
            {feedbacks.map(f => (
              <tr key={f.report_id}>
                <td className="sender-target">
                  <strong>Reporter:</strong>{" "}
                  <span className="clickable" onClick={() => setSelectedUserId(f.reporter_id)}>
                    {f.reporter_name} - {f.reporter_role}
                  </span>
                  <br />
                  <strong>Target:</strong>{" "}
                  <span className="clickable" onClick={() => setSelectedUserId(f.target_id)}>
                    {f.target_name} - {f.target_role}
                  </span>
                </td>

                <td style={{ whiteSpace: "pre-line" }}>{f.content}</td>
                <td>
                  <select
                    value={f.status}
                    onChange={e => changeStatus(f.report_id, e.target.value)}
                    style={{ padding: "4px", borderRadius: "4px" }}
                    disabled={f.status !== "pending"}
                  >
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                    <option value="dismissed">Dismissed</option>
                  </select>
                </td>
                <td>{new Date(f.created_at).toLocaleString("vi-VN")}</td>
                <td style={{ whiteSpace: "pre-line" }}>
                  {f.reply ? f.reply : <span className="placeholder">Chưa có phản hồi</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Modal hiển thị thông tin user qua UserForPage */}
      {selectedUserId && (
        <UserForPage
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}
