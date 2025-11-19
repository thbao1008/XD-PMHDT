// src/components/mentor/AssessmentModal.jsx
import React, { useEffect, useState, useRef } from "react";
import api from "../../api";
import { getAuth } from "../../utils/auth";
import AudioRecorder from "../common/AudioRecorder";
import { FiCpu, FiUserCheck } from "react-icons/fi";
import "../../styles/challenge.css";

export default function AssessmentModal({ submissionId, onClose, onSaved }) {
  console.log("[AssessmentModal] mounted, submissionId:", submissionId);
  const [mentorId, setMentorId] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [pronunciation, setPronunciation] = useState(0);
  const [fluency, setFluency] = useState(0);
  const [finalScore, setFinalScore] = useState("");
  const [feedback, setFeedback] = useState("");

  const [recordedAudio, setRecordedAudio] = useState(null);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showConversation, setShowConversation] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isEditing, setIsEditing] = useState(false); // Trạng thái chỉnh sửa

  const audioRef = useRef(null);
  const segTimerRef = useRef(null);

  function normalizeSubmission(submission) {
    const sub = { ...submission };
    if (typeof sub.transcript === "string") { try { sub.transcript = JSON.parse(sub.transcript); } catch (_) {} }
    if (typeof sub.segments === "string") { try { sub.segments = JSON.parse(sub.segments); } catch (_) {} }
    if (typeof sub.words === "string") { try { sub.words = JSON.parse(sub.words); } catch (_) {} }
    if (typeof sub.word_analysis === "string") { try { sub.word_analysis = JSON.parse(sub.word_analysis); } catch (_) {} }
    return sub;
  }

  function playSegment(start, end, idx) {
    const player = audioRef.current;
    if (!player) {
      console.warn("[AssessmentModal] Audio player not found");
      return;
    }
    
    if (typeof start !== "number" || typeof end !== "number") {
      console.warn("[AssessmentModal] Invalid start/end time:", { start, end });
      return;
    }
    
    console.log("[AssessmentModal] playSegment:", { start, end, idx, audioSrc: player.src });
    
    // Dừng audio hiện tại nếu đang phát
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
          console.log("[AssessmentModal] Seeked to:", player.currentTime, "seconds (target:", startTime, ")");
          
          // Phát audio sau khi đã seek xong - phát tiếp đến hết, không dừng
          const playPromise = player.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log("[AssessmentModal] Audio playing from", player.currentTime, "- will continue to end");
                // Không set timer để pause - để audio phát tiếp đến hết
              })
              .catch(error => {
                console.error("[AssessmentModal] Audio play error:", error);
              });
          }
          player.removeEventListener('seeked', onSeeked);
        };
        
        player.addEventListener('seeked', onSeeked, { once: true });
        player.currentTime = Math.max(0, startTime);
        console.log("[AssessmentModal] Setting currentTime to:", startTime, "seconds");
        
        // Fallback: nếu seeked không fire trong 500ms, thử phát luôn
        setTimeout(() => {
          if (player.paused && Math.abs(player.currentTime - startTime) < 0.1) {
            console.log("[AssessmentModal] Seeked event timeout, playing anyway");
            onSeeked();
          }
        }, 500);
      } else {
        // Nếu chưa load xong, đợi một chút rồi thử lại
        console.log("[AssessmentModal] Audio not ready, waiting...", player.readyState);
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
    
    // Tìm và scroll đến từ được click
    setTimeout(() => {
      const el = document.querySelector(`[data-token-idx="${idx}"]`);
      if (el) {
        el.focus();
        // Tìm container có scroll (transcript-scroll hoặc conversation)
        let scrollContainer = el.closest('.transcript-scroll') || 
                             el.closest('.conversation') ||
                             el.closest('.submission-body') ||
                             el.closest('.section') ||
                             el.closest('[style*="overflow"]');
        
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

  function renderSegmentedTranscript(submission) {
    const segments = submission?.segments ?? [];
    const audioUrl = submission?.audio_url ?? submission?.audioUrl ?? null;
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
                  const wordStart = typeof w.start === "number" ? w.start : start;
                  const wordEnd = typeof w.end === "number" ? w.end : end;
                  
                  // Nếu từ không có start/end riêng, phát cả segment chứa từ đó
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
    const audioUrl = submission?.audio_url ?? submission?.audioUrl ?? null;
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
        <audio 
          ref={audioRef} 
          src={audioUrl} 
          controls 
          className="audio-control"
          preload="auto"
          onLoadedData={() => {
            // Đảm bảo audio đã sẵn sàng để phát
            if (audioRef.current) {
              audioRef.current.volume = 1.0;
            }
          }}
        />
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

  // Resolve mentorId
  useEffect(() => {
    async function resolveMentor() {
      try {
        const auth = getAuth();
        if (!auth || !auth.user) {
          console.warn("[AssessmentModal] No auth found");
          setErr("Không tìm thấy user đăng nhập");
          return;
        }

        const userId = auth.user._id || auth.user.id || auth.user.user_id;
        console.log("[AssessmentModal] auth.user:", auth.user);
        if (!userId) {
          console.warn("[AssessmentModal] Missing userId in auth.user");
          setErr("Không tìm thấy user đăng nhập");
          return;
        }

        console.log(`[AssessmentModal] GET /mentors/by-user/${userId}`);
        const res = await api.get(`/mentors/by-user/${userId}`);
        console.log("[AssessmentModal] mentors/by-user response:", res.status, res.data);
        const id = res.data.mentor_id || res.data.id;
        if (!id) {
          console.warn("[AssessmentModal] mentors/by-user returned no mentor_id");
          setErr("Không tìm thấy mentor tương ứng");
          return;
        }
        setMentorId(id);
      } catch (error) {
        console.error("[AssessmentModal] resolveMentorId error:", {
          message: error?.message,
          status: error?.response?.status,
          data: error?.response?.data,
        });
        setErr(error?.response?.data?.error || error?.response?.data?.message || "Không thể lấy mentorId");
      }
    }
    resolveMentor();
  }, []);

  // Fetch submission detail
  useEffect(() => {
    if (!mentorId || !submissionId) return;
    setIsInitialLoad(true); // Reset khi load submission mới
    setLoading(true);
    setErr("");
    console.log(`[AssessmentModal] GET /mentors/${mentorId}/submissions/${submissionId}`);
    api.get(`/mentors/${mentorId}/submissions/${submissionId}`)
      .then(res => {
        console.log("[AssessmentModal] submission detail response:", res.status, res.data);
        const s = res.data.submission;
        // Normalize submission data (parse JSON strings if needed)
        const normalized = normalizeSubmission(s);
        setSubmission(normalized);
        
        // Ưu tiên lấy điểm từ mentor_review (đã chấm), nếu không có thì lấy từ AI hoặc default
        const mr = normalized.mentor_review;
        const lc = normalized.learner_challenge;
        
        // Load điểm từ mentor_review (đã chấm) hoặc từ AI assessment
        const rawPron = mr?.pronunciation_score ?? normalized.mentor_pronunciation_score ?? normalized.pronunciation_score ?? 0;
        const rawFlu = mr?.fluency_score ?? normalized.mentor_fluency_score ?? normalized.fluency_score ?? 0;
        const pronScore = rawPron > 10 ? (rawPron / 10).toFixed(1) : (rawPron || 0);
        const fluScore = rawFlu > 10 ? (rawFlu / 10).toFixed(1) : (rawFlu || 0);
        setPronunciation(pronScore);
        setFluency(fluScore);
        
        // Tính final score tự động nếu chưa có
        const existingFinal = mr?.final_score ?? lc?.final_score ?? normalized.final_score ?? "";
        if (existingFinal === "" || existingFinal === null || existingFinal === undefined) {
          const avg = ((Number(pronScore) + Number(fluScore)) / 2).toFixed(1);
          setFinalScore(avg);
        } else {
          const finalNorm = existingFinal > 10 ? (existingFinal / 10).toFixed(1) : existingFinal;
          setFinalScore(finalNorm);
        }
        
        // Load feedback text từ mentor_review (ưu tiên nhất)
        const feedbackText = mr?.feedback || normalized.feedback?.text || lc?.feedback || normalized.feedback || "";
        setFeedback(feedbackText);
        
        // Load audio URL từ mentor_review (ưu tiên nhất)
        const audioUrl = mr?.audio_url || normalized.feedback?.audio_url || normalized.mentor_audio_play_url;
        if (audioUrl) {
          // Normalize audio URL - nếu là relative path thì thêm base URL
          let normalizedAudioUrl = audioUrl;
          if (typeof audioUrl === "string" && audioUrl.startsWith("/uploads/")) {
            const baseURL = import.meta.env.VITE_API_BASE || "http://localhost:4002/api";
            const apiBase = baseURL.replace("/api", "");
            normalizedAudioUrl = `${apiBase}${audioUrl}`;
          }
          setUploadedUrl(normalizedAudioUrl);
        } else {
          setUploadedUrl(null);
        }
        
        // Đánh dấu đã load xong để useEffect có thể tự động tính điểm khi mentor thay đổi
        setIsInitialLoad(false);
        
        // Nếu đã có mentor_review, form mặc định bị khóa (không cho chỉnh sửa)
        const hasReview = !!mr;
        console.log("[AssessmentModal] Has mentor_review:", hasReview, mr);
        setIsEditing(!hasReview);
      })
      .catch(error => {
        console.error("[AssessmentModal] submission fetch error:", {
          message: error?.message,
          status: error?.response?.status,
          data: error?.response?.data,
        });
        setErr(error?.response?.data?.error || "Không thể tải submission");
      })
      .finally(() => setLoading(false));
  }, [mentorId, submissionId]);

  // Tự động tính final score khi pronunciation hoặc fluency thay đổi (chỉ sau khi load xong)
  useEffect(() => {
    if (isInitialLoad) return; // Bỏ qua lần đầu load dữ liệu
    const pron = Number(pronunciation) || 0;
    const flu = Number(fluency) || 0;
    const avg = ((pron + flu) / 2).toFixed(1);
    setFinalScore(avg);
  }, [pronunciation, fluency, isInitialLoad]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (segTimerRef.current) {
        clearTimeout(segTimerRef.current);
        segTimerRef.current = null;
      }
    };
  }, []);

  async function uploadAudio(file) {
    console.log("[AssessmentModal] POST /uploads, file:", { name: file.name, size: file.size, type: file.type });
    const fd = new FormData();
    fd.append("file", file);
    const res = await api.post("/uploads", fd, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: e => {
        if (e.total) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percent);
          console.log("[AssessmentModal] upload progress:", percent, "%");
        }
      }
    });
    console.log("[AssessmentModal] upload response:", res.status, res.data);
    // Trả về URL string
    if (typeof res.data === "string") {
      return res.data;
    }
    return res.data?.url || res.data?.filename ? `/uploads/${res.data.filename}` : res.data;
  }

  async function handleSave() {
    setErr("");
    if (!mentorId || !submissionId) {
      console.warn("[AssessmentModal] handleSave: missing mentorId or submissionId");
      return;
    }
    setSaving(true);
    try {
      let audio_url = uploadedUrl;
      if (!audio_url && recordedAudio) {
        const file = recordedAudio instanceof File
          ? recordedAudio
          : new File([recordedAudio], `mentor-${mentorId}-${submissionId}.webm`, { type: recordedAudio.type || "audio/webm" });
        audio_url = await uploadAudio(file);
        setUploadedUrl(audio_url);
      }
      // Chuyển điểm từ thang 10 sang thang 100 để lưu vào database (nếu backend yêu cầu)
      const payload = {
        final_score: finalScore === "" ? null : Number(finalScore),
        feedback,
        pronunciation_score: Number(pronunciation),
        fluency_score: Number(fluency),
        audio_url
      };
      console.log("[AssessmentModal] POST review payload:", payload);
      const res = await api.post(`/mentors/${mentorId}/submissions/${submissionId}/review`, payload);
      console.log("[AssessmentModal] review response:", res.status, res.data);
      
      // Sau khi lưu thành công, khóa form lại và cập nhật submission
      setIsEditing(false);
      
      // Cập nhật submission với review mới
      const updatedSubmission = { ...submission };
      if (!updatedSubmission.mentor_review) {
        updatedSubmission.mentor_review = {};
      }
      updatedSubmission.mentor_review = {
        ...updatedSubmission.mentor_review,
        ...res.data.review
      };
      setSubmission(updatedSubmission);
      
      // Cập nhật uploadedUrl nếu có audio mới
      if (res.data.review.audio_url) {
        let normalizedAudioUrl = res.data.review.audio_url;
        if (typeof normalizedAudioUrl === "string" && normalizedAudioUrl.startsWith("/uploads/")) {
          const baseURL = import.meta.env.VITE_API_BASE || "http://localhost:4002/api";
          const apiBase = baseURL.replace("/api", "");
          normalizedAudioUrl = `${apiBase}${normalizedAudioUrl}`;
        }
        setUploadedUrl(normalizedAudioUrl);
      }
      
      // Cập nhật feedback text nếu có
      if (res.data.review.feedback) {
        setFeedback(res.data.review.feedback);
      }
      
      // Clear recorded audio sau khi đã upload
      setRecordedAudio(null);
      
      onSaved?.(res.data.review);
      // Không đóng modal, chỉ khóa form để mentor có thể xem lại
    } catch (error) {
      console.error("[AssessmentModal] save review error:", {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
      });
      setErr(error?.response?.data?.error || "Lưu nhận xét thất bại");
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  }

  if (loading) return <div className="panel">Đang tải chi tiết...</div>;
  if (err) return (
    <div className="panel">
      <div className="error">{err}</div>
      <button className="btn-ghost" onClick={onClose}>Đóng</button>
    </div>
  );
  if (!submission) return null;

  return (
    <div className="submission-card" aria-live="polite" style={{ maxHeight: "90vh", overflowY: "auto" }}>
      <div className="submission-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 className="submission-title">{submission.title || "Submission"}</h3>
          <div className="meta">
            <span>{submission.learner?.name ?? "Learner"}</span>
            <span className="meta-sep">•</span>
            <span>{new Date(submission.created_at).toLocaleString()}</span>
          </div>
        </div>
        <button className="btn-ghost" onClick={onClose}>Đóng</button>
      </div>

      <div className="submission-body" style={{ display: "grid", gap: 12 }}>
        {/* Transcript với khả năng click để phát audio */}
        <div className="section">
          {renderConversationOnly(submission)}
        </div>

        {/* Đánh giá AI */}
        {(() => {
          // Kiểm tra giống như ChallengeDetail
          const canShowAnalysis = !!submission &&
            (submission.status === "completed" ||
             !!submission.analysis ||
             !!submission.overall_score ||
             !!submission.word_analysis ||
             !!submission.segments ||
             !!submission.transcript?.text ||
             typeof submission.transcript === "string" ||
             !!submission.pronunciation_score ||
             !!submission.fluency_score);

          if (!canShowAnalysis) return null;

          // Lấy AI summary giống ChallengeDetail
          const aiSummary = submission?.topic || submission?.topic_confidence
            ? {
                topic: submission?.topic ?? null,
                topicConfidence: submission?.topic_confidence ?? null,
                alignment: submission?.topic_alignment ?? null
              }
            : null;
          
          // Normalize điểm AI từ thang 100 về thang 10 nếu cần
          const aiPronScore = submission?.pronunciation_score;
          const aiFluScore = submission?.fluency_score;
          const aiOverallScore = submission?.overall_score ?? submission?.score;
          
          const normalizedAiPron = aiPronScore != null ? (aiPronScore > 10 ? (aiPronScore / 10).toFixed(1) : aiPronScore) : null;
          const normalizedAiFlu = aiFluScore != null ? (aiFluScore > 10 ? (aiFluScore / 10).toFixed(1) : aiFluScore) : null;
          const normalizedAiOverall = aiOverallScore != null ? (aiOverallScore > 10 ? (aiOverallScore / 10).toFixed(1) : aiOverallScore) : null;

          return (
            <div className="section">
              <div className="section-title-inline">
                <FiCpu className="section-icon" />
                <strong>Đánh giá tự động</strong>
              </div>
              <div className="score-grid">
                <div>
                  <span className="label">Tổng</span>
                  <div className="value">{normalizedAiOverall ?? "—"}</div>
                </div>
                <div>
                  <span className="label">Phát âm</span>
                  <div className="value">{normalizedAiPron ?? "—"}</div>
                </div>
                <div>
                  <span className="label">Trôi chảy</span>
                  <div className="value">{normalizedAiFlu ?? "—"}</div>
                </div>
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
                <div className="value">{submission.analysis?.feedback ?? submission.suggestions ?? "—"}</div>
              </div>
            </div>
          );
        })()}

        {/* Audio đã gửi (nếu có) - luôn hiển thị */}
        {uploadedUrl && (
          <div style={{ marginBottom: 16, padding: 12, background: "#f9fafb", borderRadius: 6, border: "1px solid #e5e7eb" }}>
            <div className="label" style={{ marginBottom: 8, color: "#059669", fontWeight: 600 }}>
              Audio nhận xét đã gửi
            </div>
            <audio src={uploadedUrl} controls style={{ width: "100%" }} />
            {!isEditing && (
              <div className="help-text" style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                Nhấn "Chỉnh sửa" để thay đổi audio này
              </div>
            )}
          </div>
        )}

        {/* Audio recorder để ghi âm hoặc upload mới - chỉ hiển thị khi đang chỉnh sửa */}
        {isEditing && (
          <div>
            <div className="help-text">Ghi âm nhận xét (hoặc chọn file)</div>
            <AudioRecorder onRecorded={setRecordedAudio} />
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ height: 8, background: "#eee", borderRadius: 6, overflow: "hidden" }}>
                  <div style={{ width: `${uploadProgress}%`, height: "100%", background: "linear-gradient(90deg,#40E0d0,#20B2AA)" }} />
                </div>
                <div className="help-text">{uploadProgress}%</div>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="label">Pronunciation score</label>
          <input 
            type="range" 
            min="0" 
            max="10" 
            step="0.1"
            value={pronunciation} 
            onChange={e => setPronunciation(e.target.value)} 
            disabled={!isEditing}
            style={{ opacity: isEditing ? 1 : 0.6, cursor: isEditing ? "pointer" : "not-allowed" }}
          />
          <div className="help-text">Điểm phát âm: <strong>{pronunciation}/10</strong></div>

          <label className="label" style={{ marginTop: 8 }}>Fluency score</label>
          <input 
            type="range" 
            min="0" 
            max="10" 
            step="0.1"
            value={fluency} 
            onChange={e => setFluency(e.target.value)} 
            disabled={!isEditing}
            style={{ opacity: isEditing ? 1 : 0.6, cursor: isEditing ? "pointer" : "not-allowed" }}
          />
          <div className="help-text">Điểm lưu loát: <strong>{fluency}/10</strong></div>

          <label className="label" style={{ marginTop: 8 }}>Final score</label>
          <input 
            type="number" 
            min="0" 
            max="10" 
            step="0.1"
            value={finalScore} 
            onChange={e => setFinalScore(e.target.value)} 
            className="input" 
            readOnly
            style={{ backgroundColor: "#f3f4f6", cursor: "not-allowed" }}
          />
          <div className="help-text">Điểm cuối: <strong>{finalScore}/10</strong> (tự động tính trung bình)</div>

          <label className="label" style={{ marginTop: 8 }}>
            Feedback
            {feedback && submission?.mentor_review && !isEditing && (
              <span style={{ marginLeft: 8, fontSize: 12, color: "#059669", fontWeight: "normal" }}>
                (Đã gửi)
              </span>
            )}
          </label>
          <textarea 
            rows="3" 
            value={feedback} 
            onChange={e => setFeedback(e.target.value)} 
            className="input"
            disabled={!isEditing}
            style={{ opacity: isEditing ? 1 : 0.9, cursor: isEditing ? "text" : "not-allowed", backgroundColor: isEditing ? "#fff" : "#f9fafb" }}
            placeholder={isEditing ? (submission?.mentor_review ? "Nhập nhận xét mới hoặc chỉnh sửa nhận xét hiện tại" : "Nhập nhận xét cho học viên") : "Nhận xét đã được gửi"}
          />
          {!isEditing && feedback && submission?.mentor_review && (
            <div className="help-text" style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>
              Nhấn "Chỉnh sửa" để thay đổi nhận xét này
            </div>
          )}
        </div>

        {err && <div className="error">{err}</div>}

        <div style={{ display: "flex", gap: 12, justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 12 }}>
            {isEditing ? (
              <>
                <button className="btn-submit" onClick={handleSave} disabled={saving}>
                  {saving ? "Đang lưu..." : submission?.mentor_review ? "Cập nhật phản hồi" : "Chấm điểm và gửi phản hồi"}
                </button>
                {submission?.mentor_review && (
                  <button 
                    className="btn-ghost" 
                    onClick={() => {
                      // Hủy chỉnh sửa: load lại dữ liệu từ submission
                      const mr = submission.mentor_review;
                      if (mr) {
                        const pronScore = mr.pronunciation_score > 10 ? (mr.pronunciation_score / 10).toFixed(1) : mr.pronunciation_score;
                        const fluScore = mr.fluency_score > 10 ? (mr.fluency_score / 10).toFixed(1) : mr.fluency_score;
                        setPronunciation(pronScore || "0");
                        setFluency(fluScore || "0");
                        const finalNorm = mr.final_score > 10 ? (mr.final_score / 10).toFixed(1) : mr.final_score;
                        setFinalScore(finalNorm || "0");
                        setFeedback(mr.feedback || "");
                        if (mr.audio_url) {
                          let normalizedAudioUrl = mr.audio_url;
                          if (typeof normalizedAudioUrl === "string" && normalizedAudioUrl.startsWith("/uploads/")) {
                            const baseURL = import.meta.env.VITE_API_BASE || "http://localhost:4002/api";
                            const apiBase = baseURL.replace("/api", "");
                            normalizedAudioUrl = `${apiBase}${normalizedAudioUrl}`;
                          }
                          setUploadedUrl(normalizedAudioUrl);
                        }
                        setRecordedAudio(null);
                        setErr("");
                      }
                      setIsEditing(false);
                    }}
                  >
                    Hủy
                  </button>
                )}
              </>
            ) : (
              <>
                {submission?.mentor_review && (
                  <button 
                    className="btn-submit" 
                    onClick={() => setIsEditing(true)}
                  >
                    Chỉnh sửa
                  </button>
                )}
                {!submission?.mentor_review && (
                  <button className="btn-submit" onClick={handleSave} disabled={saving}>
                    {saving ? "Đang lưu..." : "Chấm điểm và gửi phản hồi"}
                  </button>
                )}
              </>
            )}
          </div>
          <button className="btn-ghost" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}
