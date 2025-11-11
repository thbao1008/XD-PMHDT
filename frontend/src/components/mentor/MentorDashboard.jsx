import React from "react";
import { getAuth } from "../../utils/auth";

export default function MentorDashboard() {
  const auth = getAuth();

  return (
    <div className="mentor-dashboard">
      
      
      <div className="dashboard-kpis">
        {/* KPI cards, chart, … */}
      </div>
    </div>
  );
}
