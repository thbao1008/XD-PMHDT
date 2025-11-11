import React, { useState } from "react";
import "../../styles/mentor.css";
import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

export default function AssessmentModal({ learner, onClose, onSave }) {
  const [form, setForm] = useState({
    pronunciation: 0,
    grammar: 0,
    fluency: 0,
    confidence: 0,
    notes: ""
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: Number(value) }));
  }

  function handleSubmit() {
    onSave({ ...form, learnerId: learner.id });
    onClose();
  }

  // Chart data
  const chartData = {
    labels: ["Pronunciation", "Grammar", "Fluency", "Confidence"],
    datasets: [
      {
        label: "Assessment Scores",
        data: [
          form.pronunciation,
          form.grammar,
          form.fluency,
          form.confidence
        ],
        backgroundColor: "rgba(79, 70, 229, 0.2)",
        borderColor: "#4f46e5",
        borderWidth: 2
      }
    ]
  };

  const chartOptions = {
    scales: {
      r: {
        min: 0,
        max: 10,
        ticks: { stepSize: 2 }
      }
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Đánh giá cho {learner.name}</h3>

        {/* Radar Chart */}
        <div className="chart-block">
          <Radar data={chartData} options={chartOptions} />
        </div>

        {/* Form inputs */}
        <div className="form-group">
          <label>Pronunciation</label>
          <input
            type="number"
            name="pronunciation"
            min="0"
            max="10"
            value={form.pronunciation}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Grammar</label>
          <input
            type="number"
            name="grammar"
            min="0"
            max="10"
            value={form.grammar}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Fluency</label>
          <input
            type="number"
            name="fluency"
            min="0"
            max="10"
            value={form.fluency}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Confidence</label>
          <input
            type="number"
            name="confidence"
            min="0"
            max="10"
            value={form.confidence}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Nhận xét chi tiết</label>
          <textarea
            name="notes"
            rows="4"
            value={form.notes}
            onChange={handleChange}
          />
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Hủy</button>
          <button className="btn-save" onClick={handleSubmit}>Lưu đánh giá</button>
        </div>
      </div>
    </div>
  );
}
