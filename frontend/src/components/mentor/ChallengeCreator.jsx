// frontend/src/components/mentor/ChallengeCreator.jsx
import React, { useEffect, useRef, useState } from "react";
import { getAuth } from "../../utils/auth";
import api from "../../api";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import DOMPurify from "dompurify";
import { FiPlus, FiTrash2, FiEdit, FiMessageCircle, FiSend } from "react-icons/fi";
import "../../styles/challenge-creator.css";

export default function ChallengeCreator() {
  const auth = getAuth();
  const userId = auth?.user?.id || auth?.user?._id || auth?.user?.user_id || null;
  const [mentorId, setMentorId] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("list"); // "list" | "edit"
  const [editing, setEditing] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  
  // AI Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef(null);
  
  const quillRef = useRef(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    loadMentorId();
  }, [userId]);

  useEffect(() => {
    if (mentorId) {
      fetchChallenges();
    }
  }, [mentorId]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const loadMentorId = async () => {
    try {
      const res = await api.get(`/mentors/by-user/${userId}`);
      const mid = res.data?.mentor_id || res.data?.id;
      setMentorId(mid);
    } catch (err) {
      console.error("Error loading mentor ID:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchChallenges = async () => {
    if (!mentorId) return;
    try {
      const res = await api.get(`/mentors/${mentorId}/challenges`);
      setChallenges(res.data?.challenges || res.data || []);
    } catch (err) {
      console.error("Error fetching challenges:", err);
      setChallenges([]);
    }
  };

  const openCreate = () => {
    setEditing({ title: "", description: "", type: "speaking", level: "medium" });
    setMode("edit");
    setChatMessages([]);
  };

  const openEdit = (challenge) => {
    setEditing({ ...challenge, type: challenge.type || "speaking" });
    setMode("edit");
    setChatMessages([]);
  };

  const closeEditor = () => {
    setMode("list");
    setEditing(null);
    setChatMessages([]);
    fetchChallenges();
  };

  const isEmptyHtml = (html) => {
    if (!html) return true;
    const stripped = html.replace(/<[^>]*>/g, "").replace(/\s+/g, "").trim();
    return stripped.length === 0;
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.title?.trim() || isEmptyHtml(editing.description)) {
      alert("Vui lòng nhập tiêu đề và nội dung.");
      return;
    }
    setSaveLoading(true);
    try {
      const payload = { ...editing, type: "speaking" };
      let res;
      if (editing.id) {
        res = await api.put(`/mentors/challenges/${editing.id}`, payload);
      } else {
        res = await api.post(`/mentors/${mentorId}/challenges`, payload);
      }
      alert("Lưu challenge thành công!");
      closeEditor();
    } catch (err) {
      console.error("Save challenge error", err);
      const errorMsg = err?.response?.data?.error || err?.response?.data?.message || "Lưu thất bại";
      alert(errorMsg);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm("Bạn có chắc muốn xoá challenge này?")) return;
    try {
      await api.delete(`/mentors/challenges/${id}`);
      await fetchChallenges();
      alert("Xoá challenge thành công");
    } catch (err) {
      console.error("Delete challenge error", err);
      alert("Xoá thất bại: " + (err?.response?.data?.error || err?.message));
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    
    const userMessage = chatInput.trim();
    setChatMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const context = editing?.description || "";
      const res = await api.post(`/mentors/challenges/ai-chat`, { 
        message: userMessage, 
        context: context 
      }, { timeout: 15000 });
      
      let suggestion = res.data?.suggestion || res.data?.message || "<i>Không có phản hồi</i>";
      
      // Try to parse JSON response
      let parsedSuggestion = null;
      try {
        const jsonMatch = suggestion.match(/\{[\s\S]*"title"[\s\S]*\}/);
        if (jsonMatch) {
          parsedSuggestion = JSON.parse(jsonMatch[0]);
          // Format for display
          suggestion = `<div class="ai-suggestion">
            <h3>${DOMPurify.sanitize(parsedSuggestion.title)}</h3>
            <div>${DOMPurify.sanitize(parsedSuggestion.description)}</div>
            ${parsedSuggestion.level ? `<p><strong>Level:</strong> ${DOMPurify.sanitize(parsedSuggestion.level)}</p>` : ''}
            ${parsedSuggestion.grammar_focus ? `<p><strong>Grammar Focus:</strong> ${DOMPurify.sanitize(parsedSuggestion.grammar_focus)}</p>` : ''}
          </div>`;
        }
      } catch (e) {
        // Not JSON, use as is
      }
      
      setChatMessages(prev => [...prev, { 
        role: "assistant", 
        content: DOMPurify.sanitize(suggestion),
        meta: "suggestion",
        parsedData: parsedSuggestion // Store parsed data for easy access
      }]);
    } catch (err) {
      console.error("AI chat error", err);
      setChatMessages(prev => [...prev, { 
        role: "assistant", 
        content: "<i>AI tạm thời không phản hồi. Thử lại sau.</i>"
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleInsertSuggestion = (content) => {
    if (!content) return;
    
    // Try to parse JSON from AI response
    try {
      // Extract JSON from HTML if wrapped
      let jsonContent = content;
      const jsonMatch = content.match(/\{[\s\S]*"title"[\s\S]*"description"[\s\S]*\}/);
      if (jsonMatch) {
        jsonContent = jsonMatch[0];
      }
      
      // Try to parse as JSON
      const parsed = JSON.parse(jsonContent);
      
      if (parsed.title && parsed.description) {
        setEditing(prev => {
          if (!prev) {
            setMode("edit");
            return { 
              title: parsed.title, 
              description: DOMPurify.sanitize(parsed.description), 
              type: "speaking", 
              level: parsed.level || "medium" 
            };
          }
          return { 
            ...prev, 
            title: parsed.title || prev.title,
            description: DOMPurify.sanitize(parsed.description),
            level: parsed.level || prev.level
          };
        });
        return;
      }
    } catch (e) {
      // Not JSON, try to extract title from HTML
      const titleMatch = content.match(/<h3[^>]*>(.*?)<\/h3>/i);
      const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : "";
      
      // Extract description (everything after h3)
      let description = content;
      if (titleMatch) {
        description = content.substring(content.indexOf('</h3>') + 5);
      }
      
      // Remove wrapper divs
      description = description.replace(/<div[^>]*class="ai-suggestion"[^>]*>/i, '').replace(/<\/div>/i, '');
      
      const clean = DOMPurify.sanitize(description);
      setEditing(prev => {
        if (!prev) {
          setMode("edit");
          return { 
            title: title || "", 
            description: clean, 
            type: "speaking", 
            level: "medium" 
          };
        }
        const existing = prev.description || "";
        const merged = existing && existing.trim() ? `${existing}<p></p>${clean}` : clean;
        return { 
          ...prev, 
          title: title || prev.title,
          description: merged 
        };
      });
    }
  };

  const modules = {
    toolbar: [
      [{ header: [1, 2, false] }],
      ["bold", "italic", "underline"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["blockquote"],
      ["link"],
      ["clean"]
    ]
  };

  if (loading) {
    return <div className="challenge-creator"><div className="loading">Đang tải...</div></div>;
  }

  if (!mentorId) {
    return <div className="challenge-creator"><div className="error">Không tìm thấy mentor ID</div></div>;
  }

  return (
    <div className="challenge-creator">
      {mode === "list" ? (
        <>
          <div className="challenge-header">
            <h2>Challenge Creator</h2>
            <button className="btn-primary" onClick={openCreate}>
              <FiPlus /> Tạo challenge mới
            </button>
          </div>

          {/* AI Chat trong danh sách */}
          <div className="ai-chat-panel">
            <div className="chat-header">
              <FiMessageCircle /> AI Hỗ trợ tạo Challenge
            </div>
            <div 
              ref={chatScrollRef}
              className="chat-messages"
            >
              {chatMessages.length === 0 ? (
                <div className="chat-empty">Nhập yêu cầu để AI gợi ý nội dung challenge...</div>
              ) : (
                chatMessages.map((m, i) => (
                  <div key={i} className={`chat-message ${m.role}`}>
                    <strong>{m.role === "assistant" ? "AI" : "Bạn"}:</strong>
                    <div dangerouslySetInnerHTML={{ __html: m.content }} />
                    {m.meta === "suggestion" && (
                      <button 
                        className="btn-insert"
                        onClick={() => {
                          if (m.parsedData) {
                            // Use parsed data if available
                            setEditing(prev => {
                              if (!prev) {
                                setMode("edit");
                                return { 
                                  title: m.parsedData.title || "", 
                                  description: DOMPurify.sanitize(m.parsedData.description || ""), 
                                  type: "speaking", 
                                  level: m.parsedData.level || "medium" 
                                };
                              }
                              return { 
                                ...prev, 
                                title: m.parsedData.title || prev.title,
                                description: DOMPurify.sanitize(m.parsedData.description || ""),
                                level: m.parsedData.level || prev.level
                              };
                            });
                            setMode("edit");
                          } else {
                            handleInsertSuggestion(m.content);
                            setMode("edit");
                          }
                        }}
                      >
                        Tạo challenge với nội dung này
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="chat-input-container">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSendChat(); }}
                placeholder="Nhập yêu cầu trò chuyện với AI..."
                className="chat-input"
                disabled={chatLoading}
              />
              <button 
                className="btn-send"
                onClick={handleSendChat}
                disabled={chatLoading || !chatInput.trim()}
              >
                <FiSend />
              </button>
            </div>
          </div>

          {/* Danh sách challenges */}
          <div className="challenges-list">
            {challenges.length === 0 ? (
              <div className="empty-state">Chưa có challenge nào. Nhấn "Tạo challenge mới" để bắt đầu.</div>
            ) : (
              challenges.map(c => (
                <div key={c.id} className="challenge-card">
                  <div className="challenge-card-body" onClick={() => openEdit(c)}>
                    <h3>{c.title || "(Không tiêu đề)"}</h3>
                    <div className="challenge-meta">
                      <span className="level">{c.level}</span>
                      <span className="type">{c.type || "speaking"}</span>
                    </div>
                    <div 
                      className="challenge-preview"
                      dangerouslySetInnerHTML={{ 
                        __html: DOMPurify.sanitize(c.description || "").substring(0, 150) + "..." 
                      }} 
                    />
                  </div>
                  <div className="challenge-actions">
                    <button 
                      className="btn-edit"
                      onClick={() => openEdit(c)}
                      title="Chỉnh sửa"
                    >
                      <FiEdit />
                    </button>
                    <button 
                      className="btn-delete"
                      onClick={() => handleDelete(c.id)}
                      title="Xóa"
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
          <div className="editor-header">
            <h2>{editing?.id ? "Chỉnh sửa challenge" : "Tạo challenge mới"}</h2>
            <div className="editor-actions">
              <button onClick={closeEditor} className="btn-secondary">
                Hủy
              </button>
              <button onClick={handleSave} className="btn-primary" disabled={saveLoading}>
                {saveLoading ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>

          <div className="editor-layout">
            {/* Editor Panel */}
            <div className="editor-panel">
              <div className="editor-form">
                <div className="form-row">
                  <input
                    type="text"
                    placeholder="Tiêu đề challenge"
                    value={editing?.title || ""}
                    onChange={(e) => setEditing(prev => ({ ...prev, title: e.target.value }))}
                    className="form-input-title"
                  />
                  <select
                    value={editing?.level || "medium"}
                    onChange={(e) => setEditing(prev => ({ ...prev, level: e.target.value }))}
                    className="form-select-level"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div className="quill-container">
                  <ReactQuill
                    ref={quillRef}
                    value={editing?.description || ""}
                    onChange={(val) => setEditing(prev => ({ ...prev, description: val }))}
                    modules={modules}
                    theme="snow"
                    placeholder="Nội dung challenge..."
                  />
                </div>
              </div>
            </div>

            {/* AI Chat Panel */}
            <div className="ai-chat-panel-editor">
              <div className="chat-header">
                <FiMessageCircle /> AI Hỗ trợ
              </div>
              <div 
                ref={chatScrollRef}
                className="chat-messages"
              >
                {chatMessages.length === 0 ? (
                  <div className="chat-empty">Nhập yêu cầu để AI gợi ý nội dung...</div>
                ) : (
                  chatMessages.map((m, i) => (
                    <div key={i} className={`chat-message ${m.role}`}>
                      <strong>{m.role === "assistant" ? "AI" : "Bạn"}:</strong>
                      <div dangerouslySetInnerHTML={{ __html: m.content }} />
                      {m.meta === "suggestion" && (
                        <button 
                          className="btn-insert"
                          onClick={() => {
                            if (m.parsedData) {
                              // Use parsed data if available
                              setEditing(prev => {
                                if (!prev) {
                                  return { 
                                    title: m.parsedData.title || "", 
                                    description: DOMPurify.sanitize(m.parsedData.description || ""), 
                                    type: "speaking", 
                                    level: m.parsedData.level || "medium" 
                                  };
                                }
                                return { 
                                  ...prev, 
                                  title: m.parsedData.title || prev.title,
                                  description: DOMPurify.sanitize(m.parsedData.description || ""),
                                  level: m.parsedData.level || prev.level
                                };
                              });
                            } else {
                              handleInsertSuggestion(m.content);
                            }
                          }}
                        >
                          Chèn vào editor
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="chat-input-container">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSendChat(); }}
                  placeholder="Nhập yêu cầu trò chuyện với AI..."
                  className="chat-input"
                  disabled={chatLoading}
                />
                <button 
                  className="btn-send"
                  onClick={handleSendChat}
                  disabled={chatLoading || !chatInput.trim()}
                >
                  <FiSend />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

