import React, { useState } from "react";
import api from "../../api";
import "../../styles/speaking-practice.css";

export default function SemanticInput({ sessionId, rounds, onComplete, onSkip }) {
  const [translations, setTranslations] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedRounds, setSubmittedRounds] = useState(new Set());

  const handleTranslationChange = (roundId, value) => {
    setTranslations(prev => ({
      ...prev,
      [roundId]: value
    }));
  };

  const handleSubmitTranslation = async (roundId) => {
    const translation = translations[roundId]?.trim();
    if (!translation) {
      alert("Vui lòng viết nghĩa của đoạn văn");
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post(
        `/learners/speaking-practice/sessions/${sessionId}/rounds/${roundId}/translation`,
        { translation }
      );

      if (res.data.correct) {
        alert("Chính xác! Bạn đã hiểu đúng nghĩa của đoạn văn.");
        setSubmittedRounds(prev => new Set([...prev, roundId]));
      } else {
        alert(`Chưa chính xác. ${res.data.feedback || "Hãy thử lại."}`);
      }
    } catch (err) {
      console.error("❌ Error submitting translation:", err);
      alert("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
  };

  const handleContinue = () => {
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <div className="semantic-input">
      <div className="semantic-header">
        <h2>Nhập ngữ nghĩa</h2>
        <p>Viết nghĩa tiếng Việt của các đoạn văn bạn đã nói (không bắt buộc)</p>
      </div>

      <div className="semantic-content">
        {rounds.filter(round => round.round_id).map((round, idx) => (
          <div key={round.round_id || idx} className="translation-item" style={{ marginBottom: 30, padding: 20, background: "#f9fafb", borderRadius: 8 }}>
            <div className="translation-prompt">
              <strong>Vòng {round.round_number || idx + 1}:</strong>
              <p style={{ marginTop: 10, fontSize: 16 }}>{round.prompt}</p>
            </div>
            <textarea
              value={translations[round.round_id] || ""}
              onChange={(e) => handleTranslationChange(round.round_id, e.target.value)}
              rows="3"
              placeholder="Viết nghĩa tiếng Việt của đoạn văn trên..."
              className="translation-input"
              disabled={submittedRounds.has(round.round_id)}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 4,
                border: "1px solid #ddd",
                marginTop: 10,
                marginBottom: 10
              }}
            />
            {submittedRounds.has(round.round_id) ? (
              <div style={{ color: "#10b981", marginBottom: 15 }}>
                ✅ Đã nộp
              </div>
            ) : (
              <button
                onClick={() => handleSubmitTranslation(round.round_id)}
                disabled={!translations[round.round_id]?.trim() || submitting}
                style={{
                  padding: "8px 16px",
                  background: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: translations[round.round_id]?.trim() && !submitting ? "pointer" : "not-allowed",
                  opacity: translations[round.round_id]?.trim() && !submitting ? 1 : 0.5,
                  marginBottom: 15
                }}
              >
                Gửi
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="semantic-actions" style={{ marginTop: 30, display: "flex", gap: 10, justifyContent: "center" }}>
        <button
          onClick={handleSkip}
          style={{
            padding: "12px 24px",
            background: "#6b7280",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 16
          }}
        >
          Bỏ qua
        </button>
        <button
          onClick={handleContinue}
          style={{
            padding: "12px 24px",
            background: "#10b981",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 16
          }}
        >
          Xem kết quả
        </button>
      </div>
    </div>
  );
}

