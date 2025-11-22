import React, { useState, useEffect } from "react";
import Modal from "../common/Modal.jsx";

export default function SupportTickets() {
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/admin/support");
      const data = await res.json();
      const sorted = (data.requests || []).sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      setTickets(sorted);
    } catch (err) {
      console.error("Lỗi lấy support requests:", err);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const markResolved = async (id) => {
    try {
      const res = await fetch(`/api/admin/support/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      });
      if (res.ok) {
        alert("✅ Đã đánh dấu yêu cầu là 'Đã hỗ trợ'");
        fetchTickets();
      } else {
        alert("❌ Có lỗi khi cập nhật trạng thái");
      }
    } catch (err) {
      console.error("Lỗi PATCH:", err);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const searchLower = search.toLowerCase().trim();
    const matchSearch = !searchLower ||
      t.name?.toLowerCase().includes(searchLower) ||
      t.email?.toLowerCase().includes(searchLower) ||
      t.phone?.toLowerCase().includes(searchLower) ||
      t.note?.toLowerCase().includes(searchLower);

    const matchStatus =
      filter === "all" ? true : t.status?.toLowerCase() === filter;

    return matchSearch && matchStatus;
  });

  return (
    <>
      <div className="panel">
        <h2>Hỗ trợ / Yêu cầu</h2>

        <div style={{ marginBottom: 12, display: "flex", gap: 12 }}>
          <input
            className="input"
            placeholder="Tìm theo tên, email, số điện thoại hoặc ghi chú..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Tất cả</option>
            <option value="pending">Chưa xử lý</option>
            <option value="resolved">Đã hỗ trợ</option>
          </select>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Họ tên</th>
              <th>Email</th>
              <th>SĐT</th>
              <th>Ghi chú</th>
              <th>Trạng thái</th>
              <th>Ngày</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map((t) => (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td>{t.name}</td>
                <td>{t.email}</td>
                <td>{t.phone}</td>
                <td>{t.note}</td>
                <td>{t.status}</td>
                <td>{new Date(t.created_at).toLocaleString()}</td>
                <td>
                  <button
                    className="btn btn-ghost btn-small"
                    onClick={() => setSelected(t)}
                  >
                    Xem
                  </button>
                  {t.status !== "resolved" && (
                    <button
                      className="btn btn-primary btn-small"
                      onClick={() => markResolved(t.id)}
                    >
                      Đã hỗ trợ
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <Modal
          title={`Yêu cầu #${selected.id}`}
          onClose={() => setSelected(null)}
        >
          <p><strong>Họ tên:</strong> {selected.name}</p>
          <p><strong>Email:</strong> {selected.email}</p>
          <p><strong>SĐT:</strong> {selected.phone}</p>
          <p><strong>Trạng thái:</strong> {selected.status}</p>
          <p style={{ whiteSpace: "pre-wrap" }}>{selected.note}</p>
          <div style={{ marginTop: 12, textAlign: "right" }}>
            <button
              className="btn btn-ghost btn-small"
              onClick={() => setSelected(null)}
            >
              Đóng
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
