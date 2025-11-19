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
        <div className="overview-card">
          <div className="overview-label">Tổng điểm</div>
          <div className="overview-value">{summary.total_score || 0}/100</div>
        </div>
        <div className="overview-card">
          <div className="overview-label">Điểm trung bình</div>
          <div className="overview-value">
            {summary.average_score
              ? summary.average_score.toFixed(1)
              : "0"}/10
          </div>
        </div>
        <div className="overview-card">
          <div className="overview-label">Số vòng hoàn thành</div>
          <div className="overview-value">{rounds.length}/10</div>
        </div>
      </div>

      <div className="summary-details">
        <h3>Chi tiết từng vòng:</h3>
        <div className="rounds-list">
          {rounds.map((round, idx) => (
            <div key={idx} className="round-detail-card">
              <div className="round-detail-header">
                <span className="round-number">Vòng {round.round_number}</span>
                <span className="round-score">
                  Điểm: {round.score || 0}/10
                </span>
              </div>
              <div className="round-detail-content">
                <div className="round-prompt">
                  <strong>Đoạn văn:</strong>
                  <p>{round.prompt}</p>
                </div>
                {round.feedback && (
                  <div className="round-feedback">
                    <strong>Nhận xét:</strong>
                    <p>{round.feedback}</p>
                  </div>
                )}
                {round.errors && round.errors.length > 0 && (
                  <div className="round-errors">
                    <strong>Lỗi phát âm:</strong>
                    <ul>
                      {round.errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {round.corrected_text && (
                  <div className="round-corrected">
                    <strong>Đoạn văn chuẩn hơn:</strong>
                    <p className="corrected-text">{round.corrected_text}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
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

