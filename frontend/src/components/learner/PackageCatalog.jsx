// src/components/learner/PackageCatalog.jsx
import React from "react";

const mockPackages = [
  { id: 1, title: "Gói cơ bản", description: "Học cơ bản các kỹ năng", price: "$29" },
  { id: 2, title: "Gói nâng cao", description: "Học nâng cao, đầy đủ bài tập", price: "$59" },
  { id: 3, title: "Gói chuyên sâu", description: "Học chuyên sâu, kèm mentor", price: "$99" },
];

export default function PackageCatalog() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Package Catalog</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockPackages.map((pkg) => (
          <div
            key={pkg.id}
            className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition"
          >
            <h2 className="text-lg font-semibold text-gray-800">{pkg.title}</h2>
            <p className="text-gray-600 mt-2">{pkg.description}</p>
            <p className="mt-3 font-bold text-blue-600">{pkg.price}</p>
            <button className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition">
              Đăng ký
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

