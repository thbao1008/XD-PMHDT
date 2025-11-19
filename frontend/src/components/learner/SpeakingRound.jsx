import React, { useState, useEffect, useRef } from "react";
import AudioRecorder from "../common/AudioRecorder";
import api from "../../api";
import { FaMicrophone } from "react-icons/fa";
import "../../styles/speaking-practice.css";

export default function SpeakingRound({
  sessionId,
  roundNumber,
  level,
  onSave,
  onCancel
}) {
  const [prompt, setPrompt] = useState("");
  const [timeLimit, setTimeLimit] = useState(30);
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [translation, setTranslation] = useState("");
  const [showTranslation, setShowTranslation] = useState(false);
  const [wordTooltip, setWordTooltip] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false); // Chỉ hiển thị prompt sau countdown
  const [highlightedWords, setHighlightedWords] = useState(new Set()); // Từ đã được nói đúng
  const timerRef = useRef(null);
  const countdownRef = useRef(null);
  const startTimeRef = useRef(null);
  const audioRecorderRef = useRef(null);
  const promptDataRef = useRef(null); // Lưu prompt data để hiển thị sau
  const recognitionRef = useRef(null); // Web Speech API recognition
  const isRecordingRef = useRef(false); // Ref để track recording state
  const mediaRecorderRef = useRef(null); // MediaRecorder instance
  const mediaStreamRef = useRef(null); // MediaStream from getUserMedia
  const audioChunksRef = useRef([]); // Audio chunks for MediaRecorder

  // Lấy prompt từ backend và tự động bắt đầu
  useEffect(() => {
    fetchPrompt();
    // Tự động bắt đầu sau khi fetch prompt (không cần countdown và nút "Bắt đầu")
    const autoStartTimer = setTimeout(() => {
      if (promptDataRef.current && !isRecording && !showPrompt) {
        console.log("🚀 Auto-starting round...");
        startRecording();
      }
    }, 800); // Đợi một chút để prompt data được set
    
    return () => clearTimeout(autoStartTimer);
  }, [sessionId, roundNumber, level]);

  // Bỏ countdown - không cần nữa vì tự động bắt đầu

  // Timer countdown khi đang ghi âm
  useEffect(() => {
    if (isRecording && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // Khi hết thời gian, đánh dấu để submit sau khi audio được tạo
            finishEarlyRef.current = true;
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, timeRemaining]);

  // Tự động submit khi đã highlight hết tất cả từ
  useEffect(() => {
    if (!isRecording || submitting) {
      console.log("⏸️ Auto-submit check skipped:", { isRecording, submitting });
      return;
    }
    
    const currentPrompt = prompt || promptDataRef.current?.prompt || "";
    if (!currentPrompt) {
      console.log("⏸️ No prompt available for auto-submit check");
      return;
    }
    
    const expectedWords = currentPrompt.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    console.log("🔍 Auto-submit check:", {
      highlighted: highlightedWords.size,
      expected: expectedWords.length,
      isComplete: highlightedWords.size >= expectedWords.length
    });
    
    // Kiểm tra nếu đã highlight hết
    if (highlightedWords.size >= expectedWords.length) {
      console.log("🎉 All words completed! Stopping recording and will auto-submit...");
      // Đánh dấu để submit
      finishEarlyRef.current = true;
      
      // Đợi một chút rồi dừng recording để đảm bảo audio đã được ghi đủ
      setTimeout(() => {
        console.log("🛑 Stopping recording (all words completed)...");
        // Stop MediaRecorder directly (không cần ref)
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          console.log("✅ Stopping MediaRecorder...");
          mediaRecorderRef.current.stop();
        } else {
          console.log("⚠️ MediaRecorder not active, calling stopRecording()");
          stopRecording(); // Dừng speech recognition và cleanup
        }
      }, 500);
    }
  }, [highlightedWords.size, isRecording, submitting, prompt, audioBlob]);

  const fetchPrompt = async () => {
    try {
      const res = await api.get(
        `/learners/speaking-practice/sessions/${sessionId}/prompt`,
        { params: { round: roundNumber, level } }
      );
      // Lưu prompt data nhưng chưa hiển thị
      promptDataRef.current = {
        prompt: res.data.prompt,
        timeLimit: res.data.time_limit || 30
      };
      setTimeLimit(res.data.time_limit || 30);
      // Reset các state khi fetch prompt mới
      setPrompt("");
      setShowPrompt(false);
      setAudioBlob(null);
      setAnalysis(null);
      setShowAnalysis(false);
      setTranslation("");
      setSubmitting(false);
      setIsRecording(false);
      isRecordingRef.current = false;
      setHighlightedWords(new Set());
      setTimeRemaining(res.data.time_limit || 30);
      setCountdown(null); // Reset countdown
    } catch (err) {
      console.error("❌ Error fetching prompt:", err);
    }
  };

  // Bỏ startCountdown - không cần nữa vì tự động bắt đầu

  const startRecording = () => {
    console.log("🎬 startRecording called");
    
    // Hiển thị prompt và bắt đầu ghi âm
    if (promptDataRef.current) {
      console.log("📝 Prompt data:", promptDataRef.current);
      const promptText = promptDataRef.current.prompt;
      setPrompt(promptText);
      setTimeLimit(promptDataRef.current.timeLimit);
      setTimeRemaining(promptDataRef.current.timeLimit);
      setShowPrompt(true);
      
      // Đảm bảo prompt được set trước khi start speech recognition
      console.log("✅ Prompt set to:", promptText);
    } else {
      console.warn("⚠️ No prompt data available");
      return; // Không start nếu không có prompt
    }
    
    setIsRecording(true);
    isRecordingRef.current = true;
    startTimeRef.current = Date.now();
    setHighlightedWords(new Set()); // Reset highlighted words
    
    // Đợi một chút để đảm bảo prompt state đã được update và refs được mount
    setTimeout(async () => {
      // Start Web Speech API for real-time recognition
      startSpeechRecognition();
      
      // Start audio recording directly using MediaRecorder
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
          console.log("🎤 MediaRecorder stopped, blob created:", blob.size, "bytes");
          handleAudioRecorded(blob);
          
          // Stop all tracks
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
          }
        };
        
        mr.start();
        console.log("✅ MediaRecorder started directly");
      } catch (err) {
        console.error("❌ Error starting MediaRecorder:", err);
        // Fallback to AudioRecorder if available
        if (audioRecorderRef.current && audioRecorderRef.current.startRecording) {
          audioRecorderRef.current.startRecording();
        } else {
          console.error("❌ AudioRecorder also not available");
        }
      }
    }, 100);
  };

  const startSpeechRecognition = () => {
    console.log("🎤 Starting speech recognition...");
    
    // Check if browser supports Web Speech API
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      console.warn("⚠️ Web Speech API not supported");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      console.log("🗣️ Speech recognition result:", event);
      
      // Sử dụng prompt từ ref hoặc state
      const currentPrompt = prompt || promptDataRef.current?.prompt || "";
      
      if (!currentPrompt) {
        console.warn("⚠️ No prompt available, prompt:", prompt, "promptDataRef:", promptDataRef.current);
        return;
      }
      
      console.log("📝 Using prompt:", currentPrompt);
      const expectedWords = currentPrompt.toLowerCase().split(/\s+/).filter(w => w.length > 0);
      
      // Lấy TẤT CẢ kết quả (cả interim và final) để highlight real-time như Duolingo
      let fullTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript + " ";
      }
      
      if (!fullTranscript.trim()) {
        console.log("⚠️ Empty transcript");
        return;
      }
      
      console.log("📝 Full transcript:", fullTranscript);
      
      const spokenWords = fullTranscript.toLowerCase().trim().split(/\s+/).filter(w => w.length > 0);
      
      console.log("📊 Expected words:", expectedWords);
      console.log("🗣️ Spoken words:", spokenWords);
      
      // So sánh từng từ đã nói với prompt theo thứ tự CHẶT CHẼ (giống Duolingo)
      // Chỉ highlight từ khi nói ĐÚNG THỨ TỰ từ đầu đến cuối
      setHighlightedWords(prev => {
        const newHighlighted = new Set();
        let spokenIdx = 0;
        let lastHighlightedIdx = -1;
        
        // Tìm từ cuối cùng đã được highlight để chỉ tiếp tục từ đó
        for (let i = expectedWords.length - 1; i >= 0; i--) {
          if (prev.has(i)) {
            lastHighlightedIdx = i;
            break;
          }
        }
        
        // Chỉ tìm từ tiếp theo (không được skip)
        const nextExpectedIdx = lastHighlightedIdx + 1;
        if (nextExpectedIdx >= expectedWords.length) {
          // Đã highlight hết rồi
          return prev;
        }
        
        const expectedWord = expectedWords[nextExpectedIdx];
        const cleanExpected = expectedWord.replace(/[.,!?;:]/g, "").toLowerCase();
        
        // Tìm từ tương ứng trong spoken words (từ vị trí hiện tại)
        for (let j = spokenIdx; j < spokenWords.length; j++) {
          const cleanSpoken = spokenWords[j].replace(/[.,!?;:]/g, "").toLowerCase();
          
          // So sánh chính xác hoặc gần đúng
          if (cleanSpoken === cleanExpected) {
            // Khớp chính xác
            console.log(`✅ Matched word ${nextExpectedIdx} (in order): "${cleanExpected}"`);
            newHighlighted.add(nextExpectedIdx);
            break;
          } else if (cleanSpoken.length > 0 && cleanExpected.length > 0) {
            // Kiểm tra similarity
            const similarity = calculateSimilarity(cleanSpoken, cleanExpected);
            if (similarity > 0.7) {
              // Khớp gần đúng (>70%)
              console.log(`✅ Matched word ${nextExpectedIdx} (similarity ${similarity.toFixed(2)}, in order): "${cleanExpected}"`);
              newHighlighted.add(nextExpectedIdx);
              break;
            }
          }
        }
        
        if (newHighlighted.size > 0) {
          const combined = new Set([...prev, ...newHighlighted]);
          console.log("✨ New highlighted words:", Array.from(newHighlighted));
          console.log("📊 Total highlighted:", combined.size, "/", expectedWords.length);
          
          // Kiểm tra nếu đã highlight hết tất cả từ
          if (combined.size >= expectedWords.length) {
            console.log("🎉 All words highlighted! Will auto-submit when audio is ready...");
            // Đánh dấu để submit khi audio được record
            finishEarlyRef.current = true;
          }
          
          return combined;
        }
        
        return prev; // Không có thay đổi
      });
    };
    
    // Helper function để tính similarity giữa 2 từ
    const calculateSimilarity = (str1, str2) => {
      const longer = str1.length > str2.length ? str1 : str2;
      const shorter = str1.length > str2.length ? str2 : str1;
      
      if (longer.length === 0) return 1.0;
      
      // Kiểm tra nếu một từ chứa từ kia
      if (longer.includes(shorter)) return 0.8;
      
      // Tính số ký tự giống nhau ở đầu
      let matchCount = 0;
      const minLen = Math.min(longer.length, shorter.length);
      for (let i = 0; i < minLen; i++) {
        if (longer[i] === shorter[i]) matchCount++;
      }
      
      return matchCount / longer.length;
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
    };

    recognition.onend = () => {
      // Tự động restart nếu vẫn đang recording
      // Sử dụng ref để lấy giá trị mới nhất
      setTimeout(() => {
        if (isRecordingRef.current && recognitionRef.current === recognition) {
          try {
            recognition.start();
          } catch (e) {
            // Ignore errors when restarting
          }
        }
      }, 100);
    };

    recognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    isRecordingRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors
      }
      recognitionRef.current = null;
    }
    
    // Stop MediaRecorder directly
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      console.log("🛑 Stopping MediaRecorder directly...");
      mediaRecorderRef.current.stop();
    }
    
    // Fallback to AudioRecorder if available
    if (audioRecorderRef.current && audioRecorderRef.current.stopRecording) {
      audioRecorderRef.current.stopRecording();
    }
    
    // Stop media stream tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const finishEarlyRef = useRef(false);

  const handleAudioRecorded = (blob) => {
    console.log("🎤 Audio recorded, finishEarly:", finishEarlyRef.current);
    setAudioBlob(blob);
    
    // Nếu đang trong quá trình finish early (bấm nút hoặc auto-submit), submit ngay
    if (finishEarlyRef.current) {
      finishEarlyRef.current = false;
      stopRecording();
      // Đợi một chút để đảm bảo audio đã được tạo hoàn toàn
      setTimeout(() => {
        console.log("⏩ Auto-submitting (all words completed)...");
        handleSubmit(blob);
      }, 500);
    } else {
      // Kiểm tra xem đã highlight hết chưa
      const currentPrompt = prompt || promptDataRef.current?.prompt || "";
      if (currentPrompt) {
        const expectedWords = currentPrompt.toLowerCase().split(/\s+/).filter(w => w.length > 0);
        const currentHighlighted = highlightedWords.size;
        console.log("📊 Checking highlighted words after recording:", currentHighlighted, "/", expectedWords.length);
        if (currentHighlighted >= expectedWords.length) {
          console.log("🎉 All words completed after recording, auto-submitting...");
          // Đợi một chút rồi submit
          setTimeout(() => {
            handleSubmit(blob);
          }, 500);
        }
      }
      stopRecording();
    }
  };

  const handleFinishEarly = () => {
    console.log("⏩ handleFinishEarly called, isRecording:", isRecording, "audioBlob:", !!audioBlob);
    
    if (isRecording) {
      // Đánh dấu là muốn finish early
      finishEarlyRef.current = true;
      console.log("✅ Set finishEarlyRef to true");
      
      // Dừng AudioRecorder trước
      if (audioRecorderRef.current && audioRecorderRef.current.stopRecording) {
        console.log("🛑 Stopping AudioRecorder...");
        audioRecorderRef.current.stopRecording();
      } else {
        console.warn("⚠️ AudioRecorder ref not available for stop");
      }
      
      // Dừng ghi âm sớm
      stopRecording();
      
      // Nếu không có audioRecorderRef, thử submit với audioBlob hiện tại hoặc đợi
      if (!audioRecorderRef.current && audioBlob) {
        console.log("📤 AudioRecorder ref missing, but have audioBlob, submitting...");
        setTimeout(() => {
          handleSubmit(audioBlob);
        }, 500);
      }
    } else if (audioBlob) {
      // Nếu đã có audio, submit ngay
      console.log("📤 Submitting existing audio...");
      handleSubmit(audioBlob);
    } else {
      console.warn("⚠️ No recording or audio available");
    }
  };

  const handleSubmit = async (blob = null) => {
    const audio = blob || audioBlob;
    if (!audio) {
      alert("Vui lòng ghi âm trước khi nộp bài");
      return;
    }

    if (submitting) {
      console.log("⚠️ Already submitting, skipping...");
      return; // Tránh submit nhiều lần
    }

    console.log("📤 Starting submit process...");
    setSubmitting(true);
    const timeTaken = startTimeRef.current
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : timeLimit - timeRemaining;

    try {
      // Gửi audio
      const formData = new FormData();
      formData.append("audio", audio);
      formData.append("time_taken", timeTaken);
      formData.append("round_number", roundNumber);

      const res = await api.post(
        `/learners/speaking-practice/sessions/${sessionId}/rounds`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      console.log("✅ Round submitted, round_id:", res.data.round_id);

      // Đợi analysis từ backend
      setLoadingAnalysis(true);
      const roundId = res.data.round_id;
      
      // Polling để lấy analysis
      const pollAnalysis = async (retries = 30) => {
        try {
          const analysisRes = await api.get(
            `/learners/speaking-practice/sessions/${sessionId}/rounds/${roundId}/analysis`
          );
          
          if (analysisRes.data && analysisRes.data.analysis) {
            console.log("✅ Analysis received:", analysisRes.data);
            setAnalysis({
              ...analysisRes.data.analysis,
              round_id: roundId,
              time_taken: timeTaken
            });
            setShowAnalysis(true);
            setLoadingAnalysis(false);
            setSubmitting(false);
          } else if (retries > 0) {
            // Chưa có analysis, đợi thêm
            setTimeout(() => pollAnalysis(retries - 1), 2000);
          } else {
            // Timeout, chuyển vòng mà không có analysis
            console.warn("⚠️ Analysis timeout, proceeding without analysis");
            setLoadingAnalysis(false);
            setSubmitting(false);
            const roundData = {
              audioBlob: audio,
              timeTaken,
              prompt: prompt || promptDataRef.current?.prompt || "",
              round_id: roundId
            };
            if (onSave && typeof onSave === 'function') {
              onSave(roundData);
            }
          }
        } catch (err) {
          if (retries > 0) {
            setTimeout(() => pollAnalysis(retries - 1), 2000);
          } else {
            console.error("❌ Error fetching analysis:", err);
            setLoadingAnalysis(false);
            setSubmitting(false);
            // Chuyển vòng mà không có analysis
            const roundData = {
              audioBlob: audio,
              timeTaken,
              prompt: prompt || promptDataRef.current?.prompt || "",
              round_id: roundId
            };
            if (onSave && typeof onSave === 'function') {
              onSave(roundData);
            }
          }
        }
      };
      
      // Bắt đầu polling sau 2 giây
      setTimeout(() => pollAnalysis(), 2000);
    } catch (err) {
      console.error("❌ Error submitting round:", err);
      alert("Có lỗi xảy ra. Vui lòng thử lại.");
      setSubmitting(false);
    }
  };

  const handleTranslationSubmit = async () => {
    if (!translation.trim()) {
      alert("Vui lòng viết nghĩa của đoạn văn");
      return;
    }

    try {
      // Gửi translation để AI kiểm tra
      const res = await api.post(
        `/learners/speaking-practice/sessions/${sessionId}/rounds/${analysis?.round_id}/translation`,
        { translation }
      );

      if (res.data.correct) {
        alert("Chính xác! Bạn đã hiểu đúng nghĩa của đoạn văn.");
        // Chuyển sang vòng tiếp theo
        onSave({
          audioBlob,
          timeTaken: analysis?.time_taken,
          prompt,
          round_id: analysis?.round_id,
          translation: translation
        });
      } else {
        alert(`Chưa chính xác. ${res.data.feedback || "Hãy thử lại."}`);
      }
    } catch (err) {
      console.error("❌ Error submitting translation:", err);
      alert("Có lỗi xảy ra. Vui lòng thử lại.");
    }
  };

  const fetchWordDefinition = async (word) => {
    try {
      const res = await api.get(`/learners/dictionary/${encodeURIComponent(word)}`);
      return res.data;
    } catch (err) {
      console.error("❌ Error fetching word definition:", err);
      return null;
    }
  };

  const handleWordHover = async (word) => {
    const definition = await fetchWordDefinition(word);
    if (definition) {
      setWordTooltip({ word, ...definition });
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Bỏ countdown overlay - không cần nữa vì tự động bắt đầu

  // Hiển thị màn hình phân tích sau khi nói xong
  if (showAnalysis && analysis) {
    return (
      <div className="speaking-round">
        <div className="round-header">
          <h3>Vòng {roundNumber}/10 - Kết quả</h3>
          <button className="btn-cancel" onClick={onCancel}>
            Hủy
          </button>
        </div>

        <div className="analysis-section" style={{ padding: 20 }}>
          <h4>Đánh giá phát âm:</h4>
          
          {/* Điểm tổng quát */}
          <div className="analysis-scores" style={{ display: "flex", gap: 20, marginBottom: 20 }}>
            {analysis.vocabulary_score !== undefined && (
              <div className="analysis-score-card" style={{ flex: 1, padding: 15, background: "#f0f9ff", borderRadius: 8 }}>
                <div style={{ fontSize: 14, color: "#666", marginBottom: 5 }}>Điểm từ vựng</div>
                <div style={{ fontSize: 32, fontWeight: "bold", color: "#10b981" }}>
                  {analysis.vocabulary_score}/10
                </div>
              </div>
            )}
            {analysis.speaking_score !== undefined && (
              <div className="analysis-score-card" style={{ flex: 1, padding: 15, background: "#f0f9ff", borderRadius: 8 }}>
                <div style={{ fontSize: 14, color: "#666", marginBottom: 5 }}>Điểm nói</div>
                <div style={{ fontSize: 32, fontWeight: "bold", color: "#10b981" }}>
                  {analysis.speaking_score}/10
                </div>
              </div>
            )}
          </div>

          {/* Tốc độ nói */}
          {analysis.speech_rate !== undefined && (
            <div className="analysis-item" style={{ marginBottom: 15 }}>
              <strong>Tốc độ nói:</strong> {analysis.speech_rate} từ/phút
            </div>
          )}

          {/* Ngữ pháp */}
          {analysis.grammar_errors && analysis.grammar_errors.length > 0 && (
            <div className="analysis-item" style={{ marginBottom: 15 }}>
              <strong>Lỗi ngữ pháp:</strong>
              <ul style={{ marginTop: 5, paddingLeft: 20 }}>
                {analysis.grammar_errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Số từ chưa nói được */}
          {analysis.missing_words && analysis.missing_words.length > 0 && (
            <div className="analysis-item" style={{ marginBottom: 15 }}>
              <strong>Số từ chưa nói được:</strong> {analysis.missing_words.length}
              <div style={{ marginTop: 5, color: "#666" }}>
                {analysis.missing_words.join(", ")}
              </div>
            </div>
          )}

          {/* Feedback tổng quát */}
          {analysis.feedback && (
            <div className="analysis-feedback" style={{ marginTop: 15, padding: 15, background: "#f9fafb", borderRadius: 8 }}>
              <strong>Nhận xét:</strong>
              <p style={{ marginTop: 5 }}>{analysis.feedback}</p>
            </div>
          )}
        </div>

        {/* Phần nhập nghĩa */}
        {!showTranslation ? (
          <div className="translation-section" style={{ marginTop: 30, padding: 20 }}>
            <h4>Viết lại nghĩa của đoạn văn:</h4>
            <div className="prompt-text" style={{ position: "relative", marginBottom: 15, padding: 15, background: "#f9fafb", borderRadius: 8 }}>
              {prompt.split(/\s+/).map((word, idx) => {
                const cleanWord = word.replace(/[.,!?;:]/g, "").toLowerCase();
                return (
                  <span
                    key={idx}
                    className="prompt-word"
                    onMouseEnter={() => handleWordHover(cleanWord)}
                    onMouseLeave={() => setWordTooltip(null)}
                    style={{ cursor: "pointer", textDecoration: "underline" }}
                  >
                    {word}{" "}
                  </span>
                );
              })}
              {wordTooltip && (
                <div className="word-tooltip">
                  <div className="tooltip-word">
                    <strong>{wordTooltip.word}</strong>
                  </div>
                  {wordTooltip.pronunciation && (
                    <div className="tooltip-pronunciation" style={{ marginTop: 8, color: "#10b981", fontWeight: "bold" }}>
                      <strong>Phát âm:</strong> /{wordTooltip.pronunciation}/
                    </div>
                  )}
                  {wordTooltip.definition && (
                    <div className="tooltip-definition">
                      <strong>Nghĩa:</strong> {wordTooltip.definition}
                    </div>
                  )}
                  {wordTooltip.usage && (
                    <div className="tooltip-usage">
                      <strong>Cách dùng:</strong> {wordTooltip.usage}
                    </div>
                  )}
                  {wordTooltip.example && (
                    <div className="tooltip-example">
                      <strong>Ví dụ:</strong> {wordTooltip.example}
                    </div>
                  )}
                </div>
              )}
            </div>
            <textarea
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              rows="4"
              placeholder="Viết nghĩa tiếng Việt của đoạn văn trên (chỉ cần đúng tương đối)..."
              className="translation-input"
              style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ddd" }}
            />
            <div className="translation-actions" style={{ marginTop: 15, display: "flex", gap: 10 }}>
              <button
                className="btn-submit"
                onClick={handleTranslationSubmit}
                disabled={!translation.trim()}
                style={{ padding: "10px 20px", background: "#10b981", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}
              >
                Gửi
              </button>
              <button
                className="btn-skip"
                onClick={() => {
                  // Bỏ qua translation, chuyển vòng
                  const roundData = {
                    audioBlob,
                    timeTaken: analysis.time_taken,
                    prompt,
                    round_id: analysis.round_id
                  };
                  if (onSave && typeof onSave === 'function') {
                    onSave(roundData);
                  }
                }}
                style={{ padding: "10px 20px", background: "#6b7280", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}
              >
                Bỏ qua
              </button>
            </div>
          </div>
        ) : (
          <div className="translation-result" style={{ marginTop: 30, padding: 20, background: "#f0fdf4", borderRadius: 8 }}>
            <p style={{ marginBottom: 15 }}>✅ Bạn đã hoàn thành vòng này!</p>
            <button
              className="btn-primary"
              onClick={() => {
                const roundData = {
                  audioBlob,
                  timeTaken: analysis.time_taken,
                  prompt,
                  round_id: analysis.round_id,
                  translation: translation
                };
                if (onSave && typeof onSave === 'function') {
                  onSave(roundData);
                }
              }}
              style={{ padding: "10px 20px", background: "#10b981", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}
            >
              Tiếp tục
            </button>
          </div>
        )}
      </div>
    );
  }

  // Hiển thị loading khi đang chờ analysis
  if (loadingAnalysis || (submitting && !showAnalysis)) {
    return (
      <div className="speaking-round">
        <div className="round-header">
          <h3>Vòng {roundNumber}/10</h3>
          <button className="btn-cancel" onClick={onCancel}>
            Hủy
          </button>
        </div>
        <div className="round-content" style={{ textAlign: "center", padding: 40 }}>
          <p style={{ fontSize: 18, color: "#666" }}>Đang xử lý...</p>
        </div>
      </div>
    );
  }

  // Màn hình chính - ghi âm
  return (
    <div className="speaking-round">
      <div className="round-header">
        <h3>Vòng {roundNumber}/10</h3>
        <button className="btn-cancel" onClick={onCancel}>
          Hủy
        </button>
      </div>

      <div className="round-content">
        {showPrompt ? (
          <>
            <div className="prompt-section">
              <h4>Đọc đoạn văn sau:</h4>
              <div className="prompt-text" style={{ position: "relative" }}>
                {prompt.split(/\s+/).map((word, idx) => {
                  const cleanWord = word.replace(/[.,!?;:]/g, "").toLowerCase();
                  const isHighlighted = highlightedWords.has(idx);
                  return (
                    <span
                      key={idx}
                      className={`prompt-word ${isHighlighted ? "word-highlighted" : ""}`}
                      onMouseEnter={() => handleWordHover(cleanWord)}
                      onMouseLeave={() => setWordTooltip(null)}
                    >
                      {word}{" "}
                    </span>
                  );
                })}
                {wordTooltip && (
                  <div className="word-tooltip">
                    <div className="tooltip-word">
                      <strong>{wordTooltip.word}</strong>
                    </div>
                    {wordTooltip.pronunciation && (
                      <div className="tooltip-pronunciation" style={{ marginTop: 8, color: "#10b981", fontWeight: "bold" }}>
                        <strong>Phát âm:</strong> /{wordTooltip.pronunciation}/
                      </div>
                    )}
                    {wordTooltip.definition && (
                      <div className="tooltip-definition">
                        <strong>Nghĩa:</strong> {wordTooltip.definition}
                      </div>
                    )}
                    {wordTooltip.usage && (
                      <div className="tooltip-usage">
                        <strong>Cách dùng:</strong> {wordTooltip.usage}
                      </div>
                    )}
                    {wordTooltip.example && (
                      <div className="tooltip-example">
                        <strong>Ví dụ:</strong> {wordTooltip.example}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="time-limit">
                Thời gian: <strong>{formatTime(timeRemaining)}</strong>
              </div>
            </div>

            <div className="recording-section">
              <div className="mic-container">
                <div className={`mic-icon ${isRecording ? "recording" : ""}`}>
                  <FaMicrophone size={64} />
                </div>
                {isRecording && (
                  <div className="recording-waves">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                )}
              </div>
              
              {isRecording && (
                <div className="recording-active">
                  <div className="recording-indicator">
                    <span className="pulse"></span>
                    Đang ghi âm...
                  </div>
                  <div className="time-remaining">
                    Còn lại: <strong>{formatTime(timeRemaining)}</strong>
                  </div>
                  <div style={{ marginTop: 12, fontSize: 14, color: "#666" }}>
                    Nói đúng hết tất cả từ sẽ tự động chuyển vòng
                  </div>
                </div>
              )}

              {audioBlob && !isRecording && !submitting && (
                <div className="audio-complete">
                  <p style={{ marginBottom: 12, color: "#10b981" }}>
                    ✅ Đã ghi âm xong. Đang xử lý...
                  </p>
                  <audio controls src={URL.createObjectURL(audioBlob)} style={{ width: "100%", marginBottom: 12 }} />
                </div>
              )}

              {submitting && (
                <div className="submitting-indicator">
                  <p>Đang xử lý...</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="recording-section">
            <div className="recording-controls">
              <p style={{ textAlign: "center", color: "#666" }}>
                Đang tải đề bài...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
