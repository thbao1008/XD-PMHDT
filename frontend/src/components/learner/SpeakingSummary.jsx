import React from "react";
import "../../styles/speaking-practice.css";

export default function SpeakingSummary({ sessionData, rounds, onRestart }) {
  const summary = sessionData?.summary || {};

  return (
    <div className="speaking-summary">
      <div className="summary-header">
        <h2>Tổng kết luyện tập</h2>
        <button className="btn-restart" onClick={onRestart}>
          Luyện tập lại
        </button>
      </div>

      <div className="summary-overview">
        <div className="overview-card" style={{ flex: 1, maxWidth: "400px", margin: "0 auto" }}>
          <div className="overview-label">Điểm tổng kết</div>
          <div className="overview-value" style={{ fontSize: 48, fontWeight: "bold", color: "#10b981" }}>
            {summary.total_score || summary.average_score ? 
              (summary.total_score || (summary.average_score * 10)).toFixed(0) 
              : "0"}/100
          </div>
        </div>
      </div>


      {summary.overall_feedback && (
        <div className="summary-overall">
          <h3>Nhận xét tổng thể:</h3>
          <p>{summary.overall_feedback}</p>
        </div>
      )}

      <div className="summary-actions">
        <button className="btn-primary" onClick={onRestart}>
          Luyện tập lại
        </button>
      </div>
    </div>
  );
}

