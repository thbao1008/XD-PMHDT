// src/components/learner/Challenges.jsx
import React from "react";

const mockChallenges = [
  { id: 1, title: "Challenge 1", description: "Giải bài toán PERT/CPM cơ bản", status: "Incomplete" },
  { id: 2, title: "Challenge 2", description: "Tạo form đăng ký người học", status: "Complete" },
  { id: 3, title: "Challenge 3", description: "Xây dựng API quiz", status: "Incomplete" },
];

export default function Challenges() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Challenges</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockChallenges.map((c) => (
          <div key={c.id} className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-lg font-semibold text-gray-800">{c.title}</h2>
            <p className="text-gray-600 mt-2">{c.description}</p>
            <span
              className={`mt-3 inline-block px-2 py-1 text-xs font-medium rounded-full ${
                c.status === "Complete"
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {c.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
