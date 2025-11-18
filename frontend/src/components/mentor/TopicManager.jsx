// src/pages/mentor/TopicManager.jsx
import { useEffect, useRef, useState } from "react";
import { getAuth } from "../../utils/auth";
import api from "../../api";
import "../../styles/topics.css";
import { FiPlus, FiTrash2, FiArrowLeft } from "react-icons/fi";
import DOMPurify from "dompurify";
import ChallengeEditor from "../../components/mentor/ChallengeEditor";

export default function TopicManager() {
  const auth = getAuth();
  const userId = auth?.user?.id || auth?.user?.user_id || null;

  const [mentorId, setMentorId] = useState(null);
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);

  const [formTopic, setFormTopic] = useState({
    title: "",
    description: "",
    level: ""
  });

  const challengeRef = useRef(null);
  const [editorOpen, setEditorOpen] = useState(false);

  // guard to avoid concurrent fetchTopics calls
  const fetchingTopicsRef = useRef(false);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    (async () => {
      try {
        const res = await api.get(`/mentors/by-user/${userId}`);
        const mid = res.data?.mentor_id;
        if (!mounted) return;
        setMentorId(mid);
        if (mid) {
          await fetchTopics(mid);
        }
      } catch (err) {
        console.error("❌ Error fetching mentor/topics:", err);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function fetchTopics(mid = mentorId) {
    if (!mid) return;
    if (fetchingTopicsRef.current) {
      console.log("fetchTopics: already fetching, skip");
      return;
    }
    fetchingTopicsRef.current = true;
    try {
      console.log("fetchTopics called for mentor:", mid);
      const topicRes = await api.get(`/mentors/${mid}/topics`);
      setTopics(topicRes.data?.topics || []);
    } catch (err) {
      console.error("❌ Error fetching topics:", err);
    } finally {
      fetchingTopicsRef.current = false;
    }
  }

  const handleCreateTopic = async () => {
    if (!mentorId) {
      alert("Mentor ID chưa được load!");
      return;
    }
    if (!formTopic.title.trim() || !formTopic.description.trim() || !formTopic.level) {
      alert("Vui lòng nhập đầy đủ tiêu đề, mô tả và chọn level!");
      return;
    }

    try {
      const res = await api.post(`/mentors/${mentorId}/topics`, formTopic);
      setTopics(prev => [...prev, res.data.topic]);
      setFormTopic({ title: "", description: "", level: "" });
      alert("Tạo topic thành công!");
    } catch (err) {
      console.error("❌ API error khi tạo topic:", err);
      alert("Không thể tạo topic!");
    }
  };

  const handleDeleteTopic = async (topicId) => {
    if (!window.confirm("Bạn có chắc muốn xoá topic này?")) return;
    try {
      await api.delete(`/mentors/topics/${topicId}`);
      setTopics(prev => prev.filter(t => t.id !== topicId));
      if (selectedTopic?.id === topicId) setSelectedTopic(null);
      alert("Xoá topic thành công!");
    } catch (err) {
      console.error("❌ API error khi xoá topic:", err);
      alert("Không thể xoá topic!");
    }
  };

  const handleSelectTopic = async (topic) => {
    setSelectedTopic(topic);
    setEditorOpen(false);
  };

  const handleBackToTopics = () => {
    setSelectedTopic(null);
    setEditorOpen(false);
  };

  const handleOpenCreate = () => {
    setEditorOpen(true);
    if (challengeRef.current?.openCreate) {
      challengeRef.current.openCreate();
    } else if (challengeRef.current?.applySuggestion) {
      challengeRef.current.applySuggestion("");
    }
  };

  const handleBackToChallengeList = () => {
    setEditorOpen(false);
    if (challengeRef.current?.closeEditor) {
      challengeRef.current.closeEditor();
    }
  };

  const handleChallengeSaved = async (savedChallenge) => {
    await fetchTopics();
    setEditorOpen(false);
    console.log("Challenge saved", savedChallenge);
  };

  function ChatBox({ topicId }) {
    const [messages, setMessages] = useState([]); // { role, content, meta?, payload? }
    const [chatInput, setChatInput] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const chatScrollRef = useRef(null);

    useEffect(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
    }, [messages]);

    const pushUserMessage = (text) => {
      setMessages(prev => [...prev, { role: "user", content: DOMPurify.sanitize(text) }]);
    };

    const pushAssistant = (obj) => {
      setMessages(prev => [...prev, obj]);
    };

    const handleSendChat = async (text) => {
      console.log("handleSendChat called:", text);
      if (!text?.trim()) return;
      pushUserMessage(text);
      setChatInput("");
      setAiLoading(true);
      try {
        const ctx = ""; // optional: pass editor context if needed
        const res = await api.post(`/mentors/challenges/ai-chat`, { message: text, context: ctx }, { timeout: 15000 });
        const suggestion = res.data?.suggestion || res.data?.message || "<i>Không có phản hồi</i>";
        pushAssistant({ role: "assistant", content: DOMPurify.sanitize(suggestion), meta: "suggestion" });
      } catch (err) {
        console.error("AI chat error", err);
        pushAssistant({ role: "assistant", content: "<i>AI tạm thời không phản hồi. Thử lại sau.</i>" });
      } finally {
        setAiLoading(false);
      }
    };

    const handleInsertPayload = (payload) => {
      if (!payload) return;
      if (challengeRef.current?.applySuggestion) {
        challengeRef.current.applySuggestion(payload);
      } else {
        challengeRef.current?.openCreate && challengeRef.current.openCreate();
        setTimeout(() => {
          challengeRef.current?.applySuggestion && challengeRef.current.applySuggestion(payload.description || "");
        }, 50);
      }
      setEditorOpen(true);
    };

    return (
      <div style={{ marginTop: 12 }}>
        <h4>AI trò chuyện</h4>

        <div
          ref={chatScrollRef}
          style={{ border: "1px solid #eee", padding: 8, height: 220, overflow: "auto", background: "#fff", borderRadius: 6 }}
        >
          {messages.length === 0 ? (
            <div className="muted">Nhập yêu cầu để AI gợi ý nội dung vào bảng bên phải.</div>
          ) : (
            messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <strong>{m.role === "assistant" ? "AI" : "Bạn"}:</strong>{" "}
                <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(m.content) }} />
                {m.meta === "insertButton" && m.payload && (
                  <div style={{ marginTop: 8 }}>
                    <button onClick={() => handleInsertPayload(m.payload)} className="btn-primary" style={{ marginRight: 8 }}>
                      Chèn vào tài liệu
                    </button>
                    <button onClick={() => {
                      if (challengeRef.current?.applySuggestion) {
                        challengeRef.current.applySuggestion(m.payload);
                        setEditorOpen(true);
                      }
                    }} className="btn-secondary">
                      Xem trước
                    </button>
                  </div>
                )}
                {m.meta === "suggestion" && (
                  <div style={{ marginTop: 8 }}>
                    <button onClick={() => {
                      if (challengeRef.current?.applySuggestion) {
                        challengeRef.current.applySuggestion(m.content);
                        setEditorOpen(true);
                      }
                    }} className="btn-primary">
                      Chèn vào tài liệu
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            placeholder="Nhập yêu cầu trò chuyện với AI"
            style={{ flex: 1 }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSendChat(chatInput); }}
          />
          <button type="button" onClick={() => handleSendChat(chatInput)} className="btn-primary" disabled={aiLoading}>Gửi</button>
        </div>
      </div>
    );
  }

  return (
    <div className="topics-page">
      <div className="topics-layout" style={{ display: "flex", gap: 20 }}>
        {/* Left panel */}
        <aside className="topics-left" style={{ width: 320, position: "relative", zIndex: 5 }}>
          {!selectedTopic ? (
            <div className="create-topic">
              <h2><FiPlus /> Tạo topic mới</h2>
              <input
                placeholder="Tiêu đề"
                value={formTopic.title}
                onChange={e => setFormTopic({ ...formTopic, title: e.target.value })}
              />
              <textarea
                placeholder="Mô tả"
                value={formTopic.description}
                onChange={e => setFormTopic({ ...formTopic, description: e.target.value })}
              />
              <select
                value={formTopic.level}
                onChange={e => setFormTopic({ ...formTopic, level: e.target.value })}
              >
                <option value="">Chọn level</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
              <button onClick={handleCreateTopic}><FiPlus /> Tạo topic</button>
            </div>
          ) : (
            <div className="selected-topic-panel">
              <h3>Topic đã chọn</h3>
              <div className="topic-info">
                <h4>{selectedTopic.title}</h4>
                <p className="muted">{selectedTopic.description}</p>
                <div className="meta">
                  <span className="level">{selectedTopic.level}</span>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                {editorOpen ? (
                  <button onClick={handleBackToChallengeList} className="btn-secondary">
                    <FiArrowLeft /> Quay lại danh sách challenge
                  </button>
                ) : (
                  <button onClick={handleBackToTopics} className="btn-secondary">
                    <FiArrowLeft /> Quay lại danh sách topic
                  </button>
                )}
              </div>

              {/* ChatBox nằm dưới nút Quay lại */}
              {selectedTopic && (
                <ChatBox topicId={selectedTopic.id} />
              )}
            </div>
          )}
        </aside>

        {/* Right panel */}
        <section className="topics-right" style={{ flex: 1, position: "relative", zIndex: 1 }}>
          {!selectedTopic ? (
            <>
              <h2>Danh sách topic</h2>
              <div className="topics-list">
                {topics.length === 0 ? (
                  <div className="empty">Chưa có topic nào. Tạo topic mới ở bên trái.</div>
                ) : (
                  topics.map(t => (
                    <div
                      key={t.id}
                      className="topic-card"
                      onClick={() => handleSelectTopic(t)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="topic-card-body">
                        <h3>{t.title}</h3>
                        <p>{t.description}</p>
                      </div>
                      <div className="topic-card-footer">
                        <span className="level">{t.level}</span>
                        <button
                          className="delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTopic(t.id);
                          }}
                          aria-label="Xoá topic"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h2>Challenge cho topic: {selectedTopic.title}</h2>
              </div>

              <ChallengeEditor
                ref={challengeRef}
                topicId={selectedTopic.id}
                onSaved={handleChallengeSaved}
                onOpen={() => setEditorOpen(true)}
                onClose={() => setEditorOpen(false)}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
