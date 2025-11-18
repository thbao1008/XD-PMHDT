// src/components/learner/ChallengeDetail.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api";
import SubmissionForm from "./SubmissionForm";
import UserForPage from "../admin/UserForPage";
import { FiClock, FiCheckCircle, FiXCircle, FiUserCheck, FiCpu, FiPlay } from "react-icons/fi";
import "../../styles/learner.css";

/**
 * Updated ChallengeDetail:
 * - Toggle button "Hiện hội thoại" / "Ẩn hội thoại" (replaces per-segment "Nghe đoạn")
 * - Conversation mode: show each segment once, words shown inline (lowercase)
 * - Highlight tokens where AI is uncertain or pronunciation likely wrong
 * - Clicking any word plays the whole segment (start/end of that segment)
 */
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
  const [showConversation, setShowConversation] = useState(false); // toggle conversation view

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
        console.error("ChallengeDetail load error", err);
        if (mounted) setError(err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
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
    } catch (e) {
      console.error("refresh submissions error", e);
    }
  }

  function renderStatusIcon(submission) {
    if (submission.mentor_review) {
      return (
        <span className="status-pill success">
          <FiUserCheck /> Mentor: {submission.mentor_review.final_score}/10
        </span>
      );
    }
    switch (submission.status) {
      case "pending":
      case "pending_transcription":
        return <span className="status-pill pending"><FiClock /> Đang phân tích…</span>;
      case "completed":
        return <span className="status-pill success"><FiCheckCircle /> Đã đánh giá</span>;
      case "failed":
        return <span className="status-pill danger"><FiXCircle /> Lỗi</span>;
      default:
        return <span className="status-pill">{submission.status ?? "—"}</span>;
    }
  }

  function playSegment(start, end, idx) {
    const player = audioRef.current;
    if (!player || typeof start !== "number" || typeof end !== "number") return;
    if (segTimerRef.current) {
      clearTimeout(segTimerRef.current);
      segTimerRef.current = null;
    }
    player.currentTime = Math.max(0, start);
    player.play();
    const durMs = Math.max(0, (end - start) * 1000);
    segTimerRef.current = setTimeout(() => {
      player.pause();
      segTimerRef.current = null;
    }, durMs);
    const el = document.querySelector(`[data-token-idx="${idx}"]`);
    if (el) el.focus();
  }

  // Consider token "bad" if flags indicate mismatch/grammar/word_choice or score below threshold
  function isBadToken(w) {
    const lowScore = typeof w?.score === "number" && w.score < 0.6; // threshold can be tuned
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

  // Normalize submission so segments/words are accessible even if stored as strings or inside transcript
  function normalizeSubmission(submission) {
    const sub = { ...submission };

    if (typeof sub.transcript === "string") {
      try {
        const parsed = JSON.parse(sub.transcript);
        sub.transcript = parsed;
      } catch (_) {}
    }
    if (typeof sub.segments === "string") {
      try { sub.segments = JSON.parse(sub.segments); } catch (_) {}
    }
    if (typeof sub.words === "string") {
      try { sub.words = JSON.parse(sub.words); } catch (_) {}
    }
    if (typeof sub.word_analysis === "string") {
      try { sub.word_analysis = JSON.parse(sub.word_analysis); } catch (_) {}
    }

    return sub;
  }

  // Render each segment once; words inline (lowercase). Clicking any word plays the whole segment.
  function renderSegmentedTranscript(submission) {
    const segments = submission?.segments ?? [];
    const audioUrl = submission?.audio_url ?? null;
    if (!audioUrl || !Array.isArray(segments) || segments.length === 0) return null;

    return (
      <div className="transcript-scroll">
        {segments.map((seg, i) => {
          const start = typeof seg.start === "number" ? seg.start : 0;
          const end = typeof seg.end === "number" ? seg.end : start;
          // prefer segment_words if available
          const segWords = Array.isArray(seg.segment_words) && seg.segment_words.length ? seg.segment_words : [];
          // If no segment_words, try to split seg.text by spaces as fallback
          const fallbackWords = !segWords.length && typeof seg.text === "string"
            ? seg.text.split(/\s+/).map((w, idx) => ({ word: w, start: start, end: end }))
            : [];

          const wordsToRender = segWords.length ? segWords : fallbackWords;
          const nonEnglishCount = wordsToRender.filter(w => w.lang && w.lang !== "en").length;
          const segmentClass = nonEnglishCount > 0 ? "segment-block segment-nonenglish" : "segment-block";

          return (
            <div key={i} className={segmentClass} style={{ marginBottom: 10 }}>
              {/* We removed per-segment "Nghe đoạn" button; playback is triggered by clicking any word */}
              <div className="segment-text" style={{ marginBottom: 6 }}>
                {/* Render words inline, lowercase; clicking any word plays the whole segment */}
                {wordsToRender.map((w, j) => {
                  const title = buildTooltipForToken(w);
                  const cls = tokenClass(w);
                  // clicking any word plays the whole segment (start/end)
                  return (
                    <button
                      key={`${i}-${j}`}
                      type="button"
                      className={cls}
                      data-token-idx={`${i}-${j}`}
                      title={title}
                      onClick={() => playSegment(start, end, `${i}-${j}`)}
                      style={{ marginRight: 6, textTransform: "lowercase" }}
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

  // Conversation-only rendering: segments first, fallback to words/word_analysis
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
      <div>
        <audio ref={audioRef} id="player" src={audioUrl} controls className="w-full mb-2" />

        {/* Toggle button: Hiện / Ẩn hội thoại */}
        <div style={{ marginBottom: 8 }}>
          <button
            className="btn-secondary"
            onClick={() => setShowConversation(prev => !prev)}
            title="Ẩn/Hiện hội thoại"
          >
            {showConversation ? "Ẩn hội thoại" : "Hiện hội thoại"}
          </button>
        </div>

        {/* If conversation hidden, show hint only */}
        {!showConversation && (
          <div className="text-muted" style={{ marginBottom: 8 }}>
            Nhấn "Hiện hội thoại" để xem từng đoạn; bấm vào từ để phát đoạn tương ứng.
          </div>
        )}

        {/* Conversation visible */}
        {showConversation && (
          <>
            {segments.length > 0 && renderSegmentedTranscript({ ...submission, segments })}

            {segments.length === 0 && wordsSource.length > 0 && (
              <div className="transcript-scroll" style={{ marginTop: 8 }}>
                <div className="transcript-words">
                  {wordsSource.map((w, i) => {
                    // If words have no segment info, try to map them to nearest start/end if available,
                    // but per requirement clicking any word should play the whole submission audio segment.
                    // We'll play a small window around the word if start/end exist, otherwise play full audio.
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
                        style={{ marginRight: 6, textTransform: "lowercase" }}
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
      setShowConversation(false); // reset view when opening new submission
    } catch (err) {
      console.error("loadSubmissionDetails error", err);
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

        const done = !!sub.analysis || !!sub.overall_score || !!sub.word_analysis || !!sub.segments || sub.status === "completed";
        if (done) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          await refreshSubmissions();
        }
      } catch (err) {
        console.error("polling submission error", err);
      }
    }, 3000);
  }

  async function handleAfterSubmit(result) {
    let submissionId = null;
    let audio_url = null;

    if (!result) {
      await refreshSubmissions();
      setShowSubmit(false);
      setShowHistory(true);
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
      return;
    }

    setLoadingSubmission(true);
    try {
      const res = await api.get(`/learners/submissions/${submissionId}`);
      const sub = res.data?.submission ?? res.data ?? null;
      setSelectedSubmission(sub || { id: submissionId, audio_url, status: "pending_transcription" });
    } catch (err) {
      console.error("loadSubmission after submit failed", err);
      setSelectedSubmission({ id: submissionId, audio_url, status: "pending_transcription" });
    } finally {
      setLoadingSubmission(false);
    }

    startPollingSubmission(submissionId);
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

  return (
    <div className="learner-page">
      <div className="header-row" style={{ marginBottom: 12 }}>
        <div className="flex items-center gap-3">
          <span className="badge">{challenge.level ?? "-"}</span>
          {challenge.mentor_name && (
            <span
              style={{ color: "blue", cursor: "pointer", textDecoration: "underline" }}
              onClick={() => { if (mentorUserId) setOpenMentorUserId(mentorUserId); }}
            >
              {challenge.mentor_name}
            </span>
          )}
        </div>
      </div>

      <div className="detail-layout">
        {/* Left column: widen only when viewing a submission */}
        <div className={`left-panel panel ${selectedSubmission ? "wide-submission" : ""}`}>
          {showSubmit ? (
            <SubmissionForm
              learnerId={learnerId}
              challengeId={id}
              onSubmitted={handleAfterSubmit}
              onCancel={() => {
                setShowSubmit(false);
                setShowHistory(true);
              }}
            />
          ) : selectedSubmission ? (
            <div className="submission-card">
              <div className="submission-header">
                <h3 className="submission-title">Chi tiết nộp bài</h3>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-ghost" onClick={() => { setSelectedSubmission(null); setShowHistory(true); }}>
                    ← Quay lại lịch sử
                  </button>
                </div>
              </div>

              <div className="submission-body scrollable-submission">
                {loadingSubmission ? (
                  <div className="text-muted">Đang tải...</div>
                ) : (
                  <>
                    {renderConversationOnly(selectedSubmission)}

                    {canShowAnalysis && (
                      <div style={{ marginTop: 12 }}>
                        <div className="section-title-inline"><FiCpu className="section-icon" /><strong>Đánh giá tự động</strong></div>
                        <div className="score-grid" style={{ marginTop: 8 }}>
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
                              <div style={{ marginTop: 6 }}>
                                <div className="label">Phù hợp challenge</div>
                                <div className="value">
                                  Điểm: {aiSummary.alignment.score ?? "—"}
                                  {Array.isArray(aiSummary.alignment.notes) && aiSummary.alignment.notes.length > 0 && (
                                    <ul className="notes">
                                      {aiSummary.alignment.notes.map((n, i) => <li key={i}>{n}</li>)}
                                    </ul>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div style={{ marginTop: 8 }}>
                          <div className="label">Nhận xét tự động</div>
                          <div className="value">{selectedSubmission.analysis?.feedback ?? selectedSubmission.suggestions ?? "—"}</div>
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: 12, borderTop: "1px solid #eef2f6", paddingTop: 12 }}>
                      <div className="section-title-inline"><FiUserCheck className="section-icon" /><strong>Nhận xét Mentor</strong></div>
                      {selectedSubmission.mentor_review ? (
                        <div className="text-sm">
                          <div><span className="label">Mentor</span><div className="value">{selectedSubmission.mentor_review.mentor_name}</div></div>
                          <div style={{ marginTop: 6 }}><span className="label">Điểm</span><div className="value">{selectedSubmission.mentor_review.final_score}/10</div></div>
                          <div style={{ marginTop: 6 }}><span className="label">Nhận xét</span><div className="value">{selectedSubmission.mentor_review.feedback}</div></div>
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
              <h3 style={{ marginTop: 0 }}>{challenge.title ?? "Thông tin challenge"}</h3>
              <div dangerouslySetInnerHTML={{ __html: challenge.long_description ?? challenge.description ?? "" }} />
              <div style={{ marginTop: 12 }}>
                <button
                  className="btn-primary"
                  onClick={() => {
                    setShowSubmit(true);
                    setShowHistory(false);
                    setSelectedSubmission(null);
                  }}
                >
                  Nộp bài
                </button>
              </div>
            </div>
          )}
        </div>

        {showHistory && (
          <div className="right-panel panel scrollable-history">
            <h4 style={{ marginTop: 0 }}>Lịch sử nộp bài</h4>
            {submissions.length === 0 ? (
              <div className="empty-state">Chưa có lần nộp nào.</div>
            ) : (
              <div className="submissions-grid">
                {submissions.map((s) => (
                  <div key={s.id} className="submission-card">
                    <div className="submission-header">
                      <div className="meta">
                        <span className="meta-item"><strong>Attempt</strong> #{s.attempt_number ?? s.attemptNumber ?? "-"}</span>
                        <span className="meta-sep">•</span>
                        {(s.created_at || s.submitted_at) && (
                          <span className="meta-item"><strong>Nộp</strong> {new Date(s.created_at ?? s.submitted_at).toLocaleString("vi-VN")}</span>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button className="btn-ghost" onClick={() => handleHistoryView(s.id)}>Xem</button>
                      </div>
                    </div>

                    {s.audio_url && (
                      <div className="result-audio">
                        <audio controls src={s.audio_url} />
                      </div>
                    )}

                    <div style={{ marginTop: 8 }}>
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
