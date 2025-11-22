// src/components/learner/LearnerFeedback.jsx
import React, { useEffect, useState, useRef } from "react";
import api from "../../api";
import { getAuth } from "../../utils/auth";
import { FiUserCheck, FiClock, FiStar, FiAlertTriangle, FiCpu } from "react-icons/fi";
import "../../styles/feedback.css";

export default function LearnerFeedback() {
  const [learnerId, setLearnerId] = useState(null);
  const [mentorFeedbacks, setMentorFeedbacks] = useState([]); // Mentor feedback cho learner
  const [learnerFeedbacks, setLearnerFeedbacks] = useState([]); // Learner feedback cho mentor
  const [mentorInfo, setMentorInfo] = useState(null);
  const [feedbackStatus, setFeedbackStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Form state cho learner feedback mentor
  const [rating, setRating] = useState(5);
  const [feedbackContent, setFeedbackContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  // Report state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportContent, setReportContent] = useState("");
  const [reportImage, setReportImage] = useState(null);
  const [reportVideo, setReportVideo] = useState(null);
  const [reporting, setReporting] = useState(false);
  const [reportStatus, setReportStatus] = useState({ canReport: true, hoursRemaining: 0 });
  const [checkingReport, setCheckingReport] = useState(false);

  // Submission detail state
  const [submissionDetails, setSubmissionDetails] = useState({}); // { submissionId: submissionData }
  const audioRefs = useRef({}); // { submissionId: audioElement }

  useEffect(() => {
    async function loadData() {
      try {
        const auth = getAuth();
        console.log("[LearnerFeedback] Auth:", auth);
        if (!auth || !auth.user) {
          setError("Không tìm thấy thông tin đăng nhập");
          setLoading(false);
          return;
        }

        const userId = auth.user._id || auth.user.id || auth.user.user_id;
        console.log("[LearnerFeedback] userId:", userId);
        if (!userId) {
          setError("Không xác định được người dùng");
          setLoading(false);
          return;
        }

        // Lấy learner_id từ user_id
        const learnerRes = await api.get(`/learners/by-user/${userId}`);
        console.log("[LearnerFeedback] learnerRes:", learnerRes.data);
        const lid = learnerRes.data?.learner?.id || learnerRes.data?.learner_id || learnerRes.data?.id;
        if (!lid) {
          console.error("[LearnerFeedback] Cannot find learner_id. Response:", learnerRes.data);
          setError("Không tìm thấy learner. Vui lòng đảm bảo bạn đã đăng ký làm learner.");
          setLoading(false);
          return;
        }

        setLearnerId(lid);

        // Load mentor feedbacks cho learner (từ submissions)
        const submissionsRes = await api.get(`/learners/${lid}/submissions`);
        const submissions = submissionsRes.data?.submissions || submissionsRes.data || [];

        const feedbacksWithSubmission = [];
        for (const sub of submissions) {
          try {
            const subDetailRes = await api.get(`/learners/submissions/${sub.id}`);
            const subDetail = subDetailRes.data?.submission || subDetailRes.data;
            if (subDetail?.mentor_review) {
              feedbacksWithSubmission.push({
                ...subDetail.mentor_review,
                submission_id: sub.id,
                challenge_title: sub.title || subDetail.challenge?.title,
                created_at: sub.created_at,
                submission_created_at: sub.created_at
              });
              
              // Lưu submission detail để hiển thị transcript
              setSubmissionDetails(prev => ({
                ...prev,
                [sub.id]: normalizeSubmission(subDetail)
              }));
            }
          } catch (err) {
            console.warn(`[LearnerFeedback] Error loading submission ${sub.id}:`, err);
          }
        }
        setMentorFeedbacks(feedbacksWithSubmission);

        // Load learner feedback status và mentor info
        try {
          const statusRes = await api.get(`/learners/${lid}/mentor/feedback-status`);
          setMentorInfo(statusRes.data.mentor);
          setFeedbackStatus(statusRes.data);
        } catch (err) {
          console.warn("[LearnerFeedback] Could not load mentor feedback status:", err);
        }

        // Load learner feedbacks cho mentor
        try {
          const learnerFbRes = await api.get(`/learners/${lid}/mentor/feedbacks`);
          setLearnerFeedbacks(learnerFbRes.data?.feedbacks || []);
        } catch (err) {
          console.warn("[LearnerFeedback] Could not load learner feedbacks:", err);
        }
      } catch (err) {
        console.error("[LearnerFeedback] Error:", err);
        if (err?.response?.status === 404) {
          setError("Không tìm thấy learner. Vui lòng đảm bảo bạn đã đăng ký làm learner.");
        } else {
          setError(err?.response?.data?.message || err?.response?.data?.error || "Không thể tải dữ liệu");
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  function normalizeSubmission(submission) {
    const sub = { ...submission };
    if (typeof sub.transcript === "string") { try { sub.transcript = JSON.parse(sub.transcript); } catch (_) {} }
    if (typeof sub.segments === "string") { try { sub.segments = JSON.parse(sub.segments); } catch (_) {} }
    if (typeof sub.words === "string") { try { sub.words = JSON.parse(sub.words); } catch (_) {} }
    if (typeof sub.word_analysis === "string") { try { sub.word_analysis = JSON.parse(sub.word_analysis); } catch (_) {} }
    return sub;
  }

  function playSegment(submissionId, start, end, idx) {
    const player = audioRefs.current[submissionId];
    if (!player) {
      console.warn("[LearnerFeedback] Audio player not found for submission:", submissionId);
      return;
    }
    
    if (typeof start !== "number" || typeof end !== "number") {
      console.warn("[LearnerFeedback] Invalid start/end time:", { start, end });
      return;
    }
    
    const tryPlay = () => {
      if (player.readyState >= 2) {
        const startTime = start > 1000 ? start / 1000 : start;
        const endTime = end > 1000 ? end / 1000 : end;
        
        player.pause();
        
        const onSeeked = () => {
          const playPromise = player.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.error("[LearnerFeedback] Audio play error:", error);
            });
          }
          player.removeEventListener('seeked', onSeeked);
        };
        
        player.addEventListener('seeked', onSeeked, { once: true });
        player.currentTime = Math.max(0, startTime);
        
        setTimeout(() => {
          if (player.paused && Math.abs(player.currentTime - startTime) < 0.1) {
            onSeeked();
          }
        }, 500);
      } else {
        setTimeout(tryPlay, 100);
      }
    };
    
    if (player.readyState === 0) {
      player.load();
      player.addEventListener('loadeddata', tryPlay, { once: true });
    } else {
      tryPlay();
    }
    
    setTimeout(() => {
      const el = document.querySelector(`[data-token-idx="${idx}"][data-submission-id="${submissionId}"]`);
      if (el) {
        el.focus();
        let scrollContainer = el.closest('.feedback-transcript-scroll') || el.closest('.feedback-submission-detail');
        if (scrollContainer) {
          const containerRect = scrollContainer.getBoundingClientRect();
          const elementRect = el.getBoundingClientRect();
          const scrollTop = scrollContainer.scrollTop;
          const scrollY = scrollTop + (elementRect.top - containerRect.top) - (containerRect.height / 2) + (elementRect.height / 2);
          scrollContainer.scrollTo({
            top: Math.max(0, scrollY),
            behavior: 'smooth'
          });
        } else {
          el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        }
      }
    }, 50);
  }

  function isBadToken(w) {
    const lowScore = typeof w?.score === "number" && w.score < 0.6;
    return Boolean(
      w?.flags?.mismatch ||
      (Array.isArray(w?.flags?.grammar) && w.flags.grammar.length > 0) ||
      (Array.isArray(w?.flags?.word_choice) && w.flags.word_choice.length > 0) ||
      w?.correct === false ||
      lowScore
    );
  }

  function tokenClass(w) {
    const bad = isBadToken(w);
    const isNonEnglish = w?.lang && w.lang !== "en";
    return `feedback-token ${bad ? "token-bad" : "token-ok"} ${isNonEnglish ? "token-nonenglish" : ""}`;
  }

  function buildTooltipForToken(t) {
    const msgs = [];
    if (t.expected && (t.flags?.mismatch || t.correct === false)) msgs.push(`Mẫu: ${t.expected}`);
    if (Array.isArray(t.flags?.word_choice) && t.flags.word_choice.length) msgs.push(`Gợi ý: ${t.flags.word_choice.join(", ")}`);
    if (Array.isArray(t.flags?.grammar) && t.flags.grammar.length) msgs.push(`Ngữ pháp: ${t.flags.grammar.join(" | ")}`);
    if (t.lang && t.lang !== "en" && t.lang !== "nonlatin") msgs.push(`Ngôn ngữ: ${t.lang}`);
    if (t.lang === "nonlatin") msgs.push(`Ngôn ngữ: non-latin`);
    if (typeof t.score === "number") msgs.push(`Score: ${t.score.toFixed(2)}`);
    return msgs.join("\n");
  }

  function renderSegmentedTranscript(submission, submissionId) {
    const segments = submission?.segments ?? [];
    const audioUrl = submission?.audio_url ?? null;
    if (!audioUrl || !Array.isArray(segments) || segments.length === 0) return null;

    return (
      <div className="feedback-transcript-scroll">
        {segments.map((seg, i) => {
          const start = typeof seg.start === "number" ? seg.start : 0;
          const end = typeof seg.end === "number" ? seg.end : start;
          const segWords = Array.isArray(seg.segment_words) && seg.segment_words.length ? seg.segment_words : [];
          const fallbackWords = !segWords.length && typeof seg.text === "string"
            ? seg.text.split(/\s+/).map((w) => ({ word: w, start, end }))
            : [];
          const wordsToRender = segWords.length ? segWords : fallbackWords;
          const nonEnglishCount = wordsToRender.filter(w => w.lang && w.lang !== "en").length;
          const segmentClass = nonEnglishCount > 0 ? "feedback-segment-block segment-nonenglish" : "feedback-segment-block";

          return (
            <div key={i} className={segmentClass}>
              <div className="segment-text">
                {wordsToRender.map((w, j) => {
                  const title = buildTooltipForToken(w);
                  const cls = tokenClass(w);
                  const playStart = typeof w.start === "number" ? w.start : start;
                  const playEnd = typeof w.end === "number" ? w.end : end;
                  
                  return (
                    <button
                      key={`${i}-${j}`}
                      type="button"
                      className={cls}
                      data-token-idx={`${i}-${j}`}
                      data-submission-id={submissionId}
                      title={title}
                      onClick={() => playSegment(submissionId, playStart, playEnd, `${i}-${j}`)}
                      style={{ textTransform: "lowercase" }}
                    >
                      {String(w.word ?? "").toLowerCase()}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderSubmissionDetail(fb) {
    const submissionId = fb.submission_id;
    const submission = submissionDetails[submissionId];
    if (!submission) return null;

    const segments = submission?.segments ?? [];
    const wordsSource = Array.isArray(submission?.word_analysis) && submission.word_analysis.length
      ? submission.word_analysis
      : Array.isArray(submission?.words) && submission.words.length
        ? submission.words
        : [];

    const audioUrl = submission?.audio_url;
    if (!audioUrl) return null;

    return (
      <div className="feedback-submission-detail">
        <div className="section">
          <div className="section-title-inline">
            <FiCpu className="section-icon" />
            <span>Hội thoại & Transcript</span>
          </div>
          
          <audio
            ref={el => { if (el) audioRefs.current[submissionId] = el; }}
            src={audioUrl.startsWith("/uploads/") ? `${import.meta.env.VITE_API_BASE?.replace("/api", "") || "http://localhost:4002"}${audioUrl}` : audioUrl}
            controls
            className="feedback-audio-control"
            preload="auto"
          />

          {segments.length > 0 && renderSegmentedTranscript(submission, submissionId)}
          
          {segments.length === 0 && wordsSource.length > 0 && (
            <div className="feedback-transcript-scroll">
              <div className="transcript-words">
                {wordsSource.map((w, i) => {
                  const playStart = typeof w.start === "number" ? w.start : 0;
                  const playEnd = typeof w.end === "number" ? w.end : (playStart + 2);
                  const title = buildTooltipForToken(w);
                  const cls = tokenClass(w);
                  return (
                    <button
                      key={i}
                      type="button"
                      className={cls}
                      data-token-idx={i}
                      data-submission-id={submissionId}
                      title={title}
                      onClick={() => playSegment(submissionId, playStart, playEnd, i)}
                      style={{ textTransform: "lowercase" }}
                    >
                      {String(w.word ?? "").toLowerCase()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* AI Assessment */}
        {(submission.overall_score || submission.pronunciation_score || submission.fluency_score) && (
          <div className="section">
            <div className="section-title-inline">
              <FiCpu className="section-icon" />
              <span>Đánh giá tự động (AI)</span>
            </div>
            <div className="score-grid">
              <div>
                <span className="label">Tổng điểm</span>
                <span className="value">{submission.overall_score ?? "—"}/10</span>
              </div>
              <div>
                <span className="label">Phát âm</span>
                <span className="value">{submission.pronunciation_score ?? "—"}/10</span>
              </div>
              <div>
                <span className="label">Trôi chảy</span>
                <span className="value">{submission.fluency_score ?? "—"}/10</span>
              </div>
            </div>
            {submission.topic && (
              <div className="feedback-ai-topic-box">
                <div className="label">Chủ đề phát hiện</div>
                <div className="value">{submission.topic} {submission.topic_confidence ? `(${(submission.topic_confidence * 100).toFixed(0)}%)` : ""}</div>
              </div>
            )}
            {submission.suggestions && (
              <div className="feedback-auto-feedback">
                <div className="label">Gợi ý cải thiện</div>
                <div className="value">{typeof submission.suggestions === "string" ? submission.suggestions : JSON.stringify(submission.suggestions)}</div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  async function handleSubmitFeedback() {
    if (!learnerId || !mentorInfo) return;
    
    setSubmitting(true);
    try {
      const res = await api.post(`/learners/${learnerId}/mentor/feedback`, {
        content: feedbackContent,
        rating: rating
      });
      
      // Refresh data
      const statusRes = await api.get(`/learners/${learnerId}/mentor/feedback-status`);
      setFeedbackStatus(statusRes.data);
      setMentorInfo(statusRes.data.mentor);
      
      const learnerFbRes = await api.get(`/learners/${learnerId}/mentor/feedbacks`);
      setLearnerFeedbacks(learnerFbRes.data?.feedbacks || []);
      
      // Reset form
      setRating(5);
      setFeedbackContent("");
      
      alert("Đánh giá đã được gửi thành công!");
    } catch (err) {
      console.error("[LearnerFeedback] Submit feedback error:", err);
      alert(err?.response?.data?.error || "Gửi đánh giá thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReportMentor() {
    if (!learnerId || !reportContent.trim()) {
      alert("Vui lòng nhập nội dung report");
      return;
    }

    if (!reportStatus.canReport) {
      alert(`Bạn chỉ có thể report lại sau 24 giờ. Còn ${reportStatus.hoursRemaining} giờ nữa.`);
      return;
    }

    setReporting(true);
    try {
      const formData = new FormData();
      formData.append("content", reportContent);
      if (reportImage) formData.append("image", reportImage);
      if (reportVideo) formData.append("video", reportVideo);

      const res = await api.post(`/learners/${learnerId}/mentor/report`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      alert("Report đã được gửi thành công!");
      setShowReportModal(false);
      setReportContent("");
      setReportImage(null);
      setReportVideo(null);
      setReportStatus({ canReport: false, hoursRemaining: 24 }); // Reset sau khi gửi
    } catch (err) {
      console.error("[LearnerFeedback] Report error:", err);
      if (err?.response?.data?.canReport === false) {
        setReportStatus({
          canReport: false,
          hoursRemaining: err.response.data.hoursRemaining || 24
        });
      }
      alert(err?.response?.data?.error || "Gửi report thất bại");
    } finally {
      setReporting(false);
    }
  }

  // Check report status when opening modal
  const openReportModal = async () => {
    setShowReportModal(true);
    setReportContent("");
    setReportImage(null);
    setReportVideo(null);
    
    if (learnerId && mentorInfo) {
      setCheckingReport(true);
      try {
        const auth = getAuth();
        const userId = auth?.user?._id || auth?.user?.id || auth?.user?.user_id;
        // Get mentor user_id
        const mentorUserRes = await api.get(`/learners/${learnerId}/mentor`);
        const mentorUserId = mentorUserRes.data?.mentor?.user_id || mentorUserRes.data?.user_id;
        
        if (userId && mentorUserId) {
          const res = await api.get("/admin/reports/can-report", {
            params: { reporter_id: userId, target_id: mentorUserId }
          });
          setReportStatus(res.data);
        }
      } catch (err) {
        console.error("[LearnerFeedback] Error checking report status:", err);
        setReportStatus({ canReport: true, hoursRemaining: 0 });
      } finally {
        setCheckingReport(false);
      }
    }
  };

  if (loading) return <div className="panel">Đang tải feedbacks...</div>;
  if (error) return <div className="panel"><div className="error">{error}</div></div>;

  return (
    <div className="feedback-page">
      {/* Phần 1: Đánh giá Mentor (lên đầu) */}
      {mentorInfo && (
        <section className="feedback-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2>Đánh giá Mentor</h2>
            <button
              className="btn-ghost"
              onClick={openReportModal}
              style={{ color: "#dc2626", display: "flex", alignItems: "center", gap: 8 }}
            >
              <FiAlertTriangle /> Báo cáo Mentor
            </button>
          </div>

          <div className="feedback-mentor-info">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <strong>{mentorInfo.name}</strong>
                <div className="rating">
                  Điểm đánh giá: <strong>{mentorInfo.rating ?? "—"}/10</strong>
                </div>
              </div>
            </div>

            {feedbackStatus && (
              <div className={`feedback-status-message ${feedbackStatus.canFeedback ? "can-feedback" : "cannot-feedback"}`}>
                {feedbackStatus.canFeedback ? (
                  "✓ Bạn có thể đánh giá mentor ngay bây giờ"
                ) : (
                  `⏳ Bạn chỉ có thể đánh giá mentor sau ${feedbackStatus.daysRemaining} ngày nữa`
                )}
              </div>
            )}
          </div>

          {/* Form đánh giá mentor */}
          {feedbackStatus?.canFeedback && (
            <div className="feedback-mentor-form">
              <label className="label">Điểm đánh giá (0-10)</label>
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={rating}
                onChange={e => setRating(e.target.value)}
                style={{ width: "100%", marginBottom: 8 }}
              />
              <div className="help-text">Điểm: <strong>{rating}/10</strong></div>

              <label className="label" style={{ marginTop: 12 }}>Nhận xét</label>
              <textarea
                rows="3"
                value={feedbackContent}
                onChange={e => setFeedbackContent(e.target.value)}
                className="input"
                placeholder="Nhập nhận xét về mentor..."
              />

              <button
                className="btn-submit"
                onClick={handleSubmitFeedback}
                disabled={submitting}
                style={{ marginTop: 12 }}
              >
                {submitting ? "Đang gửi..." : "Gửi đánh giá"}
              </button>
            </div>
          )}

          {/* Lịch sử đánh giá của learner */}
          {learnerFeedbacks.length > 0 && (
            <div className="feedback-history">
              <h3>Lịch sử đánh giá của bạn</h3>
              <div style={{ display: "grid", gap: 12 }}>
                {learnerFeedbacks.map((fb, idx) => (
                  <div key={fb.id || idx} className="feedback-history-item">
                    <div className="feedback-history-item-header">
                      <div className="feedback-history-item-rating">
                        <FiStar style={{ color: "#F59E0B" }} />
                        <strong>Điểm: {fb.rating ?? "—"}/10</strong>
                      </div>
                      <span className="feedback-history-item-date">
                        {new Date(fb.created_at).toLocaleString("vi-VN")}
                      </span>
                    </div>
                    {fb.content && (
                      <div className="feedback-history-item-content">
                        {fb.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Phần 2: Nhận xét từ Mentor (xuống dưới) */}
      <section className="feedback-section">
        <h2>Nhận xét từ Mentor</h2>
        {mentorFeedbacks.length === 0 ? (
          <div className="feedback-empty-state">
            <p>Chưa có nhận xét nào từ mentor.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {mentorFeedbacks.map((fb, idx) => (
              <div key={fb.id || idx} className="feedback-card">
                <div className="feedback-card-header">
                  <div>
                    <h3 className="feedback-card-title">
                      {fb.challenge_title || `Feedback #${fb.id}`}
                    </h3>
                    {fb.submission_created_at && (
                      <div className="feedback-card-meta">
                        Nộp bài: {new Date(fb.submission_created_at).toLocaleString("vi-VN")}
                      </div>
                    )}
                  </div>
                  <span className="challenge-status-pill success">
                    <FiUserCheck /> Đã chấm
                  </span>
                </div>

                <div className="feedback-scores">
                  <div className="feedback-score-item">
                    <div className="feedback-score-label">Điểm tổng</div>
                    <div className="feedback-score-value total">
                      {fb.final_score ? (fb.final_score / 10).toFixed(1) : "—"}/10
                    </div>
                  </div>
                  <div className="feedback-score-item">
                    <div className="feedback-score-label">Phát âm</div>
                    <div className="feedback-score-value">
                      {fb.pronunciation_score ? (fb.pronunciation_score / 10).toFixed(1) : "—"}/10
                    </div>
                  </div>
                  <div className="feedback-score-item">
                    <div className="feedback-score-label">Trôi chảy</div>
                    <div className="feedback-score-value">
                      {fb.fluency_score ? (fb.fluency_score / 10).toFixed(1) : "—"}/10
                    </div>
                  </div>
                </div>

                {(() => {
                  let audioUrl = fb.audio_url;
                  if (audioUrl && typeof audioUrl === "string" && audioUrl.startsWith("/uploads/")) {
                    const baseURL = import.meta.env.VITE_API_BASE || "http://localhost:4002/api";
                    const apiBase = baseURL.replace("/api", "");
                    audioUrl = `${apiBase}${audioUrl}`;
                  }
                  return audioUrl ? (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Audio nhận xét</div>
                      <audio src={audioUrl} controls className="feedback-audio-control" preload="metadata" />
                    </div>
                  ) : null;
                })()}

                {(() => {
                  let feedbackText = fb.feedback;
                  if (typeof feedbackText === "string") {
                    try {
                      const parsed = JSON.parse(feedbackText);
                      if (parsed && typeof parsed === "object" && parsed.text) {
                        feedbackText = parsed.text;
                      } else if (typeof parsed === "string") {
                        feedbackText = parsed;
                      }
                    } catch (e) {}
                  }
                  return feedbackText ? (
                    <div className="feedback-mentor-review">
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Nhận xét</div>
                      <div style={{ fontSize: 14 }}>
                        {feedbackText}
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Hiển thị transcript và đánh giá chi tiết */}
                {renderSubmissionDetail(fb)}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal Report Mentor */}
      {showReportModal && (
        <div className="feedback-report-modal">
          <div className="feedback-report-modal-content">
            <h3>Báo cáo Mentor</h3>
            {checkingReport ? (
              <p>Đang kiểm tra...</p>
            ) : !reportStatus.canReport ? (
              <div style={{ padding: 12, background: "#fef3c7", borderRadius: 6, marginBottom: 12 }}>
                <strong>⚠️ Bạn chỉ có thể report lại sau 24 giờ.</strong>
                <p>Còn {reportStatus.hoursRemaining} giờ nữa.</p>
              </div>
            ) : null}
            
            <label className="label">Nội dung báo cáo</label>
            <textarea
              rows="4"
              value={reportContent}
              onChange={e => setReportContent(e.target.value)}
              className="input"
              placeholder="Mô tả vấn đề bạn gặp phải với mentor..."
              disabled={!reportStatus.canReport}
            />

            <label className="label" style={{ marginTop: 12 }}>Hình ảnh (nếu có)</label>
            <input
              type="file"
              accept="image/*"
              onChange={e => setReportImage(e.target.files?.[0] || null)}
              style={{ marginBottom: 12 }}
              disabled={!reportStatus.canReport}
            />
            {reportImage && (
              <div style={{ marginTop: 8, marginBottom: 12 }}>
                <img src={URL.createObjectURL(reportImage)} alt="Preview" style={{ maxWidth: "200px", maxHeight: "200px" }} />
                <button onClick={() => setReportImage(null)} style={{ marginLeft: 8 }}>Xóa</button>
              </div>
            )}

            <label className="label">Video (nếu có)</label>
            <input
              type="file"
              accept="video/*"
              onChange={e => setReportVideo(e.target.files?.[0] || null)}
              style={{ marginBottom: 12 }}
              disabled={!reportStatus.canReport}
            />
            {reportVideo && (
              <div style={{ marginTop: 8, marginBottom: 12 }}>
                <video src={URL.createObjectURL(reportVideo)} controls style={{ maxWidth: "300px", maxHeight: "200px" }} />
                <button onClick={() => setReportVideo(null)} style={{ marginLeft: 8 }}>Xóa</button>
              </div>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button
                className="btn-submit"
                onClick={handleReportMentor}
                disabled={reporting || !reportContent.trim() || !reportStatus.canReport}
              >
                {reporting ? "Đang gửi..." : "Gửi báo cáo"}
              </button>
              <button
                className="btn-ghost"
                onClick={() => {
                  setShowReportModal(false);
                  setReportContent("");
                  setReportImage(null);
                  setReportVideo(null);
                }}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
