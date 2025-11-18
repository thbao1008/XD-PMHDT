// src/components/learner/Challenges.jsx
import React, { useEffect, useState, useRef } from "react";
import { getAuth } from "../../utils/auth";
import api from "../../api";
import Modal from "../common/Modal";
import "../../styles/learner.css";
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

  // filters
  const [query, setQuery] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [mentorOnly, setMentorOnly] = useState(false);

  // marked challenges (Set of ids)
  const [marked, setMarked] = useState(new Set());

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        // learnerId
        const lres = await api.get(`/learners/by-user/${userId}`);
        const learnerObj = lres.data?.learner ?? lres.data ?? null;
        const lid = learnerObj?.id ?? learnerObj?.learner_id ?? null;
        if (!mounted) return;
        setLearnerId(lid);

        if (!lid) {
          setChallenges([]);
          return;
        }

        // mentorId
        try {
          const mres = await api.get(`/learners/${lid}/mentor`);
          setMentorId(mres.data?.mentor_id ?? null);
        } catch {
          setMentorId(null);
        }

        // global challenges
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

        // load marked challenges for this learner (best-effort)
        try {
          const marksRes = await api.get(`/learners/${lid}/marks`);
          const marksArr = marksRes.data?.marks ?? marksRes.data ?? [];
          const ids = new Set(marksArr.map(m => m.challenge_id ?? m.challengeId ?? m));
          if (mounted) setMarked(ids);
        } catch (err) {
          // ignore if endpoint not available
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
    const text = div.textContent || div.innerText || "";
    return text.trim();
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
    if (!learnerId) {
      // optional: show toast or ignore
      return;
    }

    const prev = new Set(marked);
    const next = new Set(prev);
    const isMarked = prev.has(challengeId);
    if (isMarked) next.delete(challengeId); else next.add(challengeId);
    setMarked(next); // optimistic UI

    try {
      if (isMarked) {
        // unmark
        await api.delete(`/learners/${learnerId}/challenges/${challengeId}/mark`);
      } else {
        // mark
        await api.post(`/learners/${learnerId}/challenges/${challengeId}/mark`);
      }
    } catch (err) {
      console.error("toggleMark error", err);
      // revert on error
      setMarked(prev);
    }
  }

  return (
    <div className="learner-page">
      <h2 className="text-2xl font-bold mb-4">Danh sách Challenges</h2>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search">
          {/* icon search */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M21 21l-4.3-4.3" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="11" cy="11" r="7" stroke="#6B7280" strokeWidth="2"/>
          </svg>
          <input
            placeholder="Tìm theo tên challenge..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <select
          value={filterLevel}
          onChange={e => setFilterLevel(e.target.value)}
        >
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
              style={{ marginRight: 8 }}
            />
            Challenge giảng viên của bạn
          </label>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="resources-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-thumb skeleton-animate" />
              <div className="skeleton-line skeleton-animate skeleton-medium" />
              <div className="skeleton-line skeleton-animate skeleton-small" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">Không có challenge phù hợp với bộ lọc hiện tại.</div>
      ) : (
        <div className="resources-grid">
          {filtered.map(c => {
            const isMarked = marked.has(c.id);
            return (
              <div key={c.id} className="resource-card">
                {/* Thumbnail */}
                <div
                  className="resource-preview"
                  style={{ background: `linear-gradient(135deg, ${c._color} 0%, ${c._color}33 100%)` }}
                >
                  <div className="badges">
                    {c.is_teen && <span className="badge badge-teen">Teen</span>}
                    <span className="badge">{c.level || "-"}</span>
                    {mentorId && c.mentor_id === mentorId && (
                      <span className="badge badge-mentor">Của giảng viên</span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="resource-body">
                  <div className="resource-title">{c.title}</div>
                  <div className="resource-desc">{c.description}</div>

                  <div className="card-footer">
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button
                        className="btn-ghost"
                        onClick={() => openDetail(c)}
                      >
                        Xem chi tiết
                      </button>

                      <button
                        className="star-btn"
                        aria-pressed={isMarked}
                        title={isMarked ? "Bỏ đánh dấu" : "Đánh dấu"}
                        onClick={() => toggleMark(c.id)}
                      >
                        <FiStar className="star-icon" style={{ color: isMarked ? "#F59E0B" : "#9CA3AF" }} />
                      </button>
                    </div>
                  </div>
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
