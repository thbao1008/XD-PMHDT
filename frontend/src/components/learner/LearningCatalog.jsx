import { useEffect, useState } from "react";
import { getAuth } from "../../utils/auth";
import api from "../../api";
import Modal from "../common/Modal";
import PDFPreview from "../common/PDFPreview";
import { normalizeVideoUrl } from "../../utils/apiHelpers";
import "../../styles/catalog.css";
import { FiFileText, FiVideo } from "react-icons/fi";

export default function LearningCatalog() {
  const auth = getAuth();

  const [learnerId, setLearnerId] = useState(null);
  const [mentorId, setMentorId] = useState(null);
  const [mentorName, setMentorName] = useState("");
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMentorName, setLoadingMentorName] = useState(true);
  const [selectedResource, setSelectedResource] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const userId = auth?.user?.id || auth?.user?._id || auth?.user?.user_id;

        // 1. Lấy learnerId từ userId
        const learnerRes = await api.get(`/learners/by-user/${userId}`);
        const lid = learnerRes.data?.learner?.id;
        setLearnerId(lid);
        if (!lid) {
          setLoading(false);
          setLoadingMentorName(false);
          return;
        }

        // 2. Lấy mentorId từ learnerId
        const mentorRes = await api.get(`/learners/${lid}/mentor`);
        const mid = mentorRes.data?.mentor_id;
        setMentorId(mid);
        if (!mid) {
          setLoading(false);
          setLoadingMentorName(false);
          return;
        }

        // 3 + 4. Lấy song song: thông tin giảng viên và tài liệu (chỉ lấy tài liệu đã publish)
        const [mentorInfo, res] = await Promise.all([
          api.get(`/mentors/${mid}`),
          api.get(`/mentors/${mid}/resources/published`)
        ]);

        // Tùy vào response BE, lấy đúng name:
        const nameFromMentorObj =
          mentorInfo.data?.mentor?.name ??
          mentorInfo.data?.name ?? // phòng trường hợp BE trả trực tiếp
          "";

        setMentorName(nameFromMentorObj);
        setResources(res.data?.resources || []);
      } catch (err) {
        console.error("Không thể tải kho tài liệu:", err);
      } finally {
        setLoading(false);
        setLoadingMentorName(false);
      }
    }

    if (auth?.user) load();
  }, [auth]);

  const filtered = resources.filter(r =>
    (r.title || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openPreview = (r) => setSelectedResource(r);

  return (
    <div className="learner-page">
      <h2>Kho tài liệu</h2>

      {mentorId === null ? (
        <p className="subtitle">Bạn chưa được gán giảng viên nào</p>
      ) : loadingMentorName ? (
        <p className="subtitle">Đang tải tên giảng viên...</p>
      ) : mentorName ? (
        <p className="subtitle">
          Tài liệu học tập của giảng viên: <strong>{mentorName}</strong>
        </p>
      ) : (
        <p className="subtitle">Không lấy được tên giảng viên</p>
      )}

      <input
        type="text"
        className="search-input"
        placeholder="Tìm kiếm theo tên tài liệu..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {loading ? (
        <p>Đang tải tài liệu...</p>
      ) : (
        <div className="resources-grid">
          {filtered.length === 0 ? (
            <div className="empty-state">Không tìm thấy tài liệu phù hợp</div>
          ) : (
            filtered.map((r) => (
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
