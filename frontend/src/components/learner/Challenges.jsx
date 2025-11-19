// src/components/learner/Challenges.jsx
import React, { useEffect, useState, useRef } from "react";
import { getAuth } from "../../utils/auth";
import api from "../../api";
import Modal from "../common/Modal";
import "../../styles/challenge.css";
import ChallengeDetail from "./ChallengeDetail";
import { FiStar } from "react-icons/fi";

export default function Challenges() {
  const auth = getAuth();
  const userId = auth?.user?.id ?? auth?.user?._id ?? auth?.user?.user_id ?? null;
  const startedRef = useRef(false);

  const [learnerId, setLearnerId] = useState(null);
  const [mentorId, setMentorId] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailChallenge, setDetailChallenge] = useState(null);

  const [query, setQuery] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [mentorOnly, setMentorOnly] = useState(false);
  const [marked, setMarked] = useState(new Set());

  useEffect(() => {
    if (!userId) return setLoading(false);
    if (startedRef.current) return;
    startedRef.current = true;

    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const lres = await api.get(`/learners/by-user/${userId}`);
        const learnerObj = lres.data?.learner ?? lres.data ?? null;
        const lid = learnerObj?.id ?? learnerObj?.learner_id ?? null;
        if (!mounted) return;
        setLearnerId(lid);

        if (!lid) return setChallenges([]);

        try {
          const mres = await api.get(`/learners/${lid}/mentor`);
          setMentorId(mres.data?.mentor_id ?? null);
        } catch {
          setMentorId(null);
        }

        const cres = await api.get(`/challenges`);
        const arr = cres.data?.challenges ?? cres.data ?? [];
        const minimal = Array.isArray(arr)
          ? arr.map(c => ({
              id: c.id ?? c._id,
              title: c.title ?? "",
              level: c.level ?? "",
              description: stripHtml(c.description ?? ""),
              is_teen: !!c.is_teen,
              mentor_id: c.mentor_id ?? null,
              _color: pickColor(String(c.id ?? c._id))
            }))
          : [];
        if (!mounted) return;
        setChallenges(minimal);

        try {
          const marksRes = await api.get(`/learners/${lid}/marks`);
          const marksArr = marksRes.data?.marks ?? marksRes.data ?? [];
          const ids = new Set(marksArr.map(m => m.challenge_id ?? m.challengeId ?? m));
          if (mounted) setMarked(ids);
        } catch (err) {
          console.warn("Could not load marks", err);
        }
      } catch (err) {
        console.error("Load challenges error", err);
        setChallenges([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; startedRef.current = false; };
  }, [userId]);

  function pickColor(seed) {
    const colors = ["#4F46E5","#EC4899","#10B981","#F59E0B","#3B82F6","#8B5CF6","#F43F5E","#06B6D4"];
    const idx = [...seed].reduce((a,ch) => (a + ch.charCodeAt(0)), 0) % colors.length;
    return colors[idx];
  }

  function stripHtml(html) {
    const div = document.createElement("div");
    div.innerHTML = html;
    return (div.textContent || div.innerText || "").trim();
  }

  const filtered = challenges.filter(c => {
    if (mentorOnly && mentorId && c.mentor_id !== mentorId) return false;
    if (filterLevel && c.level !== filterLevel) return false;
    if (query && !c.title.toLowerCase().includes(query.trim().toLowerCase())) return false;
    return true;
  });

  function openDetail(ch) {
    setDetailChallenge(ch);
  }

  async function toggleMark(challengeId) {
    if (!learnerId) return;
    const prev = new Set(marked);
    const next = new Set(prev);
    const isMarked = prev.has(challengeId);
    isMarked ? next.delete(challengeId) : next.add(challengeId);
    setMarked(next);

    try {
      if (isMarked) {
        await api.delete(`/learners/${learnerId}/challenges/${challengeId}/mark`);
      } else {
        await api.post(`/learners/${learnerId}/challenges/${challengeId}/mark`);
      }
    } catch (err) {
      console.error("toggleMark error", err);
      setMarked(prev);
    }
  }

  return (
    <div className="challenge-page">
      <h2 className="page-title">Danh sách Challenges</h2>

      <div className="challenge-toolbar">
        <div className="search">
          <input
            placeholder="Tìm theo tên challenge..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
          <option value="">Tất cả level</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        {mentorId && (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={mentorOnly}
              onChange={e => setMentorOnly(e.target.checked)}
            />
            Challenge giảng viên của bạn
          </label>
        )}
      </div>

      {loading ? (
        <div className="challenge-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="challenge-card skeleton-card">
              <div className="skeleton-thumb skeleton-animate" />
              <div className="skeleton-line skeleton-animate skeleton-medium" />
              <div className="skeleton-line skeleton-animate skeleton-small" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">Không có challenge phù hợp với bộ lọc hiện tại.</div>
      ) : (
        <div className="challenge-grid">
          {filtered.map(c => {
            const isMarked = marked.has(c.id);
            return (
              <div key={c.id} className="challenge-card">
                <div
                  className="challenge-thumb"
                  style={{ background: `linear-gradient(135deg, ${c._color} 0%, ${c._color}33 100%)` }}
                >
                  <div className="challenge-badges">
                    {c.is_teen && <span className="challenge-badge">Teen</span>}
                    <span className="challenge-badge">{c.level || "-"}</span>
                    {mentorId && c.mentor_id === mentorId && (
                      <span className="challenge-badge">Của giảng viên</span>
                    )}
                  </div>
                </div>

                <div className="challenge-title">{c.title}</div>
                <div className="challenge-desc">{c.description}</div>

                <div className="challenge-footer">
                  <button className="btn-view" onClick={() => openDetail(c)}>Xem chi tiết</button>
                  <button className="btn-mark" onClick={() => toggleMark(c.id)}>
                    <FiStar style={{ color: isMarked ? "#F59E0B" : "#9CA3AF" }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {detailChallenge && (
        <Modal title={detailChallenge.title} onClose={() => setDetailChallenge(null)}>
          <ChallengeDetail
            id={detailChallenge.id}
            learnerId={learnerId}
            onClose={() => setDetailChallenge(null)}
          />
        </Modal>
      )}
    </div>
  );
}
