// src/components/common/PDFPreview.jsx
import React, { useState, useEffect } from "react";
import { FiX } from "react-icons/fi";

export default function PDFPreview({ url, title, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [blobUrl, setBlobUrl] = useState(null);

  // Format URL - đảm bảo là absolute URL
  const fullUrl = url?.startsWith("/") 
    ? `${window.location.origin}${url}` 
    : url;

  useEffect(() => {
    setLoading(true);
    setError(false);
    
    // Fetch PDF as blob để tránh browser download
    const fetchPDF = async () => {
      try {
        const response = await fetch(fullUrl, {
          method: "GET",
          headers: {
            "Accept": "application/pdf"
          }
        });
        
        if (!response.ok) {
          throw new Error("Failed to load PDF");
        }
        
        // Kiểm tra content type
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/pdf")) {
          console.warn("Response is not PDF, content-type:", contentType);
        }
        
        const blob = await response.blob();
        
        // Đảm bảo blob là PDF
        if (blob.type !== "application/pdf") {
          // Force set type nếu server không set đúng
          const pdfBlob = new Blob([blob], { type: "application/pdf" });
          const blobUrl = URL.createObjectURL(pdfBlob);
          setBlobUrl(blobUrl);
        } else {
          const blobUrl = URL.createObjectURL(blob);
          setBlobUrl(blobUrl);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error loading PDF:", err);
        setError(true);
        setLoading(false);
      }
    };

    if (fullUrl) {
      fetchPDF();
    }

    // Cleanup blob URL khi unmount
    return () => {
      // Cleanup sẽ được xử lý trong useEffect riêng
    };
  }, [url, fullUrl]);

  // Cleanup blob URL khi component unmount hoặc url thay đổi
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  const handleEmbedLoad = () => {
    setLoading(false);
  };

  const handleEmbedError = () => {
    setLoading(false);
    setError(true);
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header - chỉ có nút đóng */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 16px",
        borderBottom: "1px solid #e0e0e0",
        background: "#fff",
        flexShrink: 0
      }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: "16px", 
          fontWeight: 600, 
          flex: 1, 
          overflow: "hidden", 
          textOverflow: "ellipsis", 
          whiteSpace: "nowrap" 
        }}>
          {title || "Xem tài liệu PDF"}
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              padding: 0,
              background: "transparent",
              border: "1px solid #e0e0e0",
              borderRadius: "6px",
              cursor: "pointer",
              marginLeft: "12px"
            }}
            title="Đóng"
          >
            <FiX size={18} />
          </button>
        )}
      </div>

      {/* PDF Content */}
      <div style={{
        flex: 1,
        position: "relative",
        background: "#525252",
        overflow: "hidden",
        minHeight: 0
      }}>
        {loading && (
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "white",
            fontSize: "14px",
            zIndex: 1
          }}>
            Đang tải PDF...
          </div>
        )}
        
        {error ? (
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            color: "white",
            padding: "20px"
          }}>
            <p>Không thể hiển thị PDF. Vui lòng thử lại sau.</p>
          </div>
        ) : blobUrl ? (
          <embed
            src={blobUrl}
            type="application/pdf"
            width="100%"
            height="100%"
            style={{
              border: "none",
              display: loading ? "none" : "block"
            }}
            onLoad={handleEmbedLoad}
            onError={handleEmbedError}
          />
        ) : null}
      </div>
    </div>
  );
}
