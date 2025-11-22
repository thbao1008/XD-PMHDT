// src/components/admin/AdminCommunity.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiCheck, FiX, FiBookmark, FiEye, FiTrash2, FiArrowLeft } from "react-icons/fi";
import api from "../../api";
import Modal from "../common/Modal";
import "../../styles/admin-community.css";
import "../../styles/communicate.css"; // Import communicate styles for media preview

export default function AdminCommunity() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("pending"); // "pending" | "approved"
  const [pendingPosts, setPendingPosts] = useState([]);
  const [approvedPosts, setApprovedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedMedia, setSelectedMedia] = useState(null); // { url, type: 'image' | 'video' }

  useEffect(() => {
    loadPosts();
  }, [activeTab]);

  function isVideoUrl(url) {
    if (!url) return false;
    return /\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv)$/i.test(url);
  }

  function renderMedia(url) {
    if (!url) return null;
    
    if (isVideoUrl(url)) {
      return (
        <div className="media-preview" style={{ marginTop: "12px" }}>
          <video 
            src={url} 
            controls 
            style={{ 
              width: "100%", 
              maxHeight: "500px",
              borderRadius: "8px",
              display: "block"
            }}
            onError={(e) => {
              console.error("Error loading video:", url);
              e.target.style.display = "none";
            }}
          />
        </div>
      );
    } else {
      return (
        <div className="media-preview" style={{ marginTop: "12px" }}>
          <img 
            src={url} 
            alt="Post media" 
            style={{ 
              width: "100%", 
              maxHeight: "500px",
              borderRadius: "8px",
              objectFit: "contain",
              display: "block",
              cursor: "pointer"
            }} 
            onClick={() => setSelectedMedia({ url, type: 'image' })}
            onError={(e) => {
              console.error("Error loading image:", url);
              e.target.style.display = "none";
            }}
          />
        </div>
      );
    }
  }

  async function loadPosts() {
    try {
      setLoading(true);
      if (activeTab === "pending") {
        const response = await api.get("/community/posts/pending");
        setPendingPosts(response.data.posts || []);
      } else {
        const response = await api.get("/community/posts", {
          params: { page: 1, limit: 100 }
        });
        setApprovedPosts(response.data.posts || []);
      }
    } catch (err) {
      console.error("Error loading posts:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleReviewPost(postId, action) {
    try {
      if (action === "rejected") {
        if (!rejectionReason.trim()) {
          alert("Vui lòng nhập lý do từ chối");
          return;
        }
        await api.post(`/community/posts/${postId}/review`, {
          action: "rejected",
          rejectionReason
        });
        setShowRejectModal(false);
        setRejectionReason("");
      } else {
        await api.post(`/community/posts/${postId}/review`, {
          action: "approved"
        });
      }
      loadPosts();
    } catch (err) {
      console.error("Error reviewing post:", err);
      alert("Lỗi: " + (err.response?.data?.message || err.message));
    }
  }

  async function handleTogglePin(postId, isPinned) {
    try {
      await api.patch(`/community/posts/${postId}/pin`, { isPinned: !isPinned });
      loadPosts();
    } catch (err) {
      console.error("Error toggling pin:", err);
    }
  }

  async function handleDeletePost(postId) {
    if (!confirm("Bạn có chắc muốn xóa bài đăng này?")) return;
    try {
      await api.delete(`/community/posts/${postId}`);
      loadPosts();
    } catch (err) {
      console.error("Error deleting post:", err);
      alert("Lỗi: " + (err.response?.data?.message || err.message));
    }
  }

  const posts = activeTab === "pending" ? pendingPosts : approvedPosts;

  return (
    <div className="admin-community">
      <div className="admin-community-header">
        <h2>Cư Dân AESP</h2>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === "pending" ? "active" : ""}`}
          onClick={() => setActiveTab("pending")}
        >
          Chờ duyệt ({pendingPosts.length})
        </button>
        <button
          className={`tab ${activeTab === "approved" ? "active" : ""}`}
          onClick={() => setActiveTab("approved")}
        >
          Đã duyệt ({approvedPosts.length})
        </button>
      </div>

      {loading ? (
        <div className="loading">Đang tải...</div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <p>Không có bài đăng nào</p>
        </div>
      ) : (
        <div className="posts-list">
          {posts.map(post => (
            <div key={post.id} className={`post-review-card ${post.is_pinned ? "pinned" : ""}`}>
              {post.is_pinned && (
                <div className="post-pin-badge">
                  <FiBookmark /> Đã ghim
                </div>
              )}

              <div className="post-header">
                <div className="post-author">
                  <div className="author-avatar">
                    {post.author_name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div>
                    <div className="author-name">{post.author_name || "Người dùng"}</div>
                    <div className="post-meta">
                      {post.author_role} • {new Date(post.created_at).toLocaleDateString("vi-VN", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {post.title && <h3 className="post-title">{post.title}</h3>}
              
              <div className="post-content">
                {post.content && <p>{post.content}</p>}
                {post.audio_url && (
                  <audio controls src={post.audio_url} style={{ width: "100%", marginTop: "12px" }} />
                )}
                {post.image_url && renderMedia(post.image_url)}
              </div>

              {post.status === "rejected" && post.rejection_reason && (
                <div className="rejection-reason-box">
                  <strong>Lý do từ chối:</strong> {post.rejection_reason}
                </div>
              )}

              <div className="post-actions">
                {activeTab === "pending" ? (
                  <>
                    <button
                      className="btn-approve"
                      onClick={() => handleReviewPost(post.id, "approved")}
                    >
                      <FiCheck /> Duyệt
                    </button>
                    <button
                      className="btn-reject"
                      onClick={() => {
                        setSelectedPost(post);
                        setShowRejectModal(true);
                      }}
                    >
                      <FiX /> Từ chối
                    </button>
                    <button
                      className="btn-view"
                      onClick={() => setSelectedPost(post)}
                    >
                      <FiEye /> Xem chi tiết
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className={`btn-pin ${post.is_pinned ? "pinned" : ""}`}
                      onClick={() => handleTogglePin(post.id, post.is_pinned)}
                    >
                      <FiBookmark /> {post.is_pinned ? "Bỏ ghim" : "Ghim"}
                    </button>
                    <button
                      className="btn-view"
                      onClick={() => setSelectedPost(post)}
                    >
                      <FiEye /> Xem chi tiết
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeletePost(post.id)}
                    >
                      <FiTrash2 /> Xóa
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setRejectionReason("");
          setSelectedPost(null);
        }}
        title="Từ chối bài đăng"
      >
        <div className="reject-form">
          <label>Lý do từ chối:</label>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Nhập lý do từ chối bài đăng này..."
            rows={4}
          />
          <div className="reject-form-actions">
            <button
              className="btn-cancel"
              onClick={() => {
                setShowRejectModal(false);
                setRejectionReason("");
                setSelectedPost(null);
              }}
            >
              Hủy
            </button>
            <button
              className="btn-reject"
              onClick={() => selectedPost && handleReviewPost(selectedPost.id, "rejected")}
            >
              Xác nhận từ chối
            </button>
          </div>
        </div>
      </Modal>

      {/* Post Detail Modal */}
      <Modal
        isOpen={!!selectedPost && !showRejectModal}
        onClose={() => setSelectedPost(null)}
        title={selectedPost ? `Chi tiết bài đăng: ${selectedPost.title || "Không có tiêu đề"}` : ""}
      >
        {selectedPost && (
          <div className="post-detail">
            <div className="post-author">
              <div className="author-avatar">
                {selectedPost.author_name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div>
                <div className="author-name">{selectedPost.author_name}</div>
                <div className="post-meta">
                  {selectedPost.author_role} • {new Date(selectedPost.created_at).toLocaleDateString("vi-VN")}
                </div>
              </div>
            </div>
            <div className="post-content">
              {selectedPost.content && <p>{selectedPost.content}</p>}
              {selectedPost.audio_url && (
                <audio controls src={selectedPost.audio_url} style={{ width: "100%" }} />
              )}
              {selectedPost.image_url && renderMedia(selectedPost.image_url)}
            </div>
            <div className="post-stats">
              <span>❤️ {selectedPost.likes_count || 0} lượt thích</span>
              <span>💬 {selectedPost.comments_count || 0} bình luận</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Media Modal for fullscreen view */}
      {selectedMedia && (
        <Modal
          title={null}
          onClose={() => setSelectedMedia(null)}
          className="media-fullscreen-modal"
        >
          {selectedMedia.type === 'image' ? (
            <img 
              src={selectedMedia.url} 
              alt="Fullscreen" 
              style={{ 
                maxWidth: "95vw", 
                maxHeight: "95vh", 
                objectFit: "contain",
                display: "block",
                margin: "0 auto"
              }}
            />
          ) : (
            <video 
              src={selectedMedia.url} 
              controls 
              style={{ 
                maxWidth: "95vw", 
                maxHeight: "95vh",
                display: "block",
                margin: "0 auto"
              }}
            />
          )}
        </Modal>
      )}
    </div>
  );
}

