import { useEffect, useState } from "react";
import { getAuth } from "../../utils/auth";
import "../../styles/mentor.css";
import api from "../../api";
import Modal from "../common/Modal";
import { FiFileText, FiVideo, FiPlus, FiX } from "react-icons/fi";

export default function MentorResources() {
  const auth = getAuth();
  const [mentorId, setMentorId] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
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

  const openPreview = (resource) => {
    setSelectedResource(resource);
  };

  if (loading) return <p>Đang tải tài liệu...</p>;

  return (
    <div className="resources-page">
      <div className="resources-header">
        <h2>Tài liệu của mentor</h2>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <FiPlus style={{ marginRight: 6 }} /> Thêm tài liệu
        </button>
      </div>

      <div className="resources-grid">
        {resources.length === 0 ? (
          <div className="empty-state">Chưa có tài liệu nào được đăng tải</div>
        ) : (
          resources.map(r => (
            <div key={r.id} className="resource-card" onClick={() => openPreview(r)}>
              <div className="resource-preview">
                {r.type === "pdf" ? <FiFileText size={40} /> : <FiVideo size={40} />}
              </div>
              <div className="resource-title">{r.title}</div>
              <div className="resource-desc">{r.description}</div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <ResourceModal
          mentorId={mentorId}
          onClose={() => setShowModal(false)}
          onCreated={async () => {
            const res = await api.get(`/mentors/${mentorId}/resources`);
            setResources(res.data.resources || []);
            setShowModal(false);
          }}
        />
      )}

      {selectedResource && (
        <Modal title={selectedResource.title} onClose={() => setSelectedResource(null)}>
          <div style={{ textAlign: "right", marginBottom: "10px" }}>
            <button
              onClick={() => window.open(selectedResource.file_url, "_blank")}
              className="btn-zoom"
            >
              🔍 Phóng to
            </button>
          </div>

          {selectedResource.type === "pdf" ? (
            <iframe
              src={selectedResource.file_url}
              width="100%"
              height="600px"
              style={{ border: "none" }}
              title="Xem tài liệu PDF"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          ) : selectedResource.type === "video" ? (
            <video src={selectedResource.file_url} controls width="100%" />
          ) : (
            <p>Không hỗ trợ định dạng này</p>
          )}

          <p style={{ marginTop: "10px" }}>{selectedResource.description}</p>
        </Modal>
      )}
    </div>
  );
}

function ResourceModal({ mentorId, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "pdf",
    file_url: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ["application/pdf", "video/mp4"];
    if (!allowedTypes.includes(file.type)) {
      alert("Chỉ được upload file PDF hoặc MP4");
      return;
    }

    // Giả lập upload
    const fakeUrl = `https://files.example.com/${file.name}`;
    setForm(prev => ({ ...prev, file_url: fakeUrl }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mentorId || isNaN(parseInt(mentorId))) {
      alert("mentorId không hợp lệ. Không thể gửi tài liệu.");
      return;
    }

    try {
      await api.post(`/mentors/${mentorId}/resources`, form);
      onCreated();
    } catch (err) {
      console.error("❌ Error creating resource:", err);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h3>Thêm tài liệu mới</h3>
          <button className="btn-close" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <label>Tiêu đề</label>
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
          />

          <label>Tệp tài liệu (PDF hoặc MP4)</label>
          <input type="file" accept=".pdf,.mp4" onChange={handleFileUpload} />

          <label>Loại tài liệu</label>
          <select name="type" value={form.type} onChange={handleChange}>
            <option value="pdf">PDF</option>
            <option value="video">Video</option>
          </select>

          <div className="modal-actions">
            <button type="submit" className="btn-primary">Lưu</button>
            <button type="button" className="btn-secondary" onClick={onClose}>Hủy</button>
          </div>
        </form>
      </div>
    </div>
  );
}
