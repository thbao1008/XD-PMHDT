import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";

export default function PurchasesList({ learnerId }) {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchPhone, setSearchPhone] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        let res;
        if (learnerId) {
          res = await api.get(`/admin/learners/${learnerId}/purchases`);
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

  const handleSearch = async () => {
    if (!searchPhone.trim()) return;
    try {
      const res = await api.get(`/admin/purchases?phone=${searchPhone}`);
      setPurchases(res.data.purchases || []);
    } catch (err) {
      console.error("❌ Lỗi tìm kiếm:", err);
    }
  };

  if (loading) return <p>Đang tải dữ liệu...</p>;

  return (
    <div className="panel">
      <h2>Danh sách gói học được đăng kí</h2>
      {!learnerId && (
        <div className="toolbar">
          <input
            value={searchPhone}
            onChange={(e) => setSearchPhone(e.target.value)}
            placeholder="Nhập số điện thoại"
          />
          <button onClick={handleSearch}>Tìm kiếm</button>
        </div>
      )}
      <table className="table">
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
          {purchases.map((p, idx) => (
            <tr key={p.purchase_id}>
              <td>{idx + 1}</td>
              <td>{p.package_name}</td>
              <td>{p.learner_name}</td>
              <td>{p.phone}</td>
              <td>{new Date(p.created_at).toLocaleDateString("vi-VN")}</td>
              <td>
                {p.status === "active"
                  ? "Còn hạn"
                  : p.status === "paused"
                    ? "Tạm ngưng"
                    : "Hết hạn"}
              </td>
              <td>{p.status === "paused" ? "-" : p.days_left}</td>
              <td>
                {p.price
                  ? p.price.toLocaleString("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    })
                  : "-"}
              </td>
              <td>
                <button
                  onClick={() =>
                    navigate(`/admin/learners/${p.learner_id}/purchases`)
                  }
                >
                  Xem
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
