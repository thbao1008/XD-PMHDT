// src/components/common/PDFViewer.jsx
import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FiX, FiDownload } from "react-icons/fi";
import "../../styles/pdf-viewer.css";

export default function PDFViewer() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const pdfUrl = searchParams.get("url");
  const title = searchParams.get("title") || "Tài liệu PDF";

  if (!pdfUrl) {
    return (
      <div className="pdf-viewer-container">
        <div className="pdf-viewer-error">
          <p>Không tìm thấy tài liệu</p>
          <button onClick={() => navigate(-1)} className="btn-primary">
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  // Format URL - nếu là relative path thì thêm origin
  const fullUrl = pdfUrl.startsWith("/") 
    ? `${window.location.origin}${pdfUrl}` 
    : pdfUrl;

  return (
    <div className="pdf-viewer-container">
      <div className="pdf-viewer-header">
        <h2 className="pdf-viewer-title">{title}</h2>
        <div className="pdf-viewer-actions">
          <a
            href={fullUrl}
            download
            className="btn-download"
            title="Tải xuống"
          >
            <FiDownload size={18} />
            Tải xuống
          </a>
          <button
            onClick={() => navigate(-1)}
            className="btn-close"
            title="Đóng"
          >
            <FiX size={20} />
          </button>
        </div>
      </div>
      <div className="pdf-viewer-content">
        <iframe
          src={fullUrl}
          width="100%"
          height="100%"
          style={{ border: "none" }}
          title={title}
          type="application/pdf"
        />
      </div>
    </div>
  );
}

