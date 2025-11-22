import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import "../../styles/speaking-practice.css";

export default function SpeakingSummary({ sessionData, rounds, onRestart }) {
  const navigate = useNavigate();
  const summary = sessionData?.summary || {};
  const [playingRound, setPlayingRound] = useState(null);
  const [wordTooltip, setWordTooltip] = useState(null);
  const [openWordTooltip, setOpenWordTooltip] = useState(null);
  const [wordDefinitionsCache, setWordDefinitionsCache] = useState(() => {
    try {
      const cached = localStorage.getItem('wordDefinitionsCache');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });
  const [loadingWords, setLoadingWords] = useState({});

  const handleFinish = () => {
    // Về trang chủ
    navigate("/learn/dashboard");
  };

  // Text-to-speech để phát âm chuẩn
  const speakText = (text, roundNumber) => {
    if (playingRound === roundNumber) {
      // Đang phát, dừng lại
      window.speechSynthesis.cancel();
      setPlayingRound(null);
      return;
    }

    // Dừng bất kỳ phát âm nào đang chạy
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.8; // Chậm hơn một chút để dễ nghe
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onend = () => {
      setPlayingRound(null);
    };

    utterance.onerror = () => {
      setPlayingRound(null);
    };

    window.speechSynthesis.speak(utterance);
    setPlayingRound(roundNumber);
  };

  // Phát âm từ khi click
  const speakWord = (word) => {
    // Dừng bất kỳ phát âm nào đang chạy
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.8; // Chậm hơn một chút để dễ nghe
    utterance.pitch = 1;
    utterance.volume = 1;
    
    window.speechSynthesis.speak(utterance);
  };

  // Fetch word definition từ API
  const fetchWordDefinition = async (word) => {
    // Kiểm tra cache trước
    if (wordDefinitionsCache[word]) {
      return wordDefinitionsCache[word];
    }

    // Nếu đang loading, không fetch lại
    if (loadingWords[word]) {
      return null;
    }

    try {
      setLoadingWords(prev => ({ ...prev, [word]: true }));
      const res = await api.get(`/learners/dictionary/${encodeURIComponent(word)}`);
      const definition = res.data;
      
      // Lưu vào cache (state và localStorage)
      const newCache = {
        ...wordDefinitionsCache,
        [word]: definition
      };
      setWordDefinitionsCache(newCache);
      
      // Lưu vào localStorage (chỉ lưu 100 từ gần nhất)
      try {
        const cacheEntries = Object.entries(newCache);
        const limitedCache = cacheEntries.slice(-100).reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {});
        localStorage.setItem('wordDefinitionsCache', JSON.stringify(limitedCache));
      } catch (err) {
        console.warn("Could not save to localStorage:", err);
      }
      
      return definition;
    } catch (err) {
      console.error("❌ Error fetching word definition:", err);
      return null;
    } finally {
      setLoadingWords(prev => ({ ...prev, [word]: false }));
    }
  };

  // Handle click từ - phát âm và hiển thị tooltip
  const handleWordClick = async (word, event) => {
    // Phát âm từ ngay khi click
    speakWord(word);
    
    // Toggle tooltip: nếu đang mở từ này thì đóng, nếu không thì mở
    if (openWordTooltip === word) {
      setOpenWordTooltip(null);
      setWordTooltip(null);
      return;
    }

    // Kiểm tra cache trước
    let definition = wordDefinitionsCache[word];
    
    if (!definition) {
      // Fetch nếu chưa có trong cache
      definition = await fetchWordDefinition(word);
    }

    if (definition) {
      setWordTooltip({ word, ...definition });
      setOpenWordTooltip(word);
    } else {
      // Nếu đang loading, đợi một chút rồi thử lại
      setTimeout(async () => {
        const def = await fetchWordDefinition(word);
        if (def) {
          setWordTooltip({ word, ...def });
          setOpenWordTooltip(word);
        }
      }, 100);
    }
  };

  // Helper function để normalize từ (lowercase, remove punctuation)
  const normalizeWord = (word) => {
    return word.toLowerCase().replace(/[.,!?;:]/g, '').trim();
  };

  // Highlight những từ đọc sai và thêm click để phát âm + tooltip chi tiết
  const highlightMissingWords = (prompt, missingWords) => {
    // Normalize missing words array
    const normalizedMissingWords = (missingWords || []).map(mw => normalizeWord(mw));
    
    if (normalizedMissingWords.length === 0) {
      // Nếu không có từ sai, vẫn cho phép click để phát âm và xem chi tiết
      const words = prompt.split(/(\s+)/);
      return words.map((word, idx) => {
        const cleanWord = normalizeWord(word);
        if (cleanWord.length === 0) {
          return <span key={idx}>{word}</span>;
        }
        return (
          <span 
            key={idx}
            onClick={(e) => handleWordClick(cleanWord, e)}
            style={{ 
              cursor: "pointer",
              padding: "2px 4px",
              borderRadius: "3px",
              transition: "background-color 0.2s",
              position: "relative"
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#f3f4f6"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
          >
            {word}
            {wordTooltip && openWordTooltip === cleanWord && (
              <div 
                className="word-tooltip"
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  zIndex: 1000,
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: 16,
                  marginTop: 8,
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  minWidth: 250,
                  maxWidth: 400
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="tooltip-word" style={{ marginBottom: 12 }}>
                  <strong style={{ fontSize: 18, color: "#10b981" }}>{wordTooltip.word}</strong>
                  {loadingWords[openWordTooltip] && (
                    <span style={{ marginLeft: 8, color: "#999", fontSize: 12 }}>Đang tải...</span>
                  )}
                </div>
                {wordTooltip.pronunciation && (
                  <div className="tooltip-pronunciation" style={{ marginBottom: 8, color: "#10b981", fontWeight: "bold" }}>
                    <strong>Phát âm:</strong> /{wordTooltip.pronunciation}/
                  </div>
                )}
                {wordTooltip.definition && (
                  <div className="tooltip-definition" style={{ marginBottom: 8 }}>
                    <strong>Nghĩa:</strong> {wordTooltip.definition}
                  </div>
                )}
                {wordTooltip.usage && (
                  <div className="tooltip-usage" style={{ marginBottom: 8 }}>
                    <strong>Cách dùng:</strong> {wordTooltip.usage}
                  </div>
                )}
                {wordTooltip.example && (
                  <div className="tooltip-example" style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #e5e7eb" }}>
                    <strong>Ví dụ:</strong> {wordTooltip.example}
                  </div>
                )}
                <button
                  onClick={() => {
                    setOpenWordTooltip(null);
                    setWordTooltip(null);
                  }}
                  style={{
                    marginTop: 12,
                    padding: "4px 12px",
                    background: "#6b7280",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 12
                  }}
                >
                  Đóng
                </button>
              </div>
            )}
          </span>
        );
      });
    }

    const words = prompt.split(/(\s+)/);
    return words.map((word, idx) => {
      // Nếu là khoảng trắng, render trực tiếp
      if (/^\s+$/.test(word)) {
        return <span key={idx}>{word}</span>;
      }
      
      const cleanWord = normalizeWord(word);
      const isMissing = normalizedMissingWords.includes(cleanWord);
      
      if (isMissing) {
        return (
          <span 
            key={idx} 
            onClick={(e) => handleWordClick(cleanWord, e)}
            style={{ 
              backgroundColor: "#fee2e2", 
              color: "#dc2626", 
              fontWeight: "bold",
              padding: "2px 4px",
              borderRadius: "3px",
              cursor: "pointer",
              transition: "background-color 0.2s",
              position: "relative"
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#fecaca"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "#fee2e2"}
          >
            {word}
            {wordTooltip && openWordTooltip === cleanWord && (
              <div 
                className="word-tooltip"
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  zIndex: 1000,
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: 16,
                  marginTop: 8,
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  minWidth: 250,
                  maxWidth: 400
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="tooltip-word" style={{ marginBottom: 12 }}>
                  <strong style={{ fontSize: 18, color: "#10b981" }}>{wordTooltip.word}</strong>
                  {loadingWords[openWordTooltip] && (
                    <span style={{ marginLeft: 8, color: "#999", fontSize: 12 }}>Đang tải...</span>
                  )}
                </div>
                {wordTooltip.pronunciation && (
                  <div className="tooltip-pronunciation" style={{ marginBottom: 8, color: "#10b981", fontWeight: "bold" }}>
                    <strong>Phát âm:</strong> /{wordTooltip.pronunciation}/
                  </div>
                )}
                {wordTooltip.definition && (
                  <div className="tooltip-definition" style={{ marginBottom: 8 }}>
                    <strong>Nghĩa:</strong> {wordTooltip.definition}
                  </div>
                )}
                {wordTooltip.usage && (
                  <div className="tooltip-usage" style={{ marginBottom: 8 }}>
                    <strong>Cách dùng:</strong> {wordTooltip.usage}
                  </div>
                )}
                {wordTooltip.example && (
                  <div className="tooltip-example" style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #e5e7eb" }}>
                    <strong>Ví dụ:</strong> {wordTooltip.example}
                  </div>
                )}
                <button
                  onClick={() => {
                    setOpenWordTooltip(null);
                    setWordTooltip(null);
                  }}
                  style={{
                    marginTop: 12,
                    padding: "4px 12px",
                    background: "#6b7280",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 12
                  }}
                >
                  Đóng
                </button>
              </div>
            )}
          </span>
        );
      }
      
      // Từ đọc đúng cũng có thể click để phát âm và xem chi tiết
      if (cleanWord.length > 0) {
        return (
          <span 
            key={idx}
            onClick={(e) => handleWordClick(cleanWord, e)}
            style={{ 
              cursor: "pointer",
              padding: "2px 4px",
              borderRadius: "3px",
              transition: "background-color 0.2s",
              position: "relative"
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#f3f4f6"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
          >
            {word}
            {wordTooltip && openWordTooltip === cleanWord && (
              <div 
                className="word-tooltip"
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  zIndex: 1000,
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: 16,
                  marginTop: 8,
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  minWidth: 250,
                  maxWidth: 400
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="tooltip-word" style={{ marginBottom: 12 }}>
                  <strong style={{ fontSize: 18, color: "#10b981" }}>{wordTooltip.word}</strong>
                  {loadingWords[openWordTooltip] && (
                    <span style={{ marginLeft: 8, color: "#999", fontSize: 12 }}>Đang tải...</span>
                  )}
                </div>
                {wordTooltip.pronunciation && (
                  <div className="tooltip-pronunciation" style={{ marginBottom: 8, color: "#10b981", fontWeight: "bold" }}>
                    <strong>Phát âm:</strong> /{wordTooltip.pronunciation}/
                  </div>
                )}
                {wordTooltip.definition && (
                  <div className="tooltip-definition" style={{ marginBottom: 8 }}>
                    <strong>Nghĩa:</strong> {wordTooltip.definition}
                  </div>
                )}
                {wordTooltip.usage && (
                  <div className="tooltip-usage" style={{ marginBottom: 8 }}>
                    <strong>Cách dùng:</strong> {wordTooltip.usage}
                  </div>
                )}
                {wordTooltip.example && (
                  <div className="tooltip-example" style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #e5e7eb" }}>
                    <strong>Ví dụ:</strong> {wordTooltip.example}
                  </div>
                )}
                <button
                  onClick={() => {
                    setOpenWordTooltip(null);
                    setWordTooltip(null);
                  }}
                  style={{
                    marginTop: 12,
                    padding: "4px 12px",
                    background: "#6b7280",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 12
                  }}
                >
                  Đóng
                </button>
              </div>
            )}
          </span>
        );
      }
      
      return <span key={idx}>{word}</span>;
    });
  };

  return (
    <div className="speaking-summary">
      <div className="summary-header">
        <h2>Tổng kết luyện tập</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <button 
            className="btn-primary" 
            onClick={handleFinish}
            style={{
              padding: "10px 20px",
              background: "#10b981",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            Xong
          </button>
        </div>
      </div>

      <div className="summary-overview">
        <div className="overview-card" style={{ flex: 1, maxWidth: "400px", margin: "0 auto" }}>
          <div className="overview-label">Điểm tổng kết</div>
          <div className="overview-value" style={{ fontSize: 48, fontWeight: "bold", color: "#10b981" }}>
            {sessionData?.average_score !== undefined && sessionData.average_score !== null ? 
              Math.round(sessionData.average_score)
              : (summary?.average_score !== undefined && summary.average_score !== null ?
                Math.round(summary.average_score)
                : 0)}/100
          </div>
        </div>
      </div>

      {summary.overall_feedback && (
        <div className="summary-overall">
          <h3>Nhận xét tổng thể:</h3>
          <p>{summary.overall_feedback}</p>
        </div>
      )}

      {/* Hiển thị 10 rounds với các từ đọc sai */}
      <div style={{ marginTop: 30, padding: "0 20px" }}>
        <h3 style={{ marginBottom: 20, color: "#333" }}>Chi tiết các vòng luyện tập:</h3>
        <div style={{ maxHeight: "60vh", overflowY: "auto", paddingRight: 10 }}>
          {rounds && rounds.length > 0 ? (
            rounds.map((round, idx) => {
              // Extract missing_words từ nhiều nguồn có thể
              let missingWords = [];
              if (round.missing_words && Array.isArray(round.missing_words)) {
                missingWords = round.missing_words;
              } else if (round.analysis) {
                try {
                  const analysis = typeof round.analysis === 'string' 
                    ? JSON.parse(round.analysis || '{}') 
                    : round.analysis;
                  missingWords = analysis.missing_words || [];
                } catch (e) {
                  console.warn("Error parsing analysis:", e);
                }
              }
              
              
              const prompt = round.prompt || '';
              
              return (
                <div 
                  key={round.round_id || idx}
                  style={{
                    marginBottom: 25,
                    padding: 20,
                    background: "#f9fafb",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 15 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: 18, 
                        fontWeight: "bold", 
                        color: "#10b981",
                        marginBottom: 10
                      }}>
                        Vòng {round.round_number || idx + 1}:
                      </div>
                      <div style={{ 
                        fontSize: 16, 
                        color: "#333", 
                        lineHeight: 1.8,
                        marginBottom: 10
                      }}>
                        {highlightMissingWords(prompt, missingWords)}
                      </div>
                      {round.score !== undefined && (
                        <div style={{ 
                          fontSize: 14, 
                          color: "#666",
                          marginTop: 8
                        }}>
                          Điểm: <strong>{Math.round(parseFloat(round.score || 0))}/100</strong>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => speakText(prompt, round.round_number || idx + 1)}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        border: "none",
                        background: playingRound === (round.round_number || idx + 1) 
                          ? "#ef4444" 
                          : "#10b981",
                        color: "white",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                        marginLeft: 15,
                        flexShrink: 0,
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                      }}
                      title="Nghe phát âm chuẩn"
                    >
                      {playingRound === (round.round_number || idx + 1) ? "⏸" : "🔊"}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: "center", padding: 40, color: "#666" }}>
              Chưa có dữ liệu các vòng luyện tập
            </div>
          )}
        </div>
      </div>

      <div className="summary-actions" style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 30 }}>
        <button 
          className="btn-primary" 
          onClick={handleFinish}
          style={{
            padding: "12px 24px",
            background: "#10b981",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 16
          }}
        >
          Xong
        </button>
      </div>
    </div>
  );
}

