// src/components/learner/SpeakingPractice.jsx
import React from "react";

const mockExercises = [
  { id: 1, title: "Introduce Yourself", description: "Practice a self-introduction", status: "Incomplete" },
  { id: 2, title: "Daily Routine", description: "Talk about your daily routine", status: "Complete" },
  { id: 3, title: "Describe Your Favorite Hobby", description: "Practice describing hobbies", status: "Incomplete" },
];

export default function SpeakingPractice() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Speaking Practice</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockExercises.map((ex) => (
          <div
            key={ex.id}
            className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition"
          >
            <h2 className="text-lg font-semibold text-gray-800">{ex.title}</h2>
            <p className="text-gray-600 mt-2">{ex.description}</p>
            <span
              className={`mt-3 inline-block px-2 py-1 text-xs font-medium rounded-full ${
                ex.status === "Complete"
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {ex.status}
            </span>
            <button className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition">
              Bắt đầu luyện tập
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
