import React from "react";
import Modal from "../common/Modal.jsx";

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
      <form onSubmit={handleSave} style={{ display: "grid", gap: 12 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 700 }}>Tên gói</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 700 }}>Giá</label>
          <input className="input" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 700 }}>Mô tả</label>
          <textarea className="input" style={{ height: 80 }} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Hủy</button>
          <button type="submit" className="btn btn-primary">Lưu</button>
        </div>
      </form>
    </Modal>
  );
}
