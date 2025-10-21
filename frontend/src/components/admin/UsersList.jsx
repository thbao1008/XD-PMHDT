import React, { useState, useEffect } from "react";
import Modal from "../common/Modal.jsx";

const MOCK_USERS = Array.from({ length: 42 }, (_, i) => ({
  id: i + 1,
  name: `Người dùng ${i + 1}`,
  email: `user${i + 1}@example.com`,
  role: i % 3 === 0 ? "admin" : i % 2 === 0 ? "mentor" : "learner",
}));

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    const filtered = MOCK_USERS.filter(
      (u) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );
    const start = (page - 1) * perPage;
    const end = start + perPage;
    setUsers(filtered.slice(start, end));
  }, [search, page, perPage]);

  const totalPages = Math.ceil(
    MOCK_USERS.filter(
      (u) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    ).length / perPage
  );

  return (
    <>
      <div className="panel">
        <h2>Danh sách Người dùng</h2>

        <div className="toolbar">
          <input
            type="text"
            className="input"
            placeholder="Tìm theo tên hoặc email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên</th>
              <th>Email</th>
              <th>Vai trò</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="5">Không tìm thấy người dùng nào.</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>
                    <button
                      className="btn-action"
                      onClick={() => setSelectedUser(user)}
                    >
                      👁️
                    </button>
                    <button className="btn-action">✏️</button>
                    <button className="btn-action">🗑️</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="pagination">
          <button
            className="page-btn"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ←
          </button>
          <span>
            Trang {page} / {totalPages}
          </span>
          <button
            className="page-btn"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            →
          </button>
        </div>
      </div>

      {selectedUser && (
        <Modal title="Thông tin người dùng" onClose={() => setSelectedUser(null)}>
          <p><strong>ID:</strong> {selectedUser.id}</p>
          <p><strong>Tên:</strong> {selectedUser.name}</p>
          <p><strong>Email:</strong> {selectedUser.email}</p>
          <p><strong>Vai trò:</strong> {selectedUser.role}</p>
        </Modal>
      )}
    </>
  );
}
