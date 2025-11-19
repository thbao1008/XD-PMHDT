// src/components/learner/ChallengeDetail.jsx (mới )
import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api";
import SubmissionForm from "./SubmissionForm";
import UserForPage from "../admin/UserForPage";
import { FiClock, FiCheckCircle, FiXCircle, FiUserCheck, FiCpu } from "react-icons/fi";
import "../../styles/challenge.css";

export default function ChallengeDetail({ id, learnerId, onClose = () => {} }) {
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showSubmit, setShowSubmit] = useState(false);
  const [submissions, setSubmissions] = useState([]);

  const [openMentorUserId, setOpenMentorUserId] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [loadingSubmission, setLoadingSubmission] = useState(false);

  const [showHistory, setShowHistory] = useState(true);
  const [showConversation, setShowConversation] = useState(false);
  const [isSubmitButtonLocked, setSubmitButtonLocked] = useState(false);

  const pollingRef = useRef(null);
  const audioRef = useRef(null);
  const segTimerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const chRes = await api.get(`/challenges/${id}`);
        const ch = chRes.data?.challenge ?? chRes.data ?? null;
        if (!mounted) return;
        setChallenge(ch);
        if (learnerId) await refreshSubmissions();
      } catch (err) {
        if (mounted) setError(err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [id, learnerId]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      if (segTimerRef.current) {
        clearTimeout(segTimerRef.current);
        segTimerRef.current = null;
      }
    };
  }, []);

  async function refreshSubmissions() {
    if (!learnerId) return;
    try {
      const sres = await api.get(`/learners/${learnerId}/submissions`);
      const arr = sres.data?.submissions ?? sres.data ?? [];
      const filtered = Array.isArray(arr)
        ? arr.filter((s) => String(s.challenge_id ?? s.challengeId) === String(id))
        : [];
      setSubmissions(filtered);
    } catch (_) {}
  }

  function renderStatusIcon(submission) {
    if (submission.mentor_review) {
      return (
        <span className="challenge-status-pill success">
          <FiUserCheck /> Mentor: {submission.mentor_review.final_score}/10
        </span>
      );
    }
    switch (submission.status) {
      case "pending":
      case "pending_transcription":
        return <span className="challenge-status-pill pending"><FiClock /> Đang phân tích…</span>;
      case "completed":
        return <span className="challenge-status-pill success"><FiCheckCircle /> Đã đánh giá</span>;
      case "failed":
        return <span className="challenge-status-pill danger"><FiXCircle /> Lỗi</span>;
      default:
        return <span className="challenge-status-pill">{submission.status ?? "—"}</span>;
    }
  }

  function playSegment(start, end, idx) {
    const player = audioRef.current;
    if (!player) {
      console.warn("[ChallengeDetail] Audio player not found");
      return;
    }
    
    if (typeof start !== "number" || typeof end !== "number") {
      console.warn("[ChallengeDetail] Invalid start/end time:", { start, end });
      return;
    }
    
    console.log("[ChallengeDetail] playSegment:", { start, end, idx, audioSrc: player.src });
    
    if (segTimerRef.current) {
      clearTimeout(segTimerRef.current);
      segTimerRef.current = null;
    }
    
    // Đảm bảo audio đã được load
    const tryPlay = () => {
      if (player.readyState >= 2) { // HAVE_CURRENT_DATA hoặc cao hơn
        // Đặt thời gian (đảm bảo start là số giây, không phải milliseconds)
        const startTime = start > 1000 ? start / 1000 : start; // Nếu > 1000 thì có thể là milliseconds
        const endTime = end > 1000 ? end / 1000 : end;
        
        // Pause trước để reset
        player.pause();
        
        // Set currentTime và đợi seeked event để đảm bảo đã seek xong
        const onSeeked = () => {
          console.log("[ChallengeDetail] Seeked to:", player.currentTime, "seconds (target:", startTime, ")");
          
          // Phát audio sau khi đã seek xong - phát tiếp đến hết, không dừng
          const playPromise = player.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log("[ChallengeDetail] Audio playing from", player.currentTime, "- will continue to end");
                // Không set timer để pause - để audio phát tiếp đến hết
              })
              .catch(error => {
                console.error("[ChallengeDetail] Audio play error:", error);
              });
          }
          player.removeEventListener('seeked', onSeeked);
        };
        
        player.addEventListener('seeked', onSeeked, { once: true });
        player.currentTime = Math.max(0, startTime);
        console.log("[ChallengeDetail] Setting currentTime to:", startTime, "seconds");
        
        // Fallback: nếu seeked không fire trong 500ms, thử phát luôn
        setTimeout(() => {
          if (player.paused && Math.abs(player.currentTime - startTime) < 0.1) {
            console.log("[ChallengeDetail] Seeked event timeout, playing anyway");
            onSeeked();
          }
        }, 500);
      } else {
        // Nếu chưa load xong, đợi một chút rồi thử lại
        console.log("[ChallengeDetail] Audio not ready, waiting...", player.readyState);
        setTimeout(tryPlay, 100);
      }
    };
    
    // Thử phát ngay hoặc đợi audio load
    if (player.readyState === 0) {
      // Nếu chưa load, load trước
      player.load();
      player.addEventListener('loadeddata', tryPlay, { once: true });
    } else {
      tryPlay();
    }
    
    // Scroll đến từ được click
    setTimeout(() => {
      const el = document.querySelector(`[data-token-idx="${idx}"]`);
      if (el) {
        el.focus();
        // Tìm container có scroll
        let scrollContainer = el.closest('.transcript-scroll') || 
                             el.closest('.conversation') ||
                             el.closest('.challenge-submission-body') ||
                             el.closest('.section');
        if (scrollContainer) {
          const containerRect = scrollContainer.getBoundingClientRect();
          const elementRect = el.getBoundingClientRect();
          const scrollTop = scrollContainer.scrollTop;
          const scrollLeft = scrollContainer.scrollLeft;
          
          // Tính toán vị trí scroll để element ở giữa container
          const scrollY = scrollTop + (elementRect.top - containerRect.top) - (containerRect.height / 2) + (elementRect.height / 2);
          const scrollX = scrollLeft + (elementRect.left - containerRect.left) - (containerRect.width / 2) + (elementRect.width / 2);
          
          scrollContainer.scrollTo({
            top: Math.max(0, scrollY),
            left: Math.max(0, scrollX),
            behavior: 'smooth'
          });
        } else {
          // Fallback: scroll element vào view
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
    return `token ${bad ? "token-bad" : "token-ok"} ${isNonEnglish ? "token-nonenglish" : ""}`;
  }

  const canShowAnalysis = !!selectedSubmission &&
    (selectedSubmission.status === "completed" ||
     !!selectedSubmission.analysis ||
     !!selectedSubmission.overall_score ||
     !!selectedSubmission.word_analysis ||
     !!selectedSubmission.segments ||
     !!selectedSubmission.transcript?.text ||
     typeof selectedSubmission.transcript === "string");

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

  function normalizeSubmission(submission) {
    const sub = { ...submission };
    if (typeof sub.transcript === "string") { try { sub.transcript = JSON.parse(sub.transcript); } catch (_) {} }
    if (typeof sub.segments === "string") { try { sub.segments = JSON.parse(sub.segments); } catch (_) {} }
    if (typeof sub.words === "string") { try { sub.words = JSON.parse(sub.words); } catch (_) {} }
    if (typeof sub.word_analysis === "string") { try { sub.word_analysis = JSON.parse(sub.word_analysis); } catch (_) {} }
    return sub;
  }

  function renderSegmentedTranscript(submission) {
    const segments = submission?.segments ?? [];
    const audioUrl = submission?.audio_url ?? null;
    if (!audioUrl || !Array.isArray(segments) || segments.length === 0) return null;

    return (
      <div className="transcript-scroll">
        {segments.map((seg, i) => {
          const start = typeof seg.start === "number" ? seg.start : 0;
          const end = typeof seg.end === "number" ? seg.end : start;
          const segWords = Array.isArray(seg.segment_words) && seg.segment_words.length ? seg.segment_words : [];
          const fallbackWords = !segWords.length && typeof seg.text === "string"
            ? seg.text.split(/\s+/).map((w) => ({ word: w, start, end }))
            : [];
          const wordsToRender = segWords.length ? segWords : fallbackWords;
          const nonEnglishCount = wordsToRender.filter(w => w.lang && w.lang !== "en").length;
          const segmentClass = nonEnglishCount > 0 ? "segment-block segment-nonenglish" : "segment-block";

          return (
            <div key={i} className={segmentClass}>
              <div className="segment-text">
                {wordsToRender.map((w, j) => {
                  const title = buildTooltipForToken(w);
                  const cls = tokenClass(w);
                  
                  // Ưu tiên dùng start/end của từ, nếu không có thì dùng của segment
                  const playStart = typeof w.start === "number" ? w.start : start;
                  const playEnd = typeof w.end === "number" ? w.end : end;
                  
                  return (
                    <button
                      key={`${i}-${j}`}
                      type="button"
                      className={cls}
                      data-token-idx={`${i}-${j}`}
                      title={title}
                      onClick={() => playSegment(playStart, playEnd, `${i}-${j}`)}
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

  function renderConversationOnly(rawSubmission) {
    const submission = normalizeSubmission(rawSubmission);
    const audioUrl = submission?.audio_url ?? null;
    if (!audioUrl) return <p className="text-muted">Không có audio</p>;

    const segments =
      Array.isArray(submission?.segments) && submission.segments.length
        ? submission.segments
        : Array.isArray(submission?.transcript?.segments) && submission.transcript.segments.length
          ? submission.transcript.segments
          : [];

    const wordsSource =
      Array.isArray(submission?.word_analysis) && submission.word_analysis.length
        ? submission.word_analysis
        : Array.isArray(submission?.words) && submission.words.length
          ? submission.words
          : Array.isArray(submission?.transcript?.words) && submission.transcript.words.length
            ? submission.transcript.words
            : [];

    return (
      <div className="conversation">
        <audio ref={audioRef} id="player" src={audioUrl} controls className="audio-control" />
        <div className="conversation-toggle">
          <button
            className="btn-secondary"
            onClick={() => setShowConversation(prev => !prev)}
            title="Ẩn/Hiện hội thoại"
          >
            {showConversation ? "Ẩn hội thoại" : "Hiện hội thoại"}
          </button>
        </div>

        {!showConversation && (
          <div className="text-muted hint">
            Nhấn "Hiện hội thoại" để xem từng đoạn; bấm vào từ để phát đoạn tương ứng.
          </div>
        )}

        {showConversation && (
          <>
            {segments.length > 0 && renderSegmentedTranscript({ ...submission, segments })}

            {segments.length === 0 && wordsSource.length > 0 && (
              <div className="transcript-scroll">
                <div className="transcript-words">
                  {wordsSource.map((w, i) => {
                    const segStart = typeof w.start === "number" ? w.start : 0;
                    const segEnd = typeof w.end === "number" ? w.end : (typeof submission.duration === "number" ? submission.duration : null);
                    const playStart = segStart;
                    const playEnd = segEnd !== null ? segEnd : (typeof submission.duration === "number" ? submission.duration : (segStart + 2));
                    const title = buildTooltipForToken(w);
                    const cls = tokenClass(w);
                    return (
                      <button
                        key={i}
                        type="button"
                        className={cls}
                        data-token-idx={i}
                        title={title}
                        onClick={() => playSegment(playStart, playEnd, i)}
                        style={{ textTransform: "lowercase" }}
                      >
                        {String(w.word ?? "").toLowerCase()}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {segments.length === 0 && wordsSource.length === 0 && (
              <div className="text-muted">Chưa có dữ liệu hội thoại để hiển thị.</div>
            )}
          </>
        )}

        <p className="help-text">Nhấp vào từ để nghe lại toàn bộ đoạn chứa từ đó.</p>
      </div>
    );
  }

  async function loadSubmissionDetails(submissionId) {
    setLoadingSubmission(true);
    try {
      const res = await api.get(`/learners/submissions/${submissionId}`);
      const sub = res.data?.submission ?? res.data ?? null;
      setSelectedSubmission(sub);
      setShowHistory(false);
      setShowSubmit(false);
      setShowConversation(false);
    } catch (_) {
    } finally {
      setLoadingSubmission(false);
    }
  }

  async function handleHistoryView(submissionId) {
    await loadSubmissionDetails(submissionId);
  }

  function startPollingSubmission(submissionId) {
    if (!submissionId) return;
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    pollingRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/learners/submissions/${submissionId}`);
        const sub = res.data?.submission ?? res.data ?? null;
        if (!sub) return;

        setSelectedSubmission(sub);

        // Kiểm tra xem đã có AI analysis hoặc mentor review chưa
        const done = !!sub.analysis || !!sub.overall_score || !!sub.word_analysis || !!sub.segments || sub.status === "completed" || !!sub.mentor_review;
        if (done) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          await refreshSubmissions();
        }
      } catch (_) {}
    }, 3000);
  }

  async function handleAfterSubmit(result) {
    let submissionId = null;
    let audio_url = null;

    if (!result) {
      await refreshSubmissions();
      setShowSubmit(false);
      setShowHistory(true);
      setSubmitButtonLocked(false);
      return;
    }

    if (typeof result === "object") {
      submissionId = result.submissionId ?? result.id ?? null;
      audio_url = result.audio_url ?? result.audioUrl ?? null;
    } else {
      submissionId = result;
    }

    setShowSubmit(false);
    setShowHistory(false);

    if (!submissionId) {
      await refreshSubmissions();
      setSubmitButtonLocked(false);
      return;
    }

    setLoadingSubmission(true);
    try {
      const res = await api.get(`/learners/submissions/${submissionId}`);
      const sub = res.data?.submission ?? res.data ?? null;
      setSelectedSubmission(sub || { id: submissionId, audio_url, status: "pending_transcription" });
    } catch (_) {
      setSelectedSubmission({ id: submissionId, audio_url, status: "pending_transcription" });
    } finally {
      setLoadingSubmission(false);
    }

    startPollingSubmission(submissionId);
    setSubmitButtonLocked(false);
  }

  const mentorUserId = useMemo(
    () => challenge?.mentor_user_id ?? challenge?.mentor_id ?? challenge?.mentorId ?? null,
    [challenge]
  );

  if (loading) return <div>Đang tải...</div>;
  if (error) return <div className="text-danger">Lỗi: {error.message ?? "Không thể tải challenge"}</div>;
  if (!challenge) return <div>Không tìm thấy challenge</div>;

  const aiSummary = selectedSubmission?.topic || selectedSubmission?.topic_confidence
    ? {
        topic: selectedSubmission?.topic ?? null,
        topicConfidence: selectedSubmission?.topic_confidence ?? null,
        alignment: selectedSubmission?.topic_alignment ?? null
      }
    : null;

  // src/components/learner/ChallengeDetail.jsx
// Chỉ trích đoạn phần layout cần thay

return (
  <div className="challenge-detail-page">
    <div className="challenge-header">
      <div className="header-left">
        <span className="badge">{challenge.level ?? "-"}</span>
        {challenge.mentor_name && (
          <span
            className="mentor-link"
            onClick={() => { if (mentorUserId) setOpenMentorUserId(mentorUserId); }}
          >
            {challenge.mentor_name}
          </span>
        )}
      </div>
      <div className="header-right">
        <button className="btn-ghost" onClick={onClose}>Đóng</button>
      </div>
    </div>

    {/* ONE layout container */}
    <div className={`challenge-detail-layout ${selectedSubmission ? "is-expanded" : ""}`}>
      {/* LEFT: Detail */}
      <div className="challenge-left-panel">
        {showSubmit ? (
          <SubmissionForm
            learnerId={learnerId}
            challengeId={id}
            onSubmitted={handleAfterSubmit}
            onCancel={() => {
              setShowSubmit(false);
              setShowHistory(true);
              setSubmitButtonLocked(false);
            }}
          />
        ) : selectedSubmission ? (
          <div className="challenge-submission-card">
            <div className="challenge-submission-header">
              <h3 className="submission-title">Chi tiết nộp bài</h3>
              <div className="actions">
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setSelectedSubmission(null);
                    setShowHistory(true);
                    setSubmitButtonLocked(false);
                  }}
                >
                  Quay lại lịch sử
                </button>
              </div>
            </div>

            {/* body có cuộn riêng */}
            <div className="challenge-submission-body">
              {loadingSubmission ? (
                <div className="text-muted">Đang tải...</div>
              ) : (
                <>
                  <div className="section">{renderConversationOnly(selectedSubmission)}</div>

                  {canShowAnalysis && (
                    <div className="section">
                      <div className="section-title-inline"><FiCpu className="section-icon" /><strong>Đánh giá tự động</strong></div>
                      <div className="score-grid">
                        <div><span className="label">Tổng</span><div className="value">{selectedSubmission.overall_score ?? selectedSubmission.score ?? "—"}</div></div>
                        <div><span className="label">Phát âm</span><div className="value">{selectedSubmission.pronunciation_score ?? "—"}</div></div>
                        <div><span className="label">Trôi chảy</span><div className="value">{selectedSubmission.fluency_score ?? "—"}</div></div>
                      </div>

                      {aiSummary && (
                        <div className="ai-topic-box">
                          <div className="label">Chủ đề</div>
                          <div className="value">
                            {aiSummary.topic ?? "—"}
                            {typeof aiSummary.topicConfidence === "number" && (
                              <span className="sub-note"> (tự tin: {aiSummary.topicConfidence.toFixed(2)})</span>
                            )}
                          </div>

                          {aiSummary.alignment && (
                            <div className="alignment-block">
                              <div className="label">Phù hợp challenge</div>
                              <div className="value">
                                Điểm: {aiSummary.alignment.score ?? "—"}
                                {Array.isArray(aiSummary.alignment.notes) && aiSummary.alignment.notes.length > 0 && (
                                  <ul className="notes">
                                    {aiSummary.alignment.notes.map((n, idx) => <li key={idx}>{n}</li>)}
                                  </ul>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="auto-feedback">
                        <div className="label">Nhận xét tự động</div>
                        <div className="value">{selectedSubmission.analysis?.feedback ?? selectedSubmission.suggestions ?? "—"}</div>
                      </div>
                    </div>
                  )}

                  <div className="section mentor-review">
                    <div className="section-title-inline"><FiUserCheck className="section-icon" /><strong>Nhận xét Mentor</strong></div>
                    {selectedSubmission.mentor_review ? (
                      <div className="text-sm">
                        <div className="score-grid">
                          <div><span className="label">Điểm tổng</span><div className="value">{selectedSubmission.mentor_review.final_score ?? "—"}/10</div></div>
                          <div><span className="label">Phát âm</span><div className="value">{selectedSubmission.mentor_review.pronunciation_score ?? "—"}/10</div></div>
                          <div><span className="label">Trôi chảy</span><div className="value">{selectedSubmission.mentor_review.fluency_score ?? "—"}/10</div></div>
                        </div>
                        {(() => {
                          // Normalize audio_url - có thể là relative path hoặc full URL
                          let audioUrl = selectedSubmission.mentor_review.audio_url;
                          if (audioUrl) {
                            // Nếu là relative path (bắt đầu với /uploads/), thêm base URL
                            if (typeof audioUrl === "string" && audioUrl.startsWith("/uploads/")) {
                              const baseURL = import.meta.env.VITE_API_BASE || "http://localhost:4002/api";
                              const apiBase = baseURL.replace("/api", ""); // Remove /api để lấy base server URL
                              audioUrl = `${apiBase}${audioUrl}`;
                            }
                            return (
                              <div style={{ marginTop: 12 }}>
                                <div className="label">Audio nhận xét</div>
                                <audio 
                                  src={audioUrl} 
                                  controls 
                                  style={{ width: "100%" }}
                                  preload="metadata"
                                  onError={(e) => {
                                    console.error("[ChallengeDetail] Audio load error:", {
                                      src: audioUrl,
                                      error: e.target.error
                                    });
                                  }}
                                />
                              </div>
                            );
                          }
                          return null;
                        })()}
                        {(() => {
                          // Parse feedback text - có thể là JSON string hoặc plain text
                          let feedbackText = selectedSubmission.mentor_review.feedback;
                          if (typeof feedbackText === "string") {
                            try {
                              const parsed = JSON.parse(feedbackText);
                              // Nếu là object có text property, lấy text
                              if (parsed && typeof parsed === "object" && parsed.text) {
                                feedbackText = parsed.text;
                              } else if (typeof parsed === "string") {
                                feedbackText = parsed;
                              }
                            } catch (e) {
                              // Không phải JSON, giữ nguyên
                            }
                          }
                          return feedbackText ? (
                            <div className="auto-feedback" style={{ marginTop: 12 }}>
                              <div className="label">Nhận xét</div>
                              <div className="value">{feedbackText}</div>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    ) : (
                      <div className="text-muted"><em>Chưa có nhận xét từ Mentor</em></div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="info-card">
            <h3 className="info-title">{challenge.title ?? "Thông tin challenge"}</h3>
            <div className="info-content" dangerouslySetInnerHTML={{ __html: challenge.long_description ?? challenge.description ?? "" }} />
            <div className="info-actions">
              <button
                className="btn-primary"
                disabled={isSubmitButtonLocked}
                onClick={() => {
                  if (isSubmitButtonLocked) return;
                  setSubmitButtonLocked(true);
                  setShowSubmit(true);
                  setShowHistory(false);
                  setSelectedSubmission(null);
                }}
              >
                {isSubmitButtonLocked ? "Đang xử lý..." : "Nộp bài"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: History (panel có cuộn riêng) */}
      {showHistory && (
        <div className="challenge-right-panel">
          <h4 className="history-title">Lịch sử nộp bài</h4>
          {submissions.length === 0 ? (
            <div className="empty-state">Chưa có lần nộp nào.</div>
          ) : (
            <div className="challenge-submission-list">
              {submissions.map((s) => (
                <div key={s.id} className="challenge-submission-card">
                  <div className="challenge-submission-header">
                    <div className="meta">
                      <span className="meta-item"><strong>Attempt</strong> #{s.attempt_number ?? s.attemptNumber ?? "-"}</span>
                      <span className="meta-sep">•</span>
                      {(s.created_at || s.submitted_at) && (
                        <span className="meta-item"><strong>Nộp</strong> {new Date(s.created_at ?? s.submitted_at).toLocaleString("vi-VN")}</span>
                      )}
                    </div>
                    <div className="actions">
                      <button className="btn-ghost" onClick={() => handleHistoryView(s.id)}>Xem</button>
                    </div>
                  </div>

                  {s.audio_url && (
                    <div className="result-audio">
                      <audio controls src={s.audio_url} />
                    </div>
                  )}

                  <div className="status-row">
                    {renderStatusIcon(s)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>

    {openMentorUserId && <UserForPage userId={openMentorUserId} onClose={() => setOpenMentorUserId(null)} />}
  </div>
);

}
