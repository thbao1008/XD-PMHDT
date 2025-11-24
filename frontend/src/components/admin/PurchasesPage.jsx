import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import api from "../../api";
import "../../styles/admin-purchase.css";

export default function PurchasesPage() {
  const { id } = useParams(); // Route param từ /admin/learners/:id/purchases
  const [searchParams] = useSearchParams(); // Query param từ /admin/purchases?learnerId=...
  const learnerId = id || searchParams.get("learnerId"); // Ưu tiên route param, fallback query param
  
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showChangePackageModal, setShowChangePackageModal] = useState(false);
  const [packages, setPackages] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState(null);

  useEffect(() => {
    const fetchPurchases = async () => {
      if (!learnerId) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get(`/admin/purchases/${learnerId}`);
        setPurchases(res.data.purchases || []);
      } catch (err) {
        console.error("❌ Lỗi khi load purchases:", err);
        if (err.response?.status === 404) {
          console.error("❌ Route không tồn tại hoặc learnerId không hợp lệ:", learnerId);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPurchases();
  }, [learnerId]);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const res = await api.get("/admin/packages/public");
        setPackages(Array.isArray(res.data) ? res.data : (res.data.packages || []));
      } catch (err) {
        console.error("❌ Lỗi khi load packages:", err);
      }
    };
    fetchPackages();
  }, []);


  const handleRenew = async (purchaseId) => {
    try {
      const res = await api.patch(`/admin/purchases/${purchaseId}/renew`);
      if (res.data.success) {
        alert(res.data.message || "Gia hạn thành công");
        // Refresh purchases
        const refreshRes = await api.get(`/admin/purchases/${learnerId}`);
        setPurchases(refreshRes.data.purchases || []);
      }
    } catch (err) {
      console.error("❌ Lỗi gia hạn:", err);
      alert("Có lỗi xảy ra khi gia hạn");
    }
  };

  const handleChangePackage = async () => {
    if (!selectedPackageId) {
      alert("Vui lòng chọn gói học");
      return;
    }
    try {
      const res = await api.post("/admin/purchases/change-package", {
        learnerId: learnerId,
        newPackageId: selectedPackageId,
      });
      if (res.data.success) {
        alert(res.data.message || "Đổi gói thành công");
        setShowChangePackageModal(false);
        setSelectedPackageId(null);
        // Refresh purchases
        const refreshRes = await api.get(`/admin/purchases/${learnerId}`);
        setPurchases(refreshRes.data.purchases || []);
      }
    } catch (err) {
      console.error("❌ Lỗi đổi gói:", err);
      alert("Có lỗi xảy ra khi đổi gói");
    }
  };

  if (loading) return <p>Đang tải dữ liệu...</p>;

  const learnerName = purchases.length > 0 ? purchases[0].learner_name : `Learner #${learnerId}`;

  // Tìm gói gần nhất vừa hết (gói đầu tiên có status expired và days_left <= 0)
  // QUAN TRỌNG: Dùng purchase_status từ bảng purchases, không phải package_status
  const latestExpiredPurchase = purchases.find(
    (p) => p.purchase_status === "expired" && (p.days_left === null || p.days_left <= 0)
  );

  // Kiểm tra xem có gói nào đang active không
  const hasActivePackage = purchases.some((p) => p.purchase_status === "active" && (p.days_left === null || p.days_left > 0));

  return (
    <div className="admin-purchase">
      <div className="admin-purchase-header">
        <h2>Lịch sử Purchases của {learnerName}</h2>
      </div>

      <div className="admin-purchase-actions">
        <button
          className="btn-change-package"
          onClick={() => setShowChangePackageModal(true)}
          disabled={hasActivePackage}
        >
          Đổi gói
        </button>
      </div>

      <div className="admin-purchase-table-container">
        <table className="admin-purchase-table">
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
                <td colSpan="6" className="empty-state">
                  Không có purchase nào
                </td>
              </tr>
            ) : (
              purchases.map((p, idx) => {
                const isLatestExpired = latestExpiredPurchase && p.purchase_id === latestExpiredPurchase.purchase_id;
                const canRenew = isLatestExpired && !hasActivePackage;
                const canChangePackage = !hasActivePackage;

                return (
                  <tr key={p.purchase_id || p.id}>
                    <td>{idx + 1}</td>
                    <td>{p.package_name || "Chưa có gói"}</td>
                    <td>
                      {p.created_at
                        ? new Date(p.created_at).toLocaleDateString("vi-VN")
                        : "1/1/1970"}
                    </td>
                    <td>
                      <span
                        className={`status-badge ${
                          p.purchase_status === "active"
                            ? "status-active"
                            : p.purchase_status === "expired"
                            ? "status-expired"
                            : p.purchase_status === "paused"
                            ? "status-paused"
                            : "status-no-package"
                        }`}
                      >
                        {p.purchase_status === "active" && "Còn hạn"}
                        {p.purchase_status === "expired" && "Hết hạn"}
                        {p.purchase_status === "paused" && "Tạm ngưng"}
                        {!p.purchase_status || p.purchase_status === null
                          ? "Chưa có gói"
                          : p.purchase_status}
                      </span>
                    </td>
                    <td>
                      {p.days_left !== null && p.days_left !== undefined
                        ? `${p.days_left} ngày`
                        : "0 ngày"}
                    </td>
                    <td>
                      <div className="action-buttons">
                        {canRenew && (
                          <button
                            className="btn-renew"
                            onClick={() => handleRenew(p.purchase_id || p.id)}
                          >
                            Gia hạn
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal đổi gói */}
      {showChangePackageModal && (
        <div className="package-modal" onClick={() => setShowChangePackageModal(false)}>
          <div
            className="package-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="package-modal-header">
              <h3>Chọn gói học mới</h3>
              <button
                className="package-modal-close"
                onClick={() => setShowChangePackageModal(false)}
              >
                ×
              </button>
            </div>
            <div className="package-list">
              {packages.length === 0 ? (
                <p>Không có gói học nào</p>
              ) : (
                packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`package-item ${
                      selectedPackageId === pkg.id ? "selected" : ""
                    }`}
                    onClick={() => setSelectedPackageId(pkg.id)}
                  >
                    <div className="package-item-name">{pkg.name}</div>
                    <div className="package-item-details">
                      <span>Thời hạn: {pkg.duration_days} ngày</span>
                      <span>
                        Giá: {pkg.price?.toLocaleString("vi-VN") || 0} VNĐ
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="package-modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowChangePackageModal(false)}
              >
                Hủy
              </button>
              <button
                className="btn-confirm"
                onClick={handleChangePackage}
                disabled={!selectedPackageId}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
