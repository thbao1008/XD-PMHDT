// src/components/learner/ProgressAnalytics.jsx
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const mockProgress = [
  { week: "Week 1", completed: 2 },
  { week: "Week 2", completed: 4 },
  { week: "Week 3", completed: 6 },
  { week: "Week 4", completed: 8 },
  { week: "Week 5", completed: 10 },
];

export default function ProgressAnalytics() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Progress Analytics
      </h1>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          Lessons Completed Over Time
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mockProgress}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="completed"
              stroke="#3B82F6"
              strokeWidth={2}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
