import React from "react";
import Modal from "../common/Modal.jsx";
import "../../styles/admin-packages.css";

export default function PackageEditor({ pkg, onClose, onSave }) {
  const [name, setName] = React.useState(pkg?.name || "");
  const [price, setPrice] = React.useState(pkg?.price || 0);
  const [description, setDescription] = React.useState(pkg?.description || "");

  function handleSave(e) {
    e.preventDefault();
    onSave?.({ ...pkg, name, price, description });
    onClose?.();
  }

  return (
    <Modal title={pkg ? "Chỉnh sửa gói" : "Tạo gói mới"} onClose={onClose}>
      <div className="package-editor">
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>Tên gói</label>
            <input 
              className="input" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Giá (VNĐ)</label>
            <input 
              className="input" 
              type="number" 
              value={price} 
              onChange={(e) => setPrice(Number(e.target.value))}
              required
              min="0"
            />
          </div>
          <div className="form-group">
            <label>Mô tả</label>
            <textarea 
              className="input" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              rows="4"
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn btn-primary">Lưu</button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
