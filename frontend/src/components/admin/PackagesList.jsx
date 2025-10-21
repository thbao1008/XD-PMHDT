// src/components/admin/PackagesList.jsx
import React, { useState, useEffect } from "react";
import { listPackages, createPackage, updatePackage, deletePackage } from "../../services/packageService";
import PackageEditor from "./PackageEditor.jsx";

export default function PackagesList() {
  const [packages, setPackages] = useState([]);
  const [q, setQ] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  async function load() {
    const all = await listPackages();
    setPackages(all);
  }

  useEffect(() => { load(); }, []);

  const filtered = packages.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.description.toLowerCase().includes(q.toLowerCase()));

  async function handleCreate(payload) {
    await createPackage(payload);
    setEditorOpen(false);
    load();
  }

  async function handleUpdate(payload) {
    await updatePackage(editing.id, payload);
    setEditing(null);
    setEditorOpen(false);
    load();
  }

  async function handleDelete(id) {
    if (!confirm("Xác nhận xóa gói?")) return;
    await deletePackage(id);
    load();
  }

  return (
    <>
      <div className="panel">
        <h2>Danh sách Gói học</h2>

        <div className="toolbar">
          <input className="input" placeholder="Tìm theo tên hoặc mô tả..." value={q} onChange={(e) => setQ(e.target.value)} />
          <div>
            <button className="btn btn-primary btn-small" onClick={() => { setEditing(null); setEditorOpen(true); }}>➕ Tạo gói mới</button>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên gói</th>
              <th>Mô tả</th>
              <th>Giá</th>
              <th>Thời hạn</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="7">Không tìm thấy gói học nào.</td></tr>
            ) : (
              filtered.map(pkg => (
                <tr key={pkg.id}>
                  <td>{pkg.id}</td>
                  <td>{pkg.name}</td>
                  <td>{pkg.description}</td>
                  <td>{Number(pkg.price).toLocaleString()}₫</td>
                  <td>{pkg.durationMonths} tháng</td>
                  <td>{pkg.active ? "✅" : "❌"}</td>
                  <td>
                    <button className="btn btn-ghost btn-small" onClick={() => { setEditing(pkg); setEditorOpen(true); }}>✏️</button>
                    <button className="btn btn-ghost btn-small" onClick={() => handleDelete(pkg.id)}>🗑️</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <PackageEditor
        open={editorOpen}
        onClose={() => { setEditorOpen(false); setEditing(null); }}
        initial={editing}
        onSaved={editing ? handleUpdate : handleCreate}
      />
    </>
  );
}
