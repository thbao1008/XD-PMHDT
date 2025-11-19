import React, { useState, useRef, useEffect } from "react";
import { getAuth } from "../../utils/auth";
import AudioRecorder from "../common/AudioRecorder";
import api from "../../api";
import "../../styles/speaking-practice.css";

export default function TellMeYourStory({ onBack }) {
  const auth = getAuth();
  const [conversation, setConversation] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [audioBlob, setAudioBlob] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Bắt đầu conversation với AI
    startConversation();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const startConversation = async () => {
    try {
      const userId = auth?.user?._id || auth?.user?.id;
      const learnerId = auth?.user?.learner_id;
      
      if (!userId && !learnerId) return;

      const res = await api.post("/learners/speaking-practice/story/sessions", {
        learner_id: learnerId,
        user_id: userId
      });

      setSessionId(res.data.session_id);
      setConversation([
        {
          type: "ai",
          text: res.data.initial_message ||
            "Xin chào! Tôi là AI của bạn. Hãy kể cho tôi nghe câu chuyện của bạn. Bạn có thể nói hoặc gõ tin nhắn. Tôi sẽ lắng nghe và chia sẻ cùng bạn.",
          timestamp: new Date()
        }
      ]);
    } catch (err) {
      console.error("❌ Error starting conversation:", err);
    }
  };

  const sendMessage = async (text = null, audio = null) => {
    if (!text && !audio) return;

    const userMessage = {
      type: "user",
      text: text || "[Audio message]",
      audio: audio,
      timestamp: new Date()
    };

    setConversation([...conversation, userMessage]);
    setSending(true);
    setCurrentMessage("");
    setAudioBlob(null);

    try {
      const formData = new FormData();
      if (text) formData.append("text", text);
      if (audio) formData.append("audio", audio);
      formData.append("session_id", sessionId);

      const res = await api.post(
        "/learners/speaking-practice/story/message",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const aiMessage = {
        type: "ai",
        text: res.data.response,
        timestamp: new Date()
      };

      setConversation((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error("❌ Error sending message:", err);
      const errorMessage = {
        type: "ai",
        text: "Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.",
        timestamp: new Date()
      };
      setConversation((prev) => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (currentMessage.trim()) {
      sendMessage(currentMessage.trim());
    }
  };

  const handleAudioRecorded = (blob) => {
    setAudioBlob(blob);
  };

  const handleSendAudio = () => {
    if (audioBlob) {
      sendMessage(null, audioBlob);
    }
  };

  return (
    <div className="tell-me-story">
      <div className="story-header">
        <button className="btn-back" onClick={onBack}>
          ← Quay lại
        </button>
        <h2>Tell me your story</h2>
        <p>Chia sẻ câu chuyện của bạn với AI. AI sẽ lắng nghe và đồng cảm cùng bạn.</p>
      </div>

      <div className="story-conversation">
        <div className="messages-container">
          {conversation.map((msg, idx) => (
            <div
              key={idx}
              className={`message ${msg.type === "user" ? "user-message" : "ai-message"}`}
            >
              <div className="message-content">
                {msg.audio && (
                  <audio controls src={URL.createObjectURL(msg.audio)} />
                )}
                {msg.text && <p>{msg.text}</p>}
              </div>
              <div className="message-time">
                {msg.timestamp.toLocaleTimeString()}
              </div>
            </div>
          ))}
          {sending && (
            <div className="message ai-message">
              <div className="message-content">
                <p>AI đang suy nghĩ...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="story-input">
          <form onSubmit={handleTextSubmit} className="text-input-form">
            <input
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Gõ tin nhắn của bạn..."
              disabled={sending}
            />
            <button type="submit" disabled={sending || !currentMessage.trim()}>
              Gửi
            </button>
          </form>

          <div className="audio-input">
            <AudioRecorder onRecorded={handleAudioRecorded} />
            {audioBlob && (
              <div className="audio-preview">
                <audio controls src={URL.createObjectURL(audioBlob)} />
                <button
                  className="btn-send-audio"
                  onClick={handleSendAudio}
                  disabled={sending}
                >
                  Gửi audio
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

