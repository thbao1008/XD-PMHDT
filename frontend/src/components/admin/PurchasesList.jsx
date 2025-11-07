import React, { useEffect, useState } from "react";
import api from "../../api";
import Modal from "../common/Modal.jsx";

export default function PurchasesList() {
  const [purchases, setPurchases] = useState([]);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [userId, setUserId] = useState("");
  const [packageId, setPackageId] = useState("");

  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const res = await api.get("/admin/purchases");
        setPurchases(res.data.purchases || []);
      } catch (err) {
        console.error("❌ Lỗi khi load purchases:", err);
      }
    };
    fetchPurchases();
  }, []);

  return (
    <div className="panel">
      <h2>Lịch sử mua hàng</h2>

      {/* ✅ Nút tạo gói mới */}
      <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
        + Tạo gói mới
      </button>

      <table className="table">
        <thead>
          <tr>
            <th>Tên</th>
            <th>SĐT</th>
            <th>Gói học</th>
            <th>Trạng thái</th>
            <th>Ngày mua</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {purchases.map((p) => (
            <tr key={p.id}>
              <td>{p.user_name}</td>
              <td>{p.user_phone}</td>
              <td>{p.package_name}</td>
              <td style={{ color: p.remaining_days <= 0 ? "red" : "green" }}>
                {p.remaining_days <= 0 ? "Hết hạn" : "Còn hạn"}
              </td>
              <td>{new Date(p.created_at).toLocaleString("vi-VN")}</td>
              <td>
                <button onClick={() => setSelectedPurchase(p)}>
                  Xem chi tiết
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ✅ Modal chi tiết đơn hàng */}
      {selectedPurchase && (
        <Modal title="Chi tiết đơn hàng" onClose={() => setSelectedPurchase(null)}>
          <p><strong>Tên:</strong> {selectedPurchase.user_name}</p>
          <p><strong>SĐT:</strong> {selectedPurchase.user_phone}</p>
          <p><strong>Gói hiện tại:</strong> {selectedPurchase.package_name}</p>
          <p>
            <strong>Trạng thái:</strong>{" "}
            <span style={{ color: selectedPurchase.remaining_days <= 0 ? "red" : "green" }}>
              {selectedPurchase.remaining_days <= 0 ? "Hết hạn" : "Còn hạn"}
            </span>
          </p>
          <p><strong>Ngày mua:</strong> {new Date(selectedPurchase.created_at).toLocaleString("vi-VN")}</p>

          {/* ✅ Thao tác */}
          {selectedPurchase.remaining_days <= 0 ? (
            <div>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  await api.patch(`/admin/purchases/${selectedPurchase.id}/renew`, { extraDays: 30 });
                  alert("Gia hạn thành công!");
                }}
              >
                Gia hạn thêm 30 ngày
              </button>

              <button
                className="btn btn-secondary"
                onClick={async () => {
                  await api.patch(`/admin/purchases/${selectedPurchase.id}/change-package`, { newPackageId: 2 });
                  alert("Đổi gói thành công!");
                }}
              >
                Đổi sang gói khác
              </button>
            </div>
          ) : (
            <p>⏳ Gói còn hạn, chưa thao tác được</p>
          )}
        </Modal>
      )}

      {/* ✅ Modal tạo gói mới */}
      {showCreate && (
        <Modal title="Tạo gói mới" onClose={() => setShowCreate(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await api.post("/admin/purchases", { userId, packageId });
              alert("Tạo gói mới thành công!");
              setShowCreate(false);
            }}
          >
            <label>User ID</label>
            <input value={userId} onChange={(e) => setUserId(e.target.value)} />

            <label>Package ID</label>
            <input value={packageId} onChange={(e) => setPackageId(e.target.value)} />

            <button type="submit" className="btn btn-primary">Tạo</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
