// src/components/learner/SubmissionForm.jsx
import React, { useState, useEffect } from "react";
import AudioRecorder from "../common/AudioRecorder";
import api from "../../api";
import "../../styles/challenge.css"; 

export default function SubmissionForm({ learnerId, challengeId, onSubmitted = () => {}, onCancel = () => {} }) {
  const [audioBlob, setAudioBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
        setPreviewUrl(null);
      };
    } else {
      setPreviewUrl(null);
    }
  }, [audioBlob]);

  async function handleSubmit() {
    setSubmitError("");
    setSubmitSuccess("");

    if (!learnerId || !challengeId || !audioBlob) {
      setSubmitError("Thiếu thông tin hoặc chưa ghi âm.");
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("learner_id", learnerId);
      form.append("challenge_id", challengeId);
      const file = new File([audioBlob], `record-${Date.now()}.webm`, {
        type: audioBlob.type || "audio/webm",
      });
      form.append("file", file);

      const resp = await api.post("/learners/submissions", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const data = resp.data || {};
      const submissionId = data.submissionId ?? data.id ?? null;
      const audio_url = data.audio_url ?? null;

      setSubmitSuccess("✅ Nộp bài thành công! Đang chuyển về trang chi tiết...");
      onSubmitted({ submissionId, audio_url });
    } catch (err) {
      console.error("❌ Submit error", err);
      setSubmitError("Có lỗi khi nộp bài. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="challenge-submission-card">
      <div className="challenge-submission-header">
        <h3 className="submission-title">Nộp bài nói</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className={`btn-submit ${submitting || !audioBlob ? "is-disabled" : ""}`}
            onClick={handleSubmit}
            disabled={submitting || !audioBlob}
          >
            {submitting ? <span className="spinner" /> : <span className="icon-send">➤</span>}
            Nộp bài
          </button>
          <button type="button" className="btn-ghost" onClick={onCancel}>Hủy</button>
        </div>
      </div>

      <div className="challenge-submission-body">
        <AudioRecorder onRecorded={setAudioBlob} isSubmitting={submitting} />

        {previewUrl && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>Xem trước bản ghi</div>
            <audio controls src={previewUrl} style={{ width: "100%", borderRadius: 8 }} />
          </div>
        )}

        {(submitError || submitSuccess) && (
          <div className={`status-row ${submitError ? "error" : "success"}`} style={{ marginTop: 12 }}>
            {submitError || submitSuccess}
          </div>
        )}
      </div>
    </div>
  );
}
