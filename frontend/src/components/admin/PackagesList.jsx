import React, { useEffect, useState } from "react";
import api from "../../api";
import Modal from "../common/Modal.jsx";
import { FiPlus, FiTrash2, FiEdit } from "react-icons/fi";

export default function PackagesList() {
  const [packages, setPackages] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [durationDays, setDurationDays] = useState("");

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      const res = await api.get("/admin/packages");
      setPackages(Array.isArray(res.data) ? res.data : res.data.packages || []);
    } catch (err) {
      console.error("❌ Lỗi load packages:", err);
    }
  };

  const resetForm = () => {
    setName(""); setPrice(""); setOriginalPrice(""); setDurationDays("");
    setEditing(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: String(name).trim(),
      price: Number(price),
      originalPrice: Number(originalPrice),
      durationDays: Number(durationDays)
    };

    if (!payload.name || !payload.price || !payload.durationDays) {
      alert("Vui lòng nhập đủ thông tin gói học.");
      return;
    }

    try {
      if (editing) {
        await api.put(`/admin/packages/${editing.id}`, payload);
      } else {
        await api.post("/admin/packages", payload);
      }
      setShowModal(false);
      resetForm();
      loadPackages();
    } catch (err) {
      console.error("❌ Lỗi lưu package:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa gói học này?")) return;
    try {
      await api.delete(`/admin/packages/${id}`);
      setPackages((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("❌ Lỗi xóa package:", err);
    }
  };

  return (
    <div className="panel">
      <h2>Danh sách Gói học</h2>
      <button className="btn btn-primary" onClick={() => { setShowModal(true); resetForm(); }}>
        <FiPlus /> Thêm gói học
      </button>

      <table className="table">
        <thead>
          <tr>
            <th>STT</th>
            <th>Tên gói</th>
            <th>Giá gốc</th>
            <th>Giá bán</th>
            <th>Thời hạn (ngày)</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {packages.length === 0 ? (
            <tr><td colSpan="6">Chưa có gói học nào.</td></tr>
          ) : (
            packages.map((pkg, i) => (
              <tr key={pkg.id}>
                <td>{i + 1}</td>
                <td>{pkg.name}</td>
                <td>{pkg.original_price ? pkg.original_price.toLocaleString() + " đ" : "-"}</td>
                <td>{pkg.price.toLocaleString()} đ</td>
                <td>{pkg.duration_days}</td>
                <td>
                  <button className="btn-action" onClick={() => {
                    setEditing(pkg);
                    setName(pkg.name);
                    setPrice(pkg.price);
                    setOriginalPrice(pkg.original_price);
                    setDurationDays(pkg.duration_days);
                    setShowModal(true);
                  }}>
                    <FiEdit />
                  </button>
                  <button className="btn-action delete" onClick={() => handleDelete(pkg.id)}>
                    <FiTrash2 />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {showModal && (
        <Modal title={editing ? "Sửa gói học" : "Tạo gói học"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="form-grid">
            <div className="form-group">
              <label>Tên gói</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Giá gốc (VNĐ)</label>
              <input type="number" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Giá bán (VNĐ)</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Thời hạn (ngày)</label>
              <input type="number" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} required />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
              <button type="submit" className="btn btn-primary">{editing ? "Cập nhật" : "Tạo"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
