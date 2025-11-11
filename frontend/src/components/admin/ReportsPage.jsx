import React, { useEffect, useState } from "react";
import api from "../../api";
import { 
  FaUserGraduate, 
  FaChalkboardTeacher, 
  FaCommentDots, 
  FaSearch 
} from "react-icons/fa";
import "../../styles/reportpage.css";

export default function ReportPage() {
  const [filters, setFilters] = useState({ from: "", to: "", status: "" });
  const [summary, setSummary] = useState({ total_learners: 0, total_mentors: 0, total_reports: 0 });
  const [feedbacks, setFeedbacks] = useState([]);
  const [progress, setProgress] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

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

  const fetchReports = async () => {
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      const fb = await api.get("/admin/reports", { params });
      setFeedbacks(fb.data.reports || []);
    } catch (err) {
      console.error("❌ Lỗi load reports:", err);
    }
  };

  const fetchProgress = async () => {
    try {
      if (!searchQuery) return;
      const pr = await api.get("/admin/reports/learner-progress", { params: { query: searchQuery } });
      setProgress(pr.data.learners || []);
    } catch (err) {
      console.error("❌ Lỗi load progress:", err);
    }
  };

  const changeStatus = async (id, newStatus) => {
    try {
      await api.put(`/admin/reports/${id}/status`, { status: newStatus });
      fetchReports(); // reload lại danh sách sau khi cập nhật
    } catch (err) {
      console.error("❌ Lỗi cập nhật trạng thái:", err);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchReports();
  }, []);

  return (
    <div className="report-page">
      <h1>📊 Báo cáo học viên, giảng viên & feedback</h1>

      {/* Bộ lọc thời gian */}
      <div className="filters">
        <label>Từ ngày:
          <input type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} />
        </label>
        <label>Đến ngày:
          <input type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} />
        </label>
        <button onClick={fetchSummary}>Áp dụng</button>
      </div>

      {/* Cards tổng quan */}
      <div className="summary-cards" style={{ display: "flex", gap: "20px", margin: "20px 0" }}>
        <div className="card">
          <FaUserGraduate size={30} color="blue" />
          <p>Học viên</p>
          <h3>{summary.total_learners}</h3>
        </div>
        <div className="card">
          <FaChalkboardTeacher size={30} color="green" />
          <p>Mentor</p>
          <h3>{summary.total_mentors}</h3>
        </div>
        <div className="card">
          <FaCommentDots size={30} color="orange" />
          <p>Tố cáo</p>
          <h3>{summary.total_reports}</h3>
        </div>
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
            fetchReports(); // tự gọi lại khi đổi trạng thái
          }}
        >
          <option value="">Tất cả</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Nội dung</th>
              <th>Trạng thái</th>
              <th>Ngày gửi</th>
            </tr>
          </thead>
          <tbody>
            {feedbacks.map(f => (
              <tr key={f.report_id}>
                <td className="sender-target">
  <strong>Reporter:</strong> {f.reporter_name} <br />
  <strong>Target:</strong> {f.target_name}
</td>

                <td>{f.content}</td>
                <td>
                  <select
                    value={f.status}
                    onChange={e => changeStatus(f.report_id, e.target.value)}
                    style={{ padding: "4px", borderRadius: "4px" }}
                  >
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                    <option value="dismissed">Dismissed</option>
                  </select>
                </td>
                <td>{new Date(f.created_at).toLocaleDateString("vi-VN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
