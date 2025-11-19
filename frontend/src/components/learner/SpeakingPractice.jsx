import React, { useState, useEffect } from "react";
import { getAuth } from "../../utils/auth";
import api from "../../api";
import SpeakingRound from "./SpeakingRound";
import SpeakingSummary from "./SpeakingSummary";
import SpeakingScenario from "./SpeakingScenario";
import TellMeYourStory from "./TellMeYourStory";
import SemanticInput from "./SemanticInput";
import "../../styles/speaking-practice.css";

export default function SpeakingPractice() {
  const auth = getAuth();
  const [mode, setMode] = useState("practice"); // "practice" or "story"
  const [level, setLevel] = useState(1); // 1, 2, 3
  const [sessionId, setSessionId] = useState(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [rounds, setRounds] = useState([]);
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSemanticInput, setShowSemanticInput] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [scenarioSessionId, setScenarioSessionId] = useState(null);

  // Tạo session mới
  const createSession = async () => {
    setLoading(true);
    setError("");
    try {
      const userId = auth?.user?._id || auth?.user?.id;
      const learnerId = auth?.user?.learner_id;
      
      if (!userId && !learnerId) {
        setError("Không tìm thấy thông tin học viên");
        return;
      }

      const res = await api.post("/learners/speaking-practice/sessions", {
        learner_id: learnerId,
        user_id: userId,
        level: level,
        mode: "practice"
      });

      setSessionId(res.data.session_id);
      setCurrentRound(0);
      setRounds([]);
      setSessionData(res.data);
    } catch (err) {
      console.error("❌ Error creating session:", err);
      setError(err?.response?.data?.message || "Không thể tạo session. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // Lưu vòng nói (chuyển vòng ngay, không đợi analysis)
  const saveRound = async (roundData) => {
    if (!sessionId) {
      console.error("❌ No sessionId, cannot save round");
      return;
    }

    console.log("💾 saveRound called with:", roundData);

    // Nếu đã có round_id, nghĩa là đã submit rồi, chỉ cần chuyển vòng
    if (roundData.round_id) {
      console.log("✅ Round already submitted, moving to next round");
      
      // Lưu round data (chưa có analysis, sẽ được cập nhật sau)
      const newRound = {
        ...roundData,
        round_number: currentRound + 1,
        status: "processing"
      };

      setRounds(prev => [...prev, newRound]);

      // Chuyển sang vòng tiếp theo ngay
      if (currentRound + 1 >= 10) {
        console.log("🎯 Reached 10 rounds, showing semantic input...");
        // Đã đủ 10 vòng, hiển thị màn hình nhập ngữ nghĩa
        setShowSemanticInput(true);
      } else {
        // Chuyển sang vòng tiếp theo ngay
        console.log(`➡️ Moving from round ${currentRound + 1} to ${currentRound + 2}`);
        setCurrentRound(prev => {
          const next = prev + 1;
          console.log(`✅ Current round updated: ${next}`);
          return next;
        });
      }
      return;
    }

    // Nếu chưa submit, submit trước (trường hợp này không nên xảy ra vì handleSubmit đã submit rồi)
    console.warn("⚠️ saveRound called without round_id, this should not happen");
    try {
      const formData = new FormData();
      formData.append("audio", roundData.audioBlob);
      formData.append("time_taken", roundData.timeTaken);
      formData.append("round_number", currentRound + 1);

      // Gửi request, không đợi analysis
      const res = await api.post(
        `/learners/speaking-practice/sessions/${sessionId}/rounds`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      // Lưu round data (chưa có analysis, sẽ được cập nhật sau)
      const newRound = {
        ...roundData,
        round_number: currentRound + 1,
        round_id: res.data.round_id,
        status: "processing"
      };

      setRounds(prev => [...prev, newRound]);

      // Chuyển sang vòng tiếp theo ngay (không đợi analysis)
      if (currentRound + 1 >= 10) {
        // Đã đủ 10 vòng, hiển thị màn hình nhập ngữ nghĩa
        setShowSemanticInput(true);
      } else {
        // Chuyển sang vòng tiếp theo ngay
        setCurrentRound(prev => prev + 1);
      }
    } catch (err) {
      console.error("❌ Error saving round:", err);
      setError(err?.response?.data?.message || "Không thể lưu vòng nói. Vui lòng thử lại.");
    }
  };

  // Reset session
  const resetSession = () => {
    setSessionId(null);
    setCurrentRound(0);
    setRounds([]);
    setSessionData(null);
    setError("");
    setShowSemanticInput(false);
    setAnalyzing(false);
  };

  // Load scenarios khi vào mode scenario
  useEffect(() => {
    if (mode === "scenario") {
      fetchScenarios();
    }
  }, [mode]);

  const fetchScenarios = async () => {
    try {
      const res = await api.get("/learners/speaking-practice/scenarios");
      setScenarios(res.data.scenarios || []);
    } catch (err) {
      console.error("❌ Error fetching scenarios:", err);
    }
  };

  const startScenario = async (scenario) => {
    try {
      const userId = auth?.user?._id || auth?.user?.id;
      const learnerId = auth?.user?.learner_id;
      
      const res = await api.post("/learners/speaking-practice/scenario/sessions", {
        scenario_id: scenario.id,
        learner_id: learnerId,
        user_id: userId
      });
      setScenarioSessionId(res.data.session_id);
      setSelectedScenario(scenario);
    } catch (err) {
      console.error("❌ Error starting scenario:", err);
      alert("Không thể bắt đầu tình huống. Vui lòng thử lại.");
    }
  };

  const handleScenarioComplete = (data) => {
    alert("Chúc mừng! Bạn đã hoàn thành tình huống!");
    setSelectedScenario(null);
    setScenarioSessionId(null);
    setMode("practice");
  };

  if (mode === "story") {
    return <TellMeYourStory onBack={() => setMode("practice")} />;
  }

  // Màn hình chọn scenario
  if (mode === "scenario" && !selectedScenario) {
    return (
      <div className="speaking-practice-page">
        <div className="practice-header">
          <h2>Luyện nói theo tình huống</h2>
          <button className="btn-back" onClick={() => setMode("practice")} style={{ padding: "8px 16px", background: "#6b7280", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}>
            Quay lại
          </button>
        </div>
        <div className="scenarios-list" style={{ padding: 20 }}>
          {scenarios.length === 0 ? (
            <p style={{ textAlign: "center", color: "#666" }}>Đang tải tình huống...</p>
          ) : (
            scenarios.map((scenario) => (
              <div
                key={scenario.id}
                style={{
                  padding: 20,
                  marginBottom: 15,
                  background: "white",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onClick={() => startScenario(scenario)}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "#10b981"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
              >
                <h3 style={{ marginBottom: 10, color: "#10b981" }}>{scenario.title}</h3>
                <p style={{ color: "#666", marginBottom: 10 }}>{scenario.description}</p>
                <div style={{ fontSize: 14, color: "#999" }}>
                  <strong>Nhiệm vụ:</strong> {scenario.task}
                </div>
                <div style={{ fontSize: 12, color: "#999", marginTop: 5 }}>
                  Độ khó: {scenario.difficulty_level === 1 ? "Dễ" : scenario.difficulty_level === 2 ? "Trung bình" : "Khó"}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Màn hình scenario đang chơi
  if (mode === "scenario" && selectedScenario && scenarioSessionId) {
    return (
      <SpeakingScenario
        sessionId={scenarioSessionId}
        scenario={selectedScenario}
        onComplete={handleScenarioComplete}
        onCancel={() => {
          setSelectedScenario(null);
          setScenarioSessionId(null);
          setMode("practice");
        }}
      />
    );
  }

  // Xử lý khi hoàn thành semantic input
  const handleSemanticComplete = async () => {
    setShowSemanticInput(false);
    setAnalyzing(true);
    
    try {
      // Gọi API để phân tích tất cả các vòng và tạo summary
      const summaryRes = await api.post(
        `/learners/speaking-practice/sessions/${sessionId}/analyze-and-summary`
      );
      setSessionData(prev => ({ ...prev, summary: summaryRes.data }));
    } catch (err) {
      console.error("❌ Error analyzing and generating summary:", err);
      // Nếu API không tồn tại, thử API cũ
      try {
        const summaryRes = await api.get(
          `/learners/speaking-practice/sessions/${sessionId}/summary`
        );
        setSessionData(prev => ({ ...prev, summary: summaryRes.data }));
      } catch (err2) {
        console.error("❌ Error fetching summary:", err2);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSemanticSkip = async () => {
    setShowSemanticInput(false);
    setAnalyzing(true);
    
    try {
      // Gọi API để phân tích tất cả các vòng và tạo summary
      const summaryRes = await api.post(
        `/learners/speaking-practice/sessions/${sessionId}/analyze-and-summary`
      );
      setSessionData(prev => ({ ...prev, summary: summaryRes.data }));
    } catch (err) {
      console.error("❌ Error analyzing and generating summary:", err);
      // Nếu API không tồn tại, thử API cũ
      try {
        const summaryRes = await api.get(
          `/learners/speaking-practice/sessions/${sessionId}/summary`
        );
        setSessionData(prev => ({ ...prev, summary: summaryRes.data }));
      } catch (err2) {
        console.error("❌ Error fetching summary:", err2);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  // Hiển thị loading khi đang phân tích
  if (analyzing) {
    return (
      <div className="speaking-practice-page">
        <div className="practice-header">
          <h2>Đang phân tích kết quả...</h2>
        </div>
        <div style={{ textAlign: "center", padding: 40 }}>
          <p style={{ fontSize: 18, color: "#666" }}>Vui lòng đợi trong giây lát...</p>
        </div>
      </div>
    );
  }

  // Hiển thị semantic input sau khi hoàn thành 10 vòng
  if (showSemanticInput && currentRound >= 10) {
    return (
      <SemanticInput
        sessionId={sessionId}
        rounds={rounds}
        onComplete={handleSemanticComplete}
        onSkip={handleSemanticSkip}
      />
    );
  }

  // Nếu đã đủ 10 vòng và có summary, hiển thị tổng kết
  if (currentRound >= 10 && sessionData?.summary) {
    return (
      <SpeakingSummary
        sessionData={sessionData}
        rounds={rounds}
        onRestart={resetSession}
      />
    );
  }

  // Nếu đang trong session, hiển thị vòng nói
  if (sessionId !== null && currentRound < 10) {
    console.log("🎯 Rendering SpeakingRound:", {
      currentRound,
      roundNumber: currentRound + 1,
      sessionId,
      hasOnSave: typeof saveRound === 'function'
    });
    
    return (
      <SpeakingRound
        key={`round-${currentRound}-${sessionId}`} // Force re-render khi round thay đổi
        sessionId={sessionId}
        roundNumber={currentRound + 1}
        level={level}
        onSave={saveRound}
        onCancel={resetSession}
      />
    );
  }

  // Màn hình chọn level và bắt đầu
  return (
    <div className="speaking-practice-page">
      <div className="practice-header">
        <h2>Luyện nói với AI</h2>
        <p>Chọn level và bắt đầu luyện tập. Bạn sẽ có 10 vòng nói với AI.</p>
      </div>

      <div className="practice-modes">
        <button
          className={`mode-btn ${mode === "practice" ? "active" : ""}`}
          onClick={() => setMode("practice")}
        >
          Luyện nói (3 level)
        </button>
        <button
          className={`mode-btn ${mode === "scenario" ? "active" : ""}`}
          onClick={() => setMode("scenario")}
        >
          Luyện nói theo tình huống
        </button>
        <button
          className={`mode-btn ${mode === "story" ? "active" : ""}`}
          onClick={() => setMode("story")}
        >
          Tell me your story
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="level-selection">
        <h3>Chọn level:</h3>
        <div className="level-cards">
          {[1, 2, 3].map((lvl) => (
            <div
              key={lvl}
              className={`level-card ${level === lvl ? "selected" : ""}`}
              onClick={() => setLevel(lvl)}
            >
              <div className="level-number">Level {lvl}</div>
              <div className="level-description">
                {lvl === 1 && "Cơ bản - Câu ngắn, từ vựng đơn giản"}
                {lvl === 2 && "Trung bình - Câu dài hơn, từ vựng phức tạp"}
                {lvl === 3 && "Nâng cao - Đoạn văn dài, từ vựng khó"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="practice-actions">
        <button
          className="btn-start"
          onClick={createSession}
          disabled={loading}
        >
          {loading ? "Đang tạo session..." : "Bắt đầu luyện tập"}
        </button>
      </div>
    </div>
  );
}
