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
        const res = await api.get(`/admin/learners/${id}/purchases`);
        setPurchases(res.data.purchases || []);
      } catch (err) {
        console.error("❌ Lỗi khi load purchases:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPurchases();
  }, [id]);

  const handleRenew = async (purchaseId) => {
    try {
      await api.patch(`/admin/purchases/${purchaseId}/renew`, { extraDays: 30 });
      alert("✅ Gia hạn thành công");
      const res = await api.get(`/admin/learners/${id}/purchases`);
      setPurchases(res.data.purchases || []);
    } catch (err) {
      console.error("❌ Lỗi gia hạn:", err);
    }
  };

  const handleChangePackage = async (purchaseId) => {
    const newPackageId = prompt("Nhập ID gói mới:");
    if (!newPackageId) return;
    try {
      await api.patch(`/admin/purchases/${purchaseId}/change-package`, { newPackageId });
      alert("✅ Đổi gói thành công");
      const res = await api.get(`/admin/learners/${id}/purchases`);
      setPurchases(res.data.purchases || []);
    } catch (err) {
      console.error("❌ Lỗi đổi gói:", err);
    }
  };

  if (loading) return <p>Đang tải dữ liệu...</p>;


  const learnerName = purchases.length > 0 ? purchases[0].learner_name : `Learner #${id}`;

  return (
    <div className="panel">
      <h2>Lịch sử Purchases của {learnerName}</h2>
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
            purchases.map((p, idx) => {
              const expired = !p.remaining_days || p.remaining_days <= 0;
              const isLatest = idx === 0;
              return (
                <tr key={p.purchase_id}>
                  <td>{idx + 1}</td>
                  <td>{p.package_name}</td>
                  <td>{new Date(p.created_at).toLocaleDateString("vi-VN")}</td>
                  <td>{p.status}</td>
                  <td>{p.remaining_days ?? "-"}</td>
                  <td>
                    {isLatest && expired && (
                      <button onClick={() => handleRenew(p.purchase_id)}>Gia hạn</button>
                    )}
                    {isLatest && (
                      <button
                        disabled={!expired}
                        onClick={() => handleChangePackage(p.purchase_id)}
                      >
                        Đổi gói
                      </button>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
