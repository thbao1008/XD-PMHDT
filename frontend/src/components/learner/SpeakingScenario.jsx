import React, { useState, useEffect, useRef } from "react";
import api from "../../api";
import { FaMicrophone } from "react-icons/fa";
import "../../styles/speaking-scenario.css";

export default function SpeakingScenario({ sessionId, scenario, onComplete, onCancel }) {
  const [vocabulary, setVocabulary] = useState([]);
  const [showVocabulary, setShowVocabulary] = useState(true);
  const [conversation, setConversation] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isPlayingAI, setIsPlayingAI] = useState(false);
  const [hint, setHint] = useState(null);
  const [loadingHint, setLoadingHint] = useState(false);
  const [finalScore, setFinalScore] = useState(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [currentScore, setCurrentScore] = useState(100);
  const [hintsUsed, setHintsUsed] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const conversationEndRef = useRef(null);

  useEffect(() => {
    if (scenario?.vocabulary) {
      // Parse vocabulary từ JSONB nếu là string
      const vocab = typeof scenario.vocabulary === 'string' 
        ? JSON.parse(scenario.vocabulary) 
        : scenario.vocabulary;
      setVocabulary(Array.isArray(vocab) ? vocab : []);
    }
  }, [scenario]);

  useEffect(() => {
    // Scroll to bottom when conversation updates
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation]);

  const startConversation = async () => {
    try {
      const res = await api.post(
        `/learners/speaking-practice/scenario/sessions/${sessionId}/start`,
        { scenario_id: scenario.id }
      );
      
      if (res.data.message) {
        setConversation([{
          speaker: "ai",
          text: res.data.message,
          timestamp: new Date()
        }]);
      }
    } catch (err) {
      console.error("❌ Error starting conversation:", err);
      alert("Không thể bắt đầu cuộc trò chuyện. Vui lòng thử lại.");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      
      const options = 
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported &&
        MediaRecorder.isTypeSupported("audio/webm")
          ? { mimeType: "audio/webm" }
          : undefined;
      
      const mr = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mr;
      
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { 
          type: audioChunksRef.current[0]?.type || "audio/webm" 
        });
        setAudioBlob(blob);
        
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
      };
      
      mr.start();
      setIsRecording(true);
    } catch (err) {
      console.error("❌ Error starting recording:", err);
      alert("Không thể truy cập microphone. Kiểm tra quyền truy cập.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleSendMessage = async (audio) => {
    if (!audio) return;
    
    const userMessage = {
      speaker: "learner",
      text: "[Audio message]",
      audio: audio,
      timestamp: new Date()
    };
    
    setConversation(prev => [...prev, userMessage]);
    setIsProcessing(true);
    
    try {
      // Gửi audio với FormData
      const formData = new FormData();
      formData.append("audio", audio);
      
      const res = await api.post(
        `/learners/speaking-practice/scenario/sessions/${sessionId}/message`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      
      if (res.data.message) {
        const aiMessage = {
          speaker: "ai",
          text: res.data.message,
          audio_url: res.data.audio_url || null,
          timestamp: new Date()
        };
        setConversation(prev => [...prev, aiMessage]);
        
        // Tự động phát audio nếu có
        if (res.data.audio_url) {
          setTimeout(() => {
            playAIAudio(res.data.audio_url);
          }, 500);
        }
      }
      
      // Kiểm tra xem task đã hoàn thành chưa
      if (res.data.task_completed) {
        setTaskCompleted(true);
        // Tự động chấm điểm cuối cùng
        handleEvaluateFinalScore();
      }
    } catch (err) {
      console.error("❌ Error sending message:", err);
      alert("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setIsProcessing(false);
      setAudioBlob(null);
    }
  };

  const playAIAudio = (audioUrl) => {
    const audio = new Audio(audioUrl.startsWith('http') ? audioUrl : `http://localhost:4002${audioUrl}`);
    setIsPlayingAI(true);
    audio.onended = () => setIsPlayingAI(false);
    audio.onerror = () => {
      setIsPlayingAI(false);
      console.error("❌ Error playing AI audio");
    };
    audio.play().catch(err => {
      console.error("❌ Error playing audio:", err);
      setIsPlayingAI(false);
    });
  };

  const handleSubmitAudio = () => {
    if (audioBlob) {
      handleSendMessage(audioBlob);
    }
  };

  const handleRecordClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleGetHint = async () => {
    if (loadingHint) return;
    
    setLoadingHint(true);
    try {
      const res = await api.get(
        `/learners/speaking-practice/scenario/sessions/${sessionId}/hint`
      );
      
      setHint({
        english: res.data.hint_english || "",
        vietnamese: res.data.hint_vietnamese || "",
        context: res.data.context || ""
      });
      
      // Cập nhật điểm và số lần dùng gợi ý
      if (res.data.current_score !== undefined) {
        setCurrentScore(res.data.current_score);
      }
      if (res.data.hints_used !== undefined) {
        setHintsUsed(res.data.hints_used);
      }
    } catch (err) {
      console.error("❌ Error getting hint:", err);
      alert("Không thể lấy gợi ý. Vui lòng thử lại.");
    } finally {
      setLoadingHint(false);
    }
  };

  const handleEvaluateFinalScore = async () => {
    try {
      const res = await api.post(
        `/learners/speaking-practice/scenario/sessions/${sessionId}/evaluate`
      );
      
      setFinalScore(res.data);
      setShowScoreModal(true);
      
      // Gọi onComplete sau khi hiển thị điểm
      if (onComplete) {
        setTimeout(() => {
          onComplete({
            sessionId,
            scenario: scenario,
            conversation: conversation,
            finalScore: res.data
          });
        }, 5000); // Cho người dùng xem điểm 5 giây
      }
    } catch (err) {
      console.error("❌ Error evaluating final score:", err);
      alert("Không thể chấm điểm. Vui lòng thử lại.");
    }
  };

  // Màn hình vocabulary trước khi bắt đầu
  if (showVocabulary && vocabulary.length > 0) {
    return (
      <div className="speaking-scenario">
        <div className="scenario-header">
          <h3>{scenario.title}</h3>
          <button className="btn-cancel" onClick={onCancel}>
            Hủy
          </button>
        </div>
        
        <div className="scenario-content">
          <div className="scenario-intro" style={{ marginBottom: 30 }}>
            <h4>Mô tả tình huống:</h4>
            <p>{scenario.description}</p>
            <h4 style={{ marginTop: 20 }}>Nhiệm vụ:</h4>
            <p>{scenario.task}</p>
          </div>
          
          <div className="vocabulary-section" style={{ background: "#f9fafb", padding: 20, borderRadius: 8 }}>
            <h4>Gợi ý từ vựng:</h4>
            <div className="vocabulary-list" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginTop: 15 }}>
              {vocabulary.map((vocab, idx) => (
                <div key={idx} style={{ padding: 10, background: "white", borderRadius: 4, border: "1px solid #e5e7eb" }}>
                  <strong>{vocab.word}</strong>
                  {vocab.pronunciation && (
                    <div style={{ fontSize: 12, color: "#10b981" }}>/{vocab.pronunciation}/</div>
                  )}
                  {vocab.meaning && (
                    <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{vocab.meaning}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <button
            className="btn-primary"
            onClick={() => setShowVocabulary(false)}
            style={{ marginTop: 30, padding: "12px 24px", background: "#10b981", color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 16 }}
          >
            Bắt đầu trò chuyện
          </button>
        </div>
      </div>
    );
  }

  // Màn hình conversation
  return (
    <div className="speaking-scenario">
      <div className="scenario-header">
        <h3>{scenario.title}</h3>
        <button className="btn-cancel" onClick={onCancel}>
          Hủy
        </button>
      </div>
      
      <div className="scenario-content">
        <div className="conversation-container" style={{ 
          height: "400px", 
          overflowY: "auto", 
          padding: 20, 
          background: "#f9fafb", 
          borderRadius: 8,
          marginBottom: 20 
        }}>
          {conversation.map((msg, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: 15,
                display: "flex",
                justifyContent: msg.speaker === "learner" ? "flex-end" : "flex-start"
              }}
            >
              <div
                style={{
                  maxWidth: "70%",
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: msg.speaker === "learner" ? "#10b981" : "white",
                  color: msg.speaker === "learner" ? "white" : "#333",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
                  {msg.speaker === "learner" ? "Bạn" : scenario.character_name || "AI"}
                </div>
                <div>{msg.text}</div>
                {msg.audio && (
                  <audio controls src={URL.createObjectURL(msg.audio)} style={{ marginTop: 8, width: "100%" }} />
                )}
              </div>
            </div>
          ))}
          {isProcessing && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ padding: "12px 16px", background: "white", borderRadius: 12 }}>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
                  {scenario.character_name || "AI"}
                </div>
                <div>Đang suy nghĩ...</div>
              </div>
            </div>
          )}
          <div ref={conversationEndRef} />
        </div>

        {taskCompleted ? (
          <div style={{ textAlign: "center", padding: 30, background: "#f0fdf4", borderRadius: 8 }}>
            <h3 style={{ color: "#10b981", marginBottom: 10 }}>🎉 Chúc mừng!</h3>
            <p>Bạn đã hoàn thành nhiệm vụ!</p>
            {finalScore && (
              <div style={{ marginTop: 20 }}>
                <p style={{ fontSize: 18, fontWeight: "bold", color: "#10b981" }}>
                  Điểm số: {finalScore.final_score}/100
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="message-input-section" style={{ textAlign: "center" }}>
            {isProcessing ? (
              <div style={{ padding: 20 }}>
                <p style={{ color: "#666", marginBottom: 10 }}>Đang xử lý...</p>
                {isPlayingAI && (
                  <div style={{ fontSize: 14, color: "#10b981" }}>
                    🔊 AI đang nói...
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Hiển thị điểm hiện tại và số lần dùng gợi ý */}
                <div style={{ 
                  marginBottom: 15, 
                  padding: "10px 15px", 
                  background: "#f9fafb", 
                  borderRadius: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <div>
                    <span style={{ fontSize: 14, color: "#666" }}>Điểm hiện tại: </span>
                    <span style={{ fontSize: 18, fontWeight: "bold", color: "#10b981" }}>
                      {currentScore}/100
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: 14, color: "#666" }}>Gợi ý đã dùng: </span>
                    <span style={{ fontSize: 16, fontWeight: "600", color: "#ef4444" }}>
                      {hintsUsed}
                    </span>
                  </div>
                </div>

                {/* Hiển thị gợi ý nếu có */}
                {hint && (
                  <div style={{ 
                    marginBottom: 15, 
                    padding: 15, 
                    background: "#fff3cd", 
                    borderRadius: 8,
                    border: "1px solid #ffc107"
                  }}>
                    <div style={{ fontSize: 12, color: "#856404", marginBottom: 8, fontWeight: "600" }}>
                      💡 Gợi ý (mất 15 điểm mỗi lần dùng):
                    </div>
                    <div style={{ fontSize: 16, color: "#333", marginBottom: 8, fontStyle: "italic" }}>
                      "{hint.english}"
                    </div>
                    <div style={{ fontSize: 14, color: "#666" }}>
                      {hint.vietnamese}
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: 20, display: "flex", gap: 10, justifyContent: "center" }}>
                  <button
                    onClick={handleRecordClick}
                    disabled={isProcessing || isPlayingAI}
                    style={{
                      padding: "15px 30px",
                      background: isRecording ? "#ef4444" : "#10b981",
                      color: "white",
                      border: "none",
                      borderRadius: 50,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 16
                    }}
                  >
                    <FaMicrophone size={20} />
                    {isRecording ? "Dừng ghi âm" : "Nhấn để nói"}
                  </button>
                  
                  <button
                    onClick={handleGetHint}
                    disabled={isProcessing || isPlayingAI || loadingHint}
                    style={{
                      padding: "15px 20px",
                      background: "#ffc107",
                      color: "#333",
                      border: "none",
                      borderRadius: 50,
                      cursor: loadingHint ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 14,
                      fontWeight: "600",
                      opacity: loadingHint ? 0.6 : 1
                    }}
                  >
                    💡 Gợi ý {loadingHint ? "(Đang tải...)" : ""}
                  </button>
                </div>
                
                {audioBlob && !isRecording && (
                  <div style={{ marginBottom: 15 }}>
                    <p style={{ fontSize: 14, color: "#666", marginBottom: 8 }}>Audio đã ghi:</p>
                    <audio controls src={URL.createObjectURL(audioBlob)} style={{ width: "100%", marginBottom: 10 }} />
                    <button
                      onClick={handleSubmitAudio}
                      disabled={isProcessing}
                      style={{
                        padding: "10px 20px",
                        background: "#10b981",
                        color: "white",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer"
                      }}
                    >
                      Gửi audio
                    </button>
                  </div>
                )}
                
                {isRecording && (
                  <div style={{ marginTop: 15 }}>
                    <div style={{ fontSize: 14, color: "#ef4444" }}>
                      <span className="pulse" style={{ display: "inline-block", width: 10, height: 10, background: "#ef4444", borderRadius: "50%", marginRight: 8 }}></span>
                      Đang ghi âm...
                    </div>
                    <p style={{ fontSize: 12, color: "#666", marginTop: 5 }}>
                      Nhấn lại nút để dừng và gửi
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal hiển thị điểm cuối cùng */}
      {showScoreModal && finalScore && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000
          }}
          onClick={() => setShowScoreModal(false)}
        >
          <div 
            style={{
              background: "white",
              borderRadius: 16,
              padding: 30,
              maxWidth: 500,
              width: "90%",
              boxShadow: "0 10px 40px rgba(0,0,0,0.2)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: 20, color: "#10b981", textAlign: "center" }}>
              🎉 Kết quả chấm điểm
            </h2>
            
            <div style={{ textAlign: "center", marginBottom: 25 }}>
              <div style={{ fontSize: 48, fontWeight: "bold", color: "#10b981", marginBottom: 10 }}>
                {finalScore.final_score}/100
              </div>
              <div style={{ fontSize: 18, color: "#666" }}>Điểm tổng kết</div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                padding: "10px 0",
                borderBottom: "1px solid #e5e7eb"
              }}>
                <span style={{ color: "#666" }}>Độ hợp lý:</span>
                <span style={{ fontWeight: "600" }}>{finalScore.reasonableness_score || 0}/40</span>
              </div>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                padding: "10px 0",
                borderBottom: "1px solid #e5e7eb"
              }}>
                <span style={{ color: "#666" }}>Khả năng phản xạ:</span>
                <span style={{ fontWeight: "600" }}>{finalScore.reflex_score || 0}/30</span>
              </div>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                padding: "10px 0",
                borderBottom: "1px solid #e5e7eb"
              }}>
                <span style={{ color: "#666" }}>Phát âm:</span>
                <span style={{ fontWeight: "600" }}>{finalScore.pronunciation_score || 0}/20</span>
              </div>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                padding: "10px 0"
              }}>
                <span style={{ color: "#666" }}>Độc lập (không dùng gợi ý):</span>
                <span style={{ fontWeight: "600" }}>{finalScore.independence_score || 0}/10</span>
              </div>
            </div>

            {finalScore.feedback && (
              <div style={{ 
                padding: 15, 
                background: "#f9fafb", 
                borderRadius: 8,
                marginBottom: 20
              }}>
                <div style={{ fontSize: 14, fontWeight: "600", marginBottom: 8, color: "#333" }}>
                  Nhận xét:
                </div>
                <div style={{ fontSize: 14, color: "#666", lineHeight: 1.6 }}>
                  {finalScore.feedback}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setShowScoreModal(false);
                if (onComplete) {
                  onComplete({
                    sessionId,
                    scenario: scenario,
                    conversation: conversation,
                    finalScore: finalScore
                  });
                }
              }}
              style={{
                width: "100%",
                padding: "12px 24px",
                background: "#10b981",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 16,
                fontWeight: "600"
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

