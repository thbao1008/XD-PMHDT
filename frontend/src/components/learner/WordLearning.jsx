import React, { useState, useEffect } from "react";
import api from "../../api";
import "../../styles/speaking-practice.css";

export default function WordLearning({ round, onComplete, onSkip }) {
  const [wordMeanings, setWordMeanings] = useState({});
  const [wordDefinitions, setWordDefinitions] = useState({});
  const [loading, setLoading] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Extract words from prompt
  const words = round?.prompt
    ? round.prompt
        .toLowerCase()
        .split(/\s+/)
        .map((w) => w.replace(/[.,!?;:]/g, ""))
        .filter((w) => w.length > 0)
        .filter((w, i, arr) => arr.indexOf(w) === i) // Remove duplicates
    : [];

  // Fetch definitions for words
  useEffect(() => {
    const fetchDefinitions = async () => {
      for (const word of words) {
        if (!wordDefinitions[word]) {
          setLoading((prev) => ({ ...prev, [word]: true }));
          try {
            const res = await api.get(`/learners/dictionary/${encodeURIComponent(word)}`);
            if (res.data) {
              setWordDefinitions((prev) => ({
                ...prev,
                [word]: res.data,
              }));
            }
          } catch (err) {
            console.error(`Error fetching definition for ${word}:`, err);
          } finally {
            setLoading((prev) => ({ ...prev, [word]: false }));
          }
        }
      }
    };

    if (words.length > 0) {
      fetchDefinitions();
    }
  }, [words.join(",")]);

  const handleMeaningChange = (word, value) => {
    setWordMeanings((prev) => ({
      ...prev,
      [word]: value,
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Save word meanings to backend (optional - can be stored in round data)
      if (round.round_id) {
        await api.post(
          `/learners/speaking-practice/rounds/${round.round_id}/word-meanings`,
          { word_meanings: wordMeanings }
        );
      }
      onComplete();
    } catch (err) {
      console.error("Error saving word meanings:", err);
      // Continue anyway
      onComplete();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  return (
    <div className="word-learning" style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
      <div className="word-learning-header" style={{ marginBottom: 30 }}>
        <h2 style={{ color: "#10b981", marginBottom: 10 }}>Học nghĩa từ vựng</h2>
        <p style={{ color: "#666", fontSize: 16 }}>
          Bạn vừa đọc: <strong style={{ color: "#333" }}>"{round?.prompt}"</strong>
        </p>
        <p style={{ color: "#666", fontSize: 14, marginTop: 10 }}>
          Nhập nghĩa tiếng Việt của các từ dưới đây để tăng khả năng hiểu từ vựng (có thể bỏ qua)
        </p>
      </div>

      <div className="words-list" style={{ marginBottom: 30 }}>
        {words.map((word, idx) => {
          const definition = wordDefinitions[word];
          const isLoading = loading[word];
          const userMeaning = wordMeanings[word] || "";

          return (
            <div
              key={idx}
              style={{
                padding: 20,
                marginBottom: 15,
                background: "#f9fafb",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 20, color: "#10b981", marginBottom: 8 }}>
                    {word.charAt(0).toUpperCase() + word.slice(1)}
                  </h3>
                  {isLoading ? (
                    <p style={{ color: "#999", fontSize: 14 }}>Đang tải định nghĩa...</p>
                  ) : definition ? (
                    <div style={{ fontSize: 14, color: "#666", marginTop: 8 }}>
                      {definition.pronunciation && (
                        <p style={{ marginBottom: 5 }}>
                          <strong>Phát âm:</strong> /{definition.pronunciation}/
                        </p>
                      )}
                      {definition.definition && (
                        <p style={{ marginBottom: 5 }}>
                          <strong>Nghĩa:</strong> {definition.definition}
                        </p>
                      )}
                      {definition.example && (
                        <p style={{ marginBottom: 5, fontStyle: "italic", color: "#888" }}>
                          <strong>Ví dụ:</strong> {definition.example}
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              <div style={{ marginTop: 15 }}>
                <label style={{ display: "block", marginBottom: 8, fontSize: 14, color: "#666" }}>
                  Nghĩa của bạn (tiếng Việt):
                </label>
                <textarea
                  value={userMeaning}
                  onChange={(e) => handleMeaningChange(word, e.target.value)}
                  placeholder="Nhập nghĩa của từ này..."
                  rows="2"
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 4,
                    border: "1px solid #ddd",
                    fontSize: 14,
                    fontFamily: "inherit",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="word-learning-actions" style={{ display: "flex", gap: 15, justifyContent: "center" }}>
        <button
          onClick={handleSkip}
          disabled={submitting}
          style={{
            padding: "12px 24px",
            background: "#6b7280",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: submitting ? "not-allowed" : "pointer",
            fontSize: 16,
            fontWeight: 500,
          }}
        >
          Bỏ qua
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            padding: "12px 24px",
            background: "#10b981",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: submitting ? "not-allowed" : "pointer",
            fontSize: 16,
            fontWeight: 500,
          }}
        >
          {submitting ? "Đang lưu..." : "Tiếp tục"}
        </button>
      </div>
    </div>
  );
}

