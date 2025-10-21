// src/components/admin/MentorsList.jsx
import React, { useState, useEffect } from "react";
import Modal from "../common/Modal.jsx";

const MOCK_MENTORS = Array.from({ length: 18 }, (_, i) => ({
  id: i + 1,
  name: `Mentor ${i + 1}`,
  email: `mentor${i + 1}@example.com`,
  subjects: ["Pronunciation", "Conversation"][i % 2],
  active: i % 3 !== 0,
}));

export default function MentorsList() {
  const [mentors, setMentors] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 8;
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const filtered = MOCK_MENTORS.filter(
      (m) =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase())
    );
    const start = (page - 1) * perPage;
    setMentors(filtered.slice(start, start + perPage));
  }, [search, page]);

  const totalPages = Math.ceil(
    MOCK_MENTORS.filter(
      (m) =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase())
    ).length / perPage
  );

  return (
    <>
      <div className="panel">
        <h2>Danh sách Mentor</h2>

        <div className="toolbar">
          <input
            className="input"
            placeholder="Tìm theo tên hoặc email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <div>
            <button className="btn btn-ghost btn-small" onClick={() => alert("Tạo Mentor (demo)")}>
              ➕ Tạo Mentor
            </button>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên</th>
              <th>Email</th>
              <th>Chuyên môn</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {mentors.length === 0 ? (
              <tr>
                <td colSpan="6">Không tìm thấy mentor nào.</td>
              </tr>
            ) : (
              mentors.map((m) => (
                <tr key={m.id}>
                  <td>{m.id}</td>
                  <td>{m.name}</td>
                  <td>{m.email}</td>
                  <td>{m.subjects}</td>
                  <td>{m.active ? "✅" : "❌"}</td>
                  <td>
                    <button className="btn btn-ghost btn-small" onClick={() => setSelected(m)}>
                      ✏️
                    </button>
                    <button
                      className="btn btn-ghost btn-small"
                      onClick={() => alert(`Tắt/mở mentor ${m.id} (demo)`)}
                    >
                      {m.active ? "🔒" : "🔓"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="pagination">
          <button className="page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            ←
          </button>
          <span>Trang {page} / {totalPages || 1}</span>
          <button className="page-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
            →
          </button>
        </div>
      </div>

      {selected && (
        <Modal title="Chi tiết Mentor" onClose={() => setSelected(null)}>
          <p><strong>ID:</strong> {selected.id}</p>
          <p><strong>Tên:</strong> {selected.name}</p>
          <p><strong>Email:</strong> {selected.email}</p>
          <p><strong>Chuyên môn:</strong> {selected.subjects}</p>
        </Modal>
      )}
    </>
  );
}
