// src/components/mentor/ChallengeEditor.jsx
import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle
} from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import DOMPurify from "dompurify";
import api from "../../api";

const ChallengeEditor = forwardRef(({ topicId, onSaved, onOpen, onClose }, ref) => {
  const [challenges, setChallenges] = useState([]);
  const [mode, setMode] = useState("list"); // "list" | "edit"
  const [editing, setEditing] = useState(null);

  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // AI preview state for drafts
  const [aiPreview, setAiPreview] = useState(null); // { title, description, type, level }
  const [aiPreviewIssues, setAiPreviewIssues] = useState([]);

  const quillRef = useRef(null);

  useEffect(() => {
    fetchChallenges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId]);

  async function fetchChallenges() {
    if (!topicId) return;
    try {
      const res = await api.get(`/mentors/topics/${topicId}/challenges`);
      setChallenges(res.data?.challenges || res.data || []);
      console.log("fetchChallenges:", topicId, (res.data?.challenges || []).length);
    } catch (err) {
      console.error("Fetch challenges error", err);
      setChallenges([]);
    }
  }

  useImperativeHandle(ref, () => ({
    applySuggestion: (suggestion) => {
      // suggestion can be string (html) or object { title, description, ... }
      if (!suggestion) return;
      if (typeof suggestion === "string") {
        const clean = DOMPurify.sanitize(suggestion || "");
        setEditing(prev => {
          if (!prev) {
            onOpen && onOpen();
            setMode("edit");
            return { title: "", description: clean, type: "speaking", level: "medium" };
          }
          const existing = prev.description || "";
          const merged = existing && existing.trim() ? `${existing}<p></p>${clean}` : clean;
          return { ...prev, description: merged };
        });
      } else if (typeof suggestion === "object") {
        const cleanDesc = DOMPurify.sanitize(suggestion.description || "");
        setEditing(prev => ({
          ...(prev || { title: "", description: "", type: "speaking", level: "medium" }),
          id: suggestion.id,
          title: suggestion.title || prev?.title || "",
          description: cleanDesc,
          type: suggestion.type || prev?.type || "speaking",
          level: suggestion.level || prev?.level || "medium"
        }));
        setMode("edit");
        onOpen && onOpen();
      }
    },
    openCreate: () => openCreate(),
    closeEditor: () => closeEditor()
  }));

  function openCreate() {
    setEditing({ title: "", description: "", type: "speaking", level: "medium" });
    setMode("edit");
    onOpen && onOpen();
  }

  function openEdit(ch) {
    setEditing({ ...ch, type: ch.type || "speaking" });
    setMode("edit");
    onOpen && onOpen();
  }

  function closeEditor() {
    setMode("list");
    setEditing(null);
    setAiPreview(null);
    setAiPreviewIssues([]);
    onClose && onClose();
    fetchChallenges();
  }

  function isEmptyHtml(html) {
    if (!html) return true;
    const stripped = html.replace(/<[^>]*>/g, "").replace(/\s+/g, "").trim();
    return stripped.length === 0;
  }

  function getServerErrorMessage(err) {
    return err?.response?.data?.message || err?.response?.data?.error || err?.message || "Lỗi không xác định";
  }

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.title?.trim() || isEmptyHtml(editing.description)) {
      alert("Vui lòng nhập tiêu đề và nội dung.");
      return;
    }
    setLoading(true);
    try {
      const payload = { ...editing, type: "speaking" };
      let res;
      if (editing.id) {
        res = await api.put(`/mentors/challenges/${editing.id}`, payload);
      } else {
        res = await api.post(`/mentors/topics/${topicId}/challenges`, payload);
      }
      const saved = res.data?.challenge || res.data;
      onSaved && onSaved(saved);
      setMode("list");
      setEditing(null);
      setAiPreview(null);
      setAiPreviewIssues([]);
      await fetchChallenges();
      onClose && onClose();
    } catch (err) {
      console.error("Save challenge error", err);
      alert("Lưu thất bại: " + getServerErrorMessage(err));
    } finally {
      setLoading(false);
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
      alert("Xoá thất bại: " + getServerErrorMessage(err));
    }
  };
  const handleImproveWithAI = async () => {
    if (!editing) {
      alert("Vui lòng soạn nội dung trước khi nhờ AI cải thiện.");
      return;
    }
    const content = editing?.description || "";
    if (isEmptyHtml(content)) {
      alert("Nội dung đang rỗng.");
      return;
    }

    setAiLoading(true);
    setAiPreview(null);
    setAiPreviewIssues([]);

    try {
      if (editing?.id) {
        // Improve saved challenge and update DB
        const res = await api.put(`/mentors/challenges/${editing.id}/ai`, { content }, { timeout: 20000 });
        const improved = res.data?.challenge;
        const issues = res.data?.issues || [];
        if (!improved) throw new Error("Không nhận được challenge cải thiện từ AI");

        if (issues.length > 0) {
          const warningHtml = `<div style="border:1px solid #f5c6cb;background:#fff0f0;padding:10px;border-radius:6px;">
            <strong>Cảnh báo từ AI:</strong>
            <ul>${issues.map(i => `<li>${DOMPurify.sanitize(i)}</li>`).join("")}</ul>
          </div><p></p>`;
          setEditing(prev => ({
            ...prev,
            __issues: issues,
            title: improved.title || prev.title,
            description: DOMPurify.sanitize(warningHtml + (improved.description || prev.description)),
            type: improved.type || prev.type,
            level: improved.level || prev.level
          }));
          return;
        }

        setEditing(prev => ({
          ...prev,
          __issues: [],
          title: improved.title || prev.title,
          description: DOMPurify.sanitize(improved.description || prev.description),
          type: improved.type || prev.type,
          level: improved.level || prev.level
        }));

        await fetchChallenges();
        return;
      }

      // Draft preview path
      const res = await api.post(`/mentors/challenges/ai-improve`, { content }, { timeout: 20000 });
      const improved = res.data?.challenge || res.data;
      const issues = res.data?.issues || [];

      const preview = {
        title: improved.title || editing.title || "",
        description: DOMPurify.sanitize(improved.description || editing.description || ""),
        type: improved.type || editing.type || "speaking",
        level: improved.level || editing.level || "medium"
      };

      setAiPreview(preview);
      setAiPreviewIssues(issues || []);
    } catch (err) {
      console.error("Improve challenge AI error", err);
      alert("AI cải thiện thất bại: " + getServerErrorMessage(err));
    } finally {
      setAiLoading(false);
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

  return (
    <div style={{ width: "100%" }}>
      {mode === "list" ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3>Danh sách challenge</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={openCreate} className="btn-primary">+ Tạo challenge</button>
            </div>
          </div>

          <div style={{ border: "1px solid #eee", borderRadius: 6, maxHeight: "60vh", overflow: "auto" }}>
            {challenges.length === 0 ? (
              <div style={{ padding: 16, color: "#666" }}>Chưa có challenge nào</div>
            ) : (
              challenges.map(c => (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 12,
                    borderBottom: "1px solid #f5f5f5"
                  }}
                >
                  <div onClick={() => openEdit(c)} style={{ cursor: "pointer", flex: 1 }}>
                    <strong>{c.title || "(Không tiêu đề)"}</strong>
                    <div style={{ fontSize: 12, color: "#666" }}>{c.level} • {c.type || "speaking"}</div>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                    className="btn-danger"
                    title="Xoá challenge"
                    aria-label="Xoá challenge"
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #eee",
                      background: "#fff",
                      color: "#e53935",
                      cursor: "pointer"
                    }}
                  >
                    Xóa
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3>{editing?.id ? "Chỉnh sửa challenge" : "Soạn challenge"}</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleImproveWithAI}
                className="btn-secondary"
                disabled={aiLoading || isEmptyHtml(editing?.description)}
                title={editing?.id ? "Cải thiện challenge đã lưu bằng AI" : "Nhận bản cải thiện AI (preview) cho draft"}
              >
                {aiLoading ? "AI đang cải thiện..." : "Cải thiện bằng AI"}
              </button>
              <button onClick={handleSave} className="btn-primary" disabled={loading}>
                {loading ? "Đang lưu..." : "Lưu"}
              </button>
              <button onClick={() => { setMode("list"); setEditing(null); onClose && onClose(); }} className="btn-secondary">
                Hủy
              </button>
            </div>
          </div>

          {/* AI preview for drafts */}
          {aiPreview && (
            <div style={{ border: "1px solid #cce5ff", background: "#f0f8ff", padding: 12, borderRadius: 8, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong>Preview AI (bản cải thiện)</strong>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setEditing(prev => ({
                        ...(prev || { title: "", description: "", type: "speaking", level: "medium" }),
                        title: aiPreview.title,
                        description: aiPreview.description,
                        type: aiPreview.type,
                        level: aiPreview.level
                      }));
                      setAiPreview(null);
                      setAiPreviewIssues([]);
                    }}
                  >
                    Chấp nhận
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => { setAiPreview(null); setAiPreviewIssues([]); }}
                  >
                    Bỏ qua
                  </button>
                </div>
              </div>

              {aiPreviewIssues && aiPreviewIssues.length > 0 && (
                <div style={{ marginTop: 8, border: "1px solid #f5c6cb", background: "#fff0f0", padding: 8, borderRadius: 6 }}>
                  <strong>Cảnh báo từ AI:</strong>
                  <ul style={{ margin: 0 }}>
                    {aiPreviewIssues.map((it, idx) => <li key={idx}>{it}</li>)}
                  </ul>
                </div>
              )}

              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 600 }}>{aiPreview.title}</div>
                <div dangerouslySetInnerHTML={{ __html: aiPreview.description }} />
              </div>
            </div>
          )}

          {editing?.__issues && editing.__issues.length > 0 && (
            <div style={{ border: "1px solid #f5c6cb", background: "#fff0f0", padding: 10, borderRadius: 6, marginBottom: 8 }}>
              <strong>Cảnh báo từ AI:</strong>
              <ul style={{ margin: 0 }}>
                {editing.__issues.map((i, idx) => <li key={idx}>{i}</li>)}
              </ul>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
  <input
    style={{ flex: 1, padding: 8, fontSize: 16 }}
    placeholder="Tiêu đề challenge"
    value={editing?.title || ""}
    onChange={(e) => setEditing(prev => ({ ...prev, title: e.target.value }))}
  />

  <select
    value={editing?.level || "medium"}
    onChange={(e) => setEditing(prev => ({ ...prev, level: e.target.value }))}
    style={{ width: 140, padding: 8, borderRadius: 6 }}
  >
    <option value="easy">Easy</option>
    <option value="medium">Medium</option>
    <option value="hard">Hard</option>
  </select>
</div>


          <div style={{ border: "1px solid #e5e5e5", borderRadius: 8, overflow: "hidden" }}>
            <ReactQuill
              ref={quillRef}
              value={editing?.description || ""}
              onChange={(val) => setEditing(prev => ({ ...prev, description: val }))}
              modules={modules}
              theme="snow"
              style={{ height: 420 }}
              placeholder="Nội dung sẽ hiển thị ở đây. AI chỉ chèn khi bạn bấm chèn từ chat."
            />
          </div>

        </>
      )}
    </div>
  );
});

export default ChallengeEditor;
