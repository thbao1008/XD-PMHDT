// src/components/admin/SupportTickets.jsx
import React, { useState } from "react";
import Modal from "../common/Modal.jsx";

const MOCK_TICKETS = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  user: `user${i + 10}@example.com`,
  subject: `Yêu cầu hỗ trợ #${i + 1}`,
  message: `Nội dung yêu cầu hỗ trợ mẫu ${i + 1}`,
  status: i % 3 === 0 ? "Open" : "Closed",
  createdAt: new Date(Date.now() - i * 3600 * 1000).toLocaleString(),
}));

export default function SupportTickets() {
  const [tickets] = useState(MOCK_TICKETS);
  const [selected, setSelected] = useState(null);

  return (
    <>
      <div className="panel">
        <h2>Hỗ trợ / Tickets</h2>
        <div style={{ marginBottom: 12 }}>
          <input className="input" placeholder="Tìm theo subject hoặc user..." />
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Tiêu đề</th>
              <th>Trạng thái</th>
              <th>Ngày</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map(t => (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td>{t.user}</td>
                <td>{t.subject}</td>
                <td>{t.status}</td>
                <td>{t.createdAt}</td>
                <td>
                  <button className="btn btn-ghost btn-small" onClick={() => setSelected(t)}>Xem</button>
                  <button className="btn btn-ghost btn-small" onClick={() => alert("Đánh dấu đã xử lý (demo)")}>Đã xử lý</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <Modal title={`Ticket #${selected.id}`} onClose={() => setSelected(null)}>
          <p><strong>User:</strong> {selected.user}</p>
          <p><strong>Tiêu đề:</strong> {selected.subject}</p>
          <p><strong>Trạng thái:</strong> {selected.status}</p>
          <p style={{ whiteSpace: "pre-wrap" }}>{selected.message}</p>
          <div style={{ marginTop: 12, textAlign: "right" }}>
            <button className="btn btn-ghost btn-small" onClick={() => alert("Gửi phản hồi (demo)")}>Trả lời</button>
            <button style={{ marginLeft: 8 }} className="btn btn-primary btn-small" onClick={() => { alert("Đóng ticket (demo)"); setSelected(null); }}>Đóng</button>
          </div>
        </Modal>
      )}
    </>
  );
}
