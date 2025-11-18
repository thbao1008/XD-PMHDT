// src/components/mentorr/AssessmentPanel.jsx
import React, { useState, useRef, useEffect } from "react";
import "../../styles/mentor.css"
/**
 * Props
 * - submission: object chứa submission data { id, title, audioUrl, transcript, status, created_at, learner }
 * - mentorId: id của mentor (nếu cần gửi review)
 * - onClose: () => void
 * - onSaved: (review) => void
 * - readOnly: boolean (nếu chỉ xem, không chấm)
 */
export default function AssessmentPanel({
  submission = null,
  mentorId = null,
  onClose,
  onSaved,
  readOnly = false,
}) {
  const [pronunciation, setPronunciation] = useState(0);
  const [fluency, setFluency] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const audioRef = useRef(null);

  useEffect(() => {
    if (submission) {
      // reset form when submission changes
      setPronunciation(submission.pronunciation_score ?? 0);
      setFluency(submission.fluency_score ?? 0);
      setFinalScore(submission.final_score ?? 0);
      setFeedback(submission.feedback ?? "");
      setError("");
    }
  }, [submission]);

  function playAudio() {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }

  function pauseAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }

  function handleWordClick(word, index) {
    // highlight or seek audio if timestamps available
    // submission.wordTimestamps = [{start, end, text}, ...]
    if (!submission) return;
    const ts = submission.wordTimestamps?.[index];
    if (ts && audioRef.current) {
      audioRef.current.currentTime = ts.start;
      audioRef.current.play().catch(() => {});
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    if (readOnly) return;
    if (!mentorId) {
      setError("Missing mentorId for saving review");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        final_score: Number(finalScore),
        feedback: feedback.trim(),
        pronunciation_score: Number(pronunciation),
        fluency_score: Number(fluency),
      };

      const res = await fetch(`/api/mentor/${mentorId}/submissions/${submission.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Không thể lưu review");
      onSaved?.(data.review ?? data);
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }

  if (!submission) {
    return (
      <div className="panel submission-card">
        <div className="empty-state">Chọn một submission để xem chi tiết</div>
      </div>
    );
  }

  return (
    <div className="panel submission-card" aria-live="polite">
      <div className="submission-header">
        <div>
          <h3 className="submission-title">{submission.title || "Submission"}</h3>
          <div className="meta">
            <span className="meta-item">{submission.learner?.name ?? submission.user?.name}</span>
            <span className="meta-sep">•</span>
            <span className="meta-item">{new Date(submission.created_at).toLocaleString()}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn-ghost icon-only" onClick={playAudio} aria-label="Play audio">
            ▶
          </button>
          <button className="btn-ghost icon-only" onClick={pauseAudio} aria-label="Pause audio">
            ⏸
          </button>
          <button className="btn-ghost" onClick={onClose} aria-label="Close panel">Đóng</button>
        </div>
      </div>

      <div className="submission-body">
        <div className="result-audio">
          <audio ref={audioRef} src={submission.audioUrl} controls style={{ width: "100%" }} />
        </div>

        <div className="transcript-words-container" aria-label="Transcript">
          <div className="transcript-words">
            {submission.transcript?.map((w, i) => (
              <span
                key={i}
                tabIndex={0}
                role="button"
                className={`token ${w.correct === true ? "token-ok" : w.correct === false ? "token-bad" : ""}`}
                onClick={() => handleWordClick(w.text, i)}
                onKeyDown={(ev) => { if (ev.key === "Enter") handleWordClick(w.text, i); }}
                title={w.text}
              >
                {w.text}
              </span>
            )) ?? <div className="transcript-text-fallback">{submission.rawTranscript || "Không có transcript"}</div>}
          </div>
        </div>

        <form className="form" onSubmit={handleSave}>
          <div className="field">
            <label className="label">Pronunciation score</label>
            <input
              type="range"
              min="0"
              max="100"
              value={pronunciation}
              onChange={(e) => setPronunciation(e.target.value)}
              disabled={readOnly}
              aria-label="Pronunciation score"
            />
            <div className="help-text">Điểm phát âm: <strong>{pronunciation}</strong></div>
          </div>

          <div className="field">
            <label className="label">Fluency score</label>
            <input
              type="range"
              min="0"
              max="100"
              value={fluency}
              onChange={(e) => setFluency(e.target.value)}
              disabled={readOnly}
              aria-label="Fluency score"
            />
            <div className="help-text">Điểm lưu loát: <strong>{fluency}</strong></div>
          </div>

          <div className="field">
            <label className="label">Final score</label>
            <input
              type="number"
              min="0"
              max="100"
              value={finalScore}
              onChange={(e) => setFinalScore(e.target.value)}
              disabled={readOnly}
              className="input"
            />
          </div>

          <div className="field">
            <label className="label">Feedback</label>
            <textarea
              className="input"
              rows="4"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Ghi nhận, góp ý cho học viên..."
              disabled={readOnly}
            />
          </div>

          {error && <div className="error">{error}</div>}

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button className={`btn-submit ${loading ? "is-disabled" : ""}`} type="submit" disabled={loading || readOnly}>
              {loading ? "Đang lưu..." : "Lưu review"}
            </button>

            <button type="button" className="btn-ghost" onClick={onClose}>Đóng</button>
          </div>
        </form>
      </div>
    </div>
  );
}
