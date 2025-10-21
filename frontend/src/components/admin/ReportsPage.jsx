// src/components/admin/ReportsPage.jsx
import React from "react";
import KpiCard from "../common/KpiCard.jsx";

export default function ReportsPage() {
  const kpis = [
    { id: "u", title: "Người dùng hoạt động", value: "1,254", delta: 4.85, icon: "👥", color: "linear-gradient(180deg,var(--primary),var(--primary-600))" },
    { id: "r", title: "Doanh thu (VND)", value: "₫120,500,000", delta: 3.25, icon: "💰", color: "linear-gradient(180deg,var(--accent), #e08b00)" },
    { id: "p", title: "Gói mới", value: "342", delta: 1.85, icon: "📦", color: "linear-gradient(180deg,#6a9cff,#4868d9)" },
    { id: "n", title: "Người dùng mới", value: "1,980", delta: 3.25, icon: "🆕", color: "linear-gradient(180deg,#7be6c7,#05b09f)" },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h2 style={{ margin: 0 }}>Báo cáo tổng quan</h2>
        <div>
          <button className="btn btn-ghost btn-small" onClick={() => alert("Export PDF (demo)")}>Export</button>
        </div>
      </div>

      <div className="kpi-row">
        {kpis.map(k => <KpiCard key={k.id} {...k} />)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Biểu đồ doanh thu</h3>
          <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
            (Chart placeholder) — tích hợp Chart.js khi cần
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Tổng quan nhanh</h3>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            <li>Số user đăng ký: 12,432</li>
            <li>Doanh thu quý: ₫1,240,000,000</li>
            <li>Gói Pro bán chạy nhất: Gói Pro</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
