// src/components/common/Modal.jsx
import React from "react";
import ReactDOM from "react-dom";

export default function Modal({ title, children, onClose, size = "md" }) {
  return ReactDOM.createPortal(
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {title && <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12}}>
          <h3 style={{margin:0}}>{title}</h3>
          <button onClick={onClose} className="btn btn-ghost btn-small" aria-label="Close">✕</button>
        </div>}
        <div>{children}</div>
      </div>
    </div>,
    document.body
  );
}
