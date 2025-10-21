// src/components/admin/Dashboard.jsx
import React from "react";
import { Pie, Line, Bar } from "react-chartjs-2";
import "../../lib/chartSetup.js"; // đã có file setup đk các phần ChartJS
import KpiCard from "../common/KpiCard.jsx";

export default function Dashboard() {
  const kpis = [
    { id: "activeUsers", title: "Người dùng hoạt động", value: "1,254", delta: 4.8, icon: "👥", color: "linear-gradient(180deg,var(--primary),var(--primary-600))" },
    { id: "revenue", title: "Doanh thu (VND)", value: "₫120,500,000", delta: 3.25, icon: "💰", color: "linear-gradient(180deg,var(--accent), #e08b00)" },
    { id: "newPackages", title: "Gói dịch vụ mới", value: "342", delta: 1.85, icon: "📦", color: "linear-gradient(180deg,#6a9cff,#4868d9)" },
    { id: "newUsers", title: "Người dùng mới", value: "1,980", delta: 3.25, icon: "🆕", color: "linear-gradient(180deg,#7be6c7,#05b09f)" },
  ];

  // Chart data giống mẫu (đơn giản)
  const pieData = {
    labels: ["Open", "Bounce", "Unsubscribe"],
    datasets: [{
      data: [53.36, 34.73, 12.91],
      backgroundColor: ["#f44336", "#ff9800", "#2196f3"]
    }]
  };

  const lineData = {
    labels: ["12AM","1AM","2AM","3AM","4AM","5AM","6AM","7AM","8AM","9AM","10AM","11AM","12PM","1PM","2PM","3PM","4PM","5PM","6PM","7PM","8PM","9PM","10PM","11PM"],
    datasets: [
      { label: "Open", data: [12,15,18,20,22,24,26,30,35,40,42,43,45,44,42,40,39,38,36,34,30,28,25,20], borderColor: "#fdd835", backgroundColor: "rgba(253,216,53,0.2)", fill: true, tension: 0.3 },
      { label: "Click", data: [5,7,9,10,12,13,14,16,18,20,22,24,25,24,23,22,21,20,19,18,16,14,12,10], borderColor: "#f44336", backgroundColor: "rgba(244,67,54,0.2)", fill: true, tension: 0.3 },
      { label: "Click Second Time", data: [2,3,4,5,6,7,8,9,10,11,11,12,13,12,11,10,9,8,7,6,5,4,3,2], borderColor: "#2196f3", backgroundColor: "rgba(33,150,243,0.2)", fill: true, tension: 0.3 },
    ]
  };

  const barData = {
    labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
    datasets: [
      { label: "Sales", data: [12,19,13,15,22,30,28,26,24,20,18,16], backgroundColor: "rgba(33,150,243,0.6)" },
      { label: "Taxes", data: [2,3,2,3,3,4,4,3,3,3,2,2], backgroundColor: "rgba(244,67,54,0.6)" },
    ]
  };

  const tasks = [
    `Sign contract for "What are conference organizers afraid of?"`,
    `Lines From Great Russian Literature? Or E-mails From My Boss?`,
    `Flooded: One year later, assessing what was lost and what was found...`,
    `Create 4 Invisible User Experiences you Never Knew About`
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost btn-small">Export</button>
          <button className="btn btn-primary btn-small">Tạo báo cáo</button>
        </div>
      </div>

      <div className="kpi-row">
        {kpis.map(k => (
          <KpiCard key={k.id} title={k.title} value={k.value} delta={k.delta} icon={k.icon} color={k.color} />
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Email Statistics</h3>
          <Pie data={pieData} />
          <div className="muted" style={{ marginTop: 8 }}>Campaign sent 2 days ago</div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Users Behavior (24 Hours)</h3>
          <Line data={lineData} />
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>2014 Sales (including taxes)</h3>
          <Bar data={barData} />
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Tasks</h3>
          <ul className="task-list">
            {tasks.map((t, i) => (
              <li key={i} className="task-item">
                <input type="checkbox" /> <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
