import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api";

export default function PurchasesPage() {
  const { id } = useParams();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPurchases = async () => {
      if (!id) return;
      try {
        const res = await api.get(`/admin/purchases/${id}`);
        setPurchases(res.data.purchases || []);
      } catch (err) {
        console.error("❌ Lỗi khi load purchases:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPurchases();
  }, [id]);

  if (loading) return <p>Đang tải dữ liệu...</p>;

  const learnerName =
    purchases.length > 0 ? purchases[0].learner_name : `Learner #${id}`;

  const handleRenewClick = (purchase) => {
    if (purchase.remaining_days > 0) {
      alert("❗Gói học vẫn chưa kết thúc, thử lại sau khi hết thời hạn của gói❗");
    } else {
      handleRenew(purchase.id);
    }
  };

  return (
    <div className="panel">
      <h2>Lịch sử Purchases của {learnerName}</h2>

      {/* Nút đổi gói toàn cục */}
      <div
        style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px" }}
      >
        <button onClick={() => handleChangePackageGlobal(id)}>Đổi gói</button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>STT</th>
            <th>Gói học</th>
            <th>Ngày tạo</th>
            <th>Trạng thái</th>
            <th>Còn lại (ngày)</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
  {purchases.length === 0 ? (
    <tr>
      <td colSpan="6">Không có purchase nào</td>
    </tr>
  ) : (
    purchases.map((p, idx) => (
      <tr key={p.purchase_id || p.id}>
        <td>{idx + 1}</td>
        <td>{p.package_name}</td>
        <td>{new Date(p.created_at).toLocaleDateString("vi-VN")}</td>
        {/* dùng package_status thay vì status */}
        <td>
          {p.package_status === "active" && "Còn hạn"}
          {p.package_status === "expired" && "Hết hạn"}
          {p.package_status === "paused" && "Tạm ngưng"}
          {p.package_status === "no_package" && "Chưa có gói"}
        </td>
        {/* dùng days_left thay vì remaining_days */}
        <td>{p.days_left !== null ? `${p.days_left} ngày` : "-"}</td>
        <td>
          <button onClick={() => handleRenewClick(p)}>Gia hạn</button>
        </td>
      </tr>
    ))
  )}
</tbody>

      </table>
    </div>
  );
}
