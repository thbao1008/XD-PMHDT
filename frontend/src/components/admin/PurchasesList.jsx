import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import "../../styles/admin-purchase.css";

export default function PurchasesList({ learnerId }) {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchPhone, setSearchPhone] = useState("");
  const navigate = useNavigate();

  // Load purchases ban đầu
  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        let res;
        if (learnerId) {
          // Route đúng: /admin/purchases/:learnerId
          res = await api.get(`/admin/purchases/${learnerId}`);
        } else {
          res = await api.get("/admin/purchases");
        }
        setPurchases(res.data.purchases || []);
      } catch (err) {
        console.error("❌ Lỗi khi load purchases:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPurchases();
  }, [learnerId]);

  // Tự động tìm kiếm khi nhập (debounce)
  useEffect(() => {
    if (learnerId) return; // Không search nếu có learnerId

    const timeoutId = setTimeout(async () => {
      try {
        let res;
        if (searchPhone.trim()) {
          // Tìm kiếm với phone
          res = await api.get(`/admin/purchases?phone=${encodeURIComponent(searchPhone.trim())}`);
        } else {
          // Nếu xóa hết thì load lại tất cả
          res = await api.get("/admin/purchases");
        }
        setPurchases(res.data.purchases || []);
      } catch (err) {
        console.error("❌ Lỗi tìm kiếm:", err);
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(timeoutId);
  }, [searchPhone, learnerId]);

  if (loading) return <p>Đang tải dữ liệu...</p>;

  return (
    <div className="admin-purchase">
      <div className="admin-purchase-header">
        <h2>Danh sách gói học được đăng kí</h2>
        {!learnerId && (
          <div className="admin-purchase-search">
            <input
              type="text"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              placeholder="Tìm kiếm theo số điện thoại (tự động tìm khi nhập)..."
            />
          </div>
        )}
      </div>

      <div className="admin-purchase-table-container">
        <table className="admin-purchase-table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Gói học</th>
              <th>Tên</th>
              <th>SĐT</th>
              <th>Ngày mua</th>
              <th>Tình trạng</th>
              <th>Còn lại (ngày)</th>
              <th>Giá</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {purchases.length === 0 ? (
              <tr>
                <td colSpan="9" className="empty-state">
                  Không có purchase nào
                </td>
              </tr>
            ) : (
              purchases.map((p, idx) => (
                <tr key={p.purchase_id}>
                  <td>{idx + 1}</td>
                  <td>{p.package_name || "Chưa có gói"}</td>
                  <td>{p.learner_name}</td>
                  <td>{p.phone}</td>
                  <td>
                    {p.created_at
                      ? new Date(p.created_at).toLocaleDateString("vi-VN")
                      : "-"}
                  </td>
                  <td>
                    <span
                      className={`status-badge ${
                        p.status === "active"
                          ? "status-active"
                          : p.status === "paused"
                            ? "status-paused"
                            : "status-expired"
                      }`}
                    >
                      {p.status === "active"
                        ? "Còn hạn"
                        : p.status === "paused"
                          ? "Tạm ngưng"
                          : "Hết hạn"}
                    </span>
                  </td>
                  <td>{p.status === "paused" ? "-" : p.days_left || "0"}</td>
                  <td>
                    {p.price
                      ? p.price.toLocaleString("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        })
                      : "-"}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-view"
                        onClick={() =>
                          navigate(`/admin/purchases/${p.learner_id}`)
                        }
                      >
                        Xem
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
