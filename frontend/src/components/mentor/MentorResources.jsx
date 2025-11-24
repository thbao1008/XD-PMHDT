import { useEffect, useState } from "react";
import { getAuth } from "../../utils/auth";
import "../../styles/resources.css";
import api from "../../api";
import Modal from "../common/Modal";
import PDFPreview from "../common/PDFPreview";
import { normalizeVideoUrl } from "../../utils/apiHelpers";
import { FiFileText, FiVideo, FiPlus, FiX, FiEdit2, FiTrash2, FiEye, FiEyeOff } from "react-icons/fi";

export default function MentorResources() {
  const auth = getAuth();
  const [mentorId, setMentorId] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);

  useEffect(() => {
    async function fetchResources() {
      try {
        const userId = auth?.user?._id || auth?.user?.id || auth?.user?.user_id;
        const mentorRes = await api.get(`/mentors/by-user/${userId}`);
        const mid = mentorRes.data.mentor_id || mentorRes.data.id;
        setMentorId(mid);

        const res = await api.get(`/mentors/${mid}/resources`);
        setResources(res.data.resources || []);
      } catch (err) {
        console.error("❌ Error fetching resources:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchResources();
  }, [auth]);

  const refreshResources = async () => {
    if (!mentorId) return;
    try {
      const res = await api.get(`/mentors/${mentorId}/resources`);
      setResources(res.data.resources || []);
    } catch (err) {
      console.error("Error refreshing resources:", err);
    }
  };

  const openPreview = (resource, e) => {
    if (e) {
      e.stopPropagation();
    }
    setSelectedResource(resource);
  };

  const handleEdit = (resource, e) => {
    if (e) {
      e.stopPropagation();
    }
    setEditingResource(resource);
    setShowModal(true);
  };

  const handleDelete = async (resourceId, e) => {
    if (e) {
      e.stopPropagation();
    }
    if (!confirm("Bạn có chắc chắn muốn xóa tài liệu này?")) {
      return;
    }

    try {
      await api.delete(`/mentors/resources/${resourceId}`);
      await refreshResources();
    } catch (err) {
      console.error("Error deleting resource:", err);
      alert("Lỗi khi xóa tài liệu: " + (err.response?.data?.message || err.message));
    }
  };

  const handleToggleVisibility = async (resourceId, currentStatus, e) => {
    if (e) {
      e.stopPropagation();
    }
    try {
      await api.patch(`/mentors/resources/${resourceId}/visibility`, {
        is_published: !currentStatus
      });
      await refreshResources();
    } catch (err) {
      console.error("Error toggling visibility:", err);
      alert("Lỗi khi thay đổi trạng thái: " + (err.response?.data?.message || err.message));
    }
  };

  if (loading) return <p>Đang tải tài liệu...</p>;

  return (
    <div className="resources-page">
      <div className="resources-header">
        <h2>Tài liệu của tôi</h2>
        <button className="btn-primary" onClick={() => {
          setEditingResource(null);
          setShowModal(true);
        }}>
          <FiPlus style={{ marginRight: 6 }} /> Thêm tài liệu
        </button>
      </div>

      <div className="resources-grid">
        {resources.length === 0 ? (
          <div className="empty-state">Chưa có tài liệu nào được đăng tải</div>
        ) : (
          resources.map(r => (
            <div key={r.id} className="resource-card">
              <div className="resource-preview" onClick={() => openPreview(r)}>
                {r.type === "pdf" ? <FiFileText size={40} /> : <FiVideo size={40} />}
                {!r.is_published && (
                  <div className="hidden-badge">Đã ẩn</div>
                )}
              </div>
              <div className="resource-title" onClick={() => openPreview(r)}>{r.title}</div>
              <div className="resource-desc" onClick={() => openPreview(r)}>{r.description}</div>
              
              <div className="resource-actions">
                <button
                  className="btn-icon"
                  onClick={(e) => handleToggleVisibility(r.id, r.is_published, e)}
                  title={r.is_published ? "Ẩn tài liệu" : "Hiện tài liệu"}
                >
                  {r.is_published ? <FiEye size={16} /> : <FiEyeOff size={16} />}
                </button>
                <button
                  className="btn-icon"
                  onClick={(e) => handleEdit(r, e)}
                  title="Chỉnh sửa"
                >
                  <FiEdit2 size={16} />
                </button>
                <button
                  className="btn-icon btn-icon-danger"
                  onClick={(e) => handleDelete(r.id, e)}
                  title="Xóa"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <ResourceModal
          mentorId={mentorId}
          resource={editingResource}
          onClose={() => {
            setShowModal(false);
            setEditingResource(null);
          }}
          onSuccess={async () => {
            await refreshResources();
            setShowModal(false);
            setEditingResource(null);
          }}
        />
      )}

      {selectedResource && (
        <Modal 
          title={selectedResource.type === "pdf" ? null : selectedResource.title}
          onClose={() => setSelectedResource(null)}
          className={selectedResource.type === "pdf" ? "resource-preview-modal" : ""}
        >
          {selectedResource.type === "pdf" ? (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ flex: 1, minHeight: "600px" }}>
                <PDFPreview
                  url={selectedResource.file_url}
                  title={selectedResource.title}
                  onClose={() => setSelectedResource(null)}
                />
              </div>
              {selectedResource.description && (
                <p style={{ marginTop: "10px", flexShrink: 0, padding: "12px", background: "#f9fafb", borderRadius: "6px" }}>
                  {selectedResource.description}
                </p>
              )}
            </div>
          ) : selectedResource.type === "video" ? (
            <div>
              <video 
                src={normalizeVideoUrl(selectedResource.file_url)} 
                controls 
                width="100%" 
                style={{ 
                  maxHeight: "70vh",
                  borderRadius: "8px",
                  backgroundColor: "#000"
                }}
              />
              {selectedResource.description && (
                <p style={{ marginTop: "10px" }}>{selectedResource.description}</p>
              )}
            </div>
          ) : (
            <div>
              <p>Không thể xem trước tài liệu này.</p>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function ResourceModal({ mentorId, resource, onClose, onSuccess }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "pdf",
    file_url: ""
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (resource) {
      setForm({
        title: resource.title || "",
        description: resource.description || "",
        type: resource.type || "pdf",
        file_url: resource.file_url || ""
      });
    } else {
      setForm({
        title: "",
        description: "",
        type: "pdf",
        file_url: ""
      });
    }
    setSelectedFile(null);
  }, [resource]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Auto-detect type
    let detectedType = "pdf";
    if (file.type.startsWith("video/") || file.name.match(/\.(mp4|mov|avi)$/i)) {
      detectedType = "video";
    } else if (file.type === "application/pdf" || file.name.match(/\.pdf$/i)) {
      detectedType = "pdf";
    }

    setSelectedFile(file);
    setForm(prev => ({ ...prev, type: detectedType }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mentorId || isNaN(parseInt(mentorId))) {
      alert("mentorId không hợp lệ. Không thể gửi tài liệu.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("type", form.type);
      
      if (selectedFile) {
        formData.append("file", selectedFile);
      } else if (resource && form.file_url) {
        // Keep existing file_url if no new file selected
        formData.append("file_url", form.file_url);
      }

      if (resource) {
        // Update existing resource
        // Don't set Content-Type - Axios interceptor will handle it automatically for FormData
        await api.put(`/mentors/resources/${resource.id}`, formData, {
          timeout: 60000 // 60 seconds for large file uploads
        });
      } else {
        // Create new resource
        // Don't set Content-Type - Axios interceptor will handle it automatically for FormData
        await api.post(`/mentors/${mentorId}/resources`, formData, {
          timeout: 60000 // 60 seconds for large file uploads
        });
      }
      
      onSuccess();
    } catch (err) {
      console.error("❌ Error saving resource:", err);
      alert("Lỗi khi lưu tài liệu: " + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      title={resource ? "Chỉnh sửa tài liệu" : "Thêm tài liệu mới"}
      onClose={onClose}
    >
      <form className="modal-body" onSubmit={handleSubmit}>
        <label>Tiêu đề *</label>
        <input
          type="text"
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="Nhập tiêu đề tài liệu"
          required
        />

        <label>Mô tả</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Nhập mô tả tài liệu"
          rows={3}
        />

        <label>Tệp tài liệu {resource ? "(để trống nếu giữ nguyên)" : "*"}</label>
        <input 
          type="file" 
          accept=".pdf,.mp4,.mov,.avi" 
          onChange={handleFileSelect}
          required={!resource}
        />
        {selectedFile && (
          <div style={{ marginTop: "8px", fontSize: "13px", color: "#6b7280" }}>
            Đã chọn: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
          </div>
        )}
        {resource && !selectedFile && (
          <div style={{ marginTop: "8px", fontSize: "13px", color: "#6b7280" }}>
            File hiện tại: {resource.file_url?.split("/").pop() || "N/A"}
          </div>
        )}

        <label>Loại tài liệu</label>
        <select name="type" value={form.type} onChange={handleChange}>
          <option value="pdf">PDF</option>
          <option value="video">Video</option>
        </select>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={uploading}>
            Hủy
          </button>
          <button type="submit" className="btn-primary" disabled={uploading}>
            {uploading ? "Đang lưu..." : resource ? "Cập nhật" : "Thêm mới"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
