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
  const [progressAnimationKey, setProgressAnimationKey] = useState(0); // Key để restart animation
  const timeRemainingRef = useRef(timeLimit); // Ref để track timeRemaining cho progress
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [wordTooltip, setWordTooltip] = useState(null);
  const [openWordTooltip, setOpenWordTooltip] = useState(null); // Word đang mở tooltip
  const [wordDefinitionsCache, setWordDefinitionsCache] = useState(() => {
    // Load cache từ localStorage khi component mount
    try {
      const cached = localStorage.getItem('wordDefinitionsCache');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });
  const [loadingWords, setLoadingWords] = useState({}); // Loading state cho từng từ
  const [preloadingWords, setPreloadingWords] = useState(false); // Đang preload từ
  const [countdown, setCountdown] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false); // Chỉ hiển thị prompt sau countdown
  const [highlightedWords, setHighlightedWords] = useState(new Set()); // Từ đã được nói đúng
  const [missingWords, setMissingWords] = useState(new Set()); // Từ không nói được (sau khi kiểm tra)
  const [loadingPrompt, setLoadingPrompt] = useState(true); // Loading state cho prompt
  const [promptError, setPromptError] = useState(null); // Error state cho prompt
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
  const progressIntervalRef = useRef(null); // Ref cho progress interval

  // Lấy prompt từ backend và tự động bắt đầu
  useEffect(() => {
    setLoadingPrompt(true);
    setPromptError(null);
    fetchPrompt();
  }, [sessionId, roundNumber, level]);
  
  // Auto-start sau khi prompt được load
  useEffect(() => {
    if (promptDataRef.current && !isRecording && !showPrompt && !loadingPrompt && !promptError) {
      const autoStartTimer = setTimeout(() => {
        if (promptDataRef.current && !isRecording) {
          startRecording();
        }
      }, 500); // Đợi một chút để prompt data được set
      
      return () => clearTimeout(autoStartTimer);
    }
  }, [loadingPrompt, promptError, isRecording, showPrompt]);

  // Bỏ countdown - không cần nữa vì tự động bắt đầu

  // Timer countdown khi đang ghi âm
  useEffect(() => {
    if (isRecording && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          const newValue = prev <= 1 ? 0 : prev - 1;
          timeRemainingRef.current = newValue;
          if (prev <= 1) {
            // Khi hết thời gian, đánh dấu để submit sau khi audio được tạo
            finishEarlyRef.current = true;
            stopRecording();
          }
          return newValue;
        });
      }, 1000);
      
      // Trigger CSS animation bằng cách thay đổi key
      setProgressAnimationKey(prev => prev + 1);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setProgressAnimationKey(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isRecording, timeLimit]);

  // Bỏ auto-submit khi highlight hết - không highlight nữa nên không cần

  const fetchPrompt = async () => {
    try {
      setLoadingPrompt(true);
      setPromptError(null);
      
      const res = await api.get(
        `/learners/speaking-practice/sessions/${sessionId}/prompt`,
        { params: { round: roundNumber, level } }
      );
      
      if (!res.data || !res.data.prompt) {
        throw new Error("Không nhận được prompt từ server");
      }
      
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
      setSubmitting(false);
      setIsRecording(false);
      isRecordingRef.current = false;
      setHighlightedWords(new Set());
      setTimeRemaining(res.data.time_limit || 30);
      setCountdown(null); // Reset countdown
      setLoadingPrompt(false);
      
      // Pre-fetch tất cả từ trong prompt ngay khi load
      if (res.data.prompt) {
        preloadWordDefinitions(res.data.prompt);
      }
    } catch (err) {
      console.error("❌ Error fetching prompt:", err);
      setPromptError(err?.response?.data?.message || err?.message || "Không thể tải đề bài. Vui lòng thử lại.");
      setLoadingPrompt(false);
      
      // Retry sau 2 giây
      setTimeout(() => {
        fetchPrompt();
      }, 2000);
    }
  };

  // Bỏ startCountdown - không cần nữa vì tự động bắt đầu

  const startRecording = () => {
    // Hiển thị prompt và bắt đầu ghi âm
    if (promptDataRef.current) {
      const promptText = promptDataRef.current.prompt;
      setPrompt(promptText);
      setTimeLimit(promptDataRef.current.timeLimit);
      setTimeRemaining(promptDataRef.current.timeLimit);
      timeRemainingRef.current = promptDataRef.current.timeLimit;
      setShowPrompt(true);
    } else {
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
          handleAudioRecorded(blob);
          
          // Stop all tracks
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
          }
        };
        
        mr.start();
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

  // Helper function để tính similarity giữa 2 từ (Levenshtein-like)
  const calculateSimilarity = (str1, str2) => {
    if (!str1 || !str2) return 0;
    
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    // Exact match
    if (s1 === s2) return 1.0;
    
    // One contains the other
    if (s1.includes(s2) || s2.includes(s1)) {
      const longer = s1.length > s2.length ? s1 : s2;
      const shorter = s1.length > s2.length ? s2 : s1;
      return shorter.length / longer.length;
    }
    
    // Calculate character match ratio
    let matchCount = 0;
    const minLen = Math.min(s1.length, s2.length);
    const maxLen = Math.max(s1.length, s2.length);
    
    // Check prefix match
    for (let i = 0; i < minLen; i++) {
      if (s1[i] === s2[i]) matchCount++;
      else break;
    }
    
    // Check suffix match
    let suffixMatch = 0;
    for (let i = 1; i <= minLen; i++) {
      if (s1[s1.length - i] === s2[s2.length - i]) suffixMatch++;
      else break;
    }
    
    // Use the better match (prefix or suffix)
    const bestMatch = Math.max(matchCount, suffixMatch);
    return bestMatch / maxLen;
  };

  const startSpeechRecognition = () => {
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
      // Sử dụng prompt từ ref hoặc state
      const currentPrompt = prompt || promptDataRef.current?.prompt || "";
      
      if (!currentPrompt) {
        return;
      }
      
      // Lấy toàn bộ transcript từ đầu đến hiện tại (tích lũy)
      let fullTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript;
      }
      
      // Chuyển transcript và prompt thành lowercase để so sánh
      const transcriptLower = fullTranscript.toLowerCase().trim();
      const transcriptWords = transcriptLower.split(/\s+/).map(w => w.replace(/[.,!?;:]/g, ""));
      const promptWords = currentPrompt.toLowerCase().split(/\s+/).map(w => w.replace(/[.,!?;:]/g, ""));
      
      // Tìm các từ đã được nói - so sánh theo thứ tự và similarity
      const newHighlightedWords = new Set();
      let transcriptWordIndex = 0;
      
      promptWords.forEach((promptWord, promptIdx) => {
        // Tìm từ trong transcript bắt đầu từ vị trí hiện tại
        for (let i = transcriptWordIndex; i < transcriptWords.length; i++) {
          const transcriptWord = transcriptWords[i];
          
          // Kiểm tra exact match hoặc similarity cao
          if (promptWord === transcriptWord) {
            // Exact match - chắc chắn đúng
            newHighlightedWords.add(promptIdx);
            transcriptWordIndex = i + 1; // Di chuyển pointer
            break;
          } else {
            const similarity = calculateSimilarity(promptWord, transcriptWord);
            if (similarity > 0.7) {
              // Similarity cao - có thể đúng
              newHighlightedWords.add(promptIdx);
              transcriptWordIndex = i + 1; // Di chuyển pointer
              break;
            } else if (promptWord.length > 3 && transcriptWord.includes(promptWord)) {
              // Từ dài và transcript chứa prompt word - có thể đúng
              newHighlightedWords.add(promptIdx);
              transcriptWordIndex = i + 1;
              break;
            } else if (promptWord.includes(transcriptWord) && transcriptWord.length > 2) {
              // Prompt word chứa transcript word và transcript word đủ dài - có thể đúng
              newHighlightedWords.add(promptIdx);
              transcriptWordIndex = i + 1;
              break;
            }
          }
        }
      });
      
      // Cập nhật highlighted words
      setHighlightedWords(newHighlightedWords);
      
      // Tự động chuyển vòng nếu đã đọc đúng hết tất cả từ
      if (newHighlightedWords.size === promptWords.length && isRecordingRef.current) {
        // Đợi một chút để đảm bảo audio được ghi xong
        setTimeout(() => {
          if (isRecordingRef.current) {
            stopRecording();
          }
        }, 500);
      }
    };

    recognition.onerror = (event) => {
      // Ignore "aborted" errors - xảy ra khi stop() được gọi
      if (event.error === 'aborted') {
        return;
      }
      console.error("Speech recognition error:", event.error);
      
      // Chỉ restart nếu không phải lỗi aborted và vẫn đang recording
      if (event.error !== 'aborted' && isRecordingRef.current && recognitionRef.current === recognition) {
        setTimeout(() => {
          if (isRecordingRef.current && recognitionRef.current === recognition) {
            try {
              recognition.start();
            } catch (e) {
              // Ignore errors when restarting
            }
          }
        }, 500);
      }
    };

    recognition.onend = () => {
      // Tự động restart nếu vẫn đang recording và không bị abort
      if (isRecordingRef.current && recognitionRef.current === recognition) {
        setTimeout(() => {
          if (isRecordingRef.current && recognitionRef.current === recognition) {
            try {
              recognition.start();
            } catch (e) {
              // Ignore errors when restarting (có thể bị aborted)
              if (e.name !== 'InvalidStateError' && !e.message?.includes('abort')) {
                console.warn("Speech recognition restart error:", e);
              }
            }
          }
        }, 100);
      }
    };

    // Lưu recognition vào ref để có thể stop sau
    recognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch (err) {
      console.error("❌ Failed to start speech recognition:", err);
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
        // Abort thay vì stop để tránh lỗi
        if (recognitionRef.current.abort) {
          recognitionRef.current.abort();
        } else {
          recognitionRef.current.stop();
        }
      } catch (e) {
        // Ignore errors (có thể đã bị stop rồi)
      }
      recognitionRef.current = null;
    }
    
    // Stop MediaRecorder directly
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
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
    setAudioBlob(blob);
    
    // Nếu đang trong quá trình finish early (bấm nút hoặc auto-submit), submit ngay
    if (finishEarlyRef.current) {
      finishEarlyRef.current = false;
      stopRecording();
      // Đợi một chút để đảm bảo audio đã được tạo hoàn toàn
      setTimeout(() => {
        handleSubmit(blob);
      }, 500);
    } else {
      // Không cần kiểm tra highlight nữa - chỉ dừng recording
      stopRecording();
    }
  };

  const handleFinishEarly = () => {
    if (isRecording) {
      // Đánh dấu là muốn finish early
      finishEarlyRef.current = true;
      
      // Dừng AudioRecorder trước
      if (audioRecorderRef.current && audioRecorderRef.current.stopRecording) {
        audioRecorderRef.current.stopRecording();
      }
      
      // Dừng ghi âm sớm
      stopRecording();
      
      // Nếu không có audioRecorderRef, thử submit với audioBlob hiện tại hoặc đợi
      if (!audioRecorderRef.current && audioBlob) {
        setTimeout(() => {
          handleSubmit(audioBlob);
        }, 500);
      }
    } else if (audioBlob) {
      // Nếu đã có audio, submit ngay
      handleSubmit(audioBlob);
    }
  };

  const handleSubmit = async (blob = null) => {
    const audio = blob || audioBlob;
    if (!audio) {
      alert("Vui lòng ghi âm trước khi nộp bài");
      return;
    }

    if (submitting) {
      return; // Tránh submit nhiều lần
    }

    setSubmitting(true);
    const timeTaken = startTimeRef.current
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : timeLimit - timeRemaining;

    try {
      // Gửi audio kèm prompt để lưu vào database
      const formData = new FormData();
      formData.append("audio", audio);
      formData.append("time_taken", timeTaken);
      formData.append("round_number", roundNumber);
      formData.append("prompt", prompt || promptDataRef.current?.prompt || ""); // QUAN TRỌNG: Gửi prompt để lưu vào DB

      const res = await api.post(
        `/learners/speaking-practice/sessions/${sessionId}/rounds`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const roundId = res.data.round_id;
      
      // Fetch analysis để lấy missing words và highlight
      let missingWordsList = [];
      try {
        const analysisRes = await api.get(
          `/learners/speaking-practice/sessions/${sessionId}/rounds/${roundId}/analysis`
        );
        
        if (analysisRes.data && analysisRes.data.analysis) {
          const analysis = typeof analysisRes.data.analysis === 'string' 
            ? JSON.parse(analysisRes.data.analysis) 
            : analysisRes.data.analysis;
          
          missingWordsList = analysis.missing_words || [];
          if (missingWordsList.length > 0) {
            // Tạo Set từ missing words để highlight
            const promptWords = (prompt || promptDataRef.current?.prompt || "").toLowerCase().split(/\s+/);
            const missingSet = new Set();
            
            promptWords.forEach((word, idx) => {
              const cleanWord = word.replace(/[.,!?;:]/g, "");
              if (missingWordsList.some(mw => mw.toLowerCase().replace(/[.,!?;:]/g, "") === cleanWord)) {
                missingSet.add(idx);
              }
            });
            
            setMissingWords(missingSet);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch analysis for missing words:", err);
      }
      
      // Không đợi analysis, chuyển vòng ngay
      setSubmitting(false);
      
      const roundData = {
        audioBlob: audio,
        timeTaken,
        prompt: prompt || promptDataRef.current?.prompt || "",
        round_id: roundId,
        missing_words: missingWordsList // Lưu missing_words từ analysis
      };
      
      // Chuyển vòng ngay
      if (onSave && typeof onSave === 'function') {
        onSave(roundData);
      }
    } catch (err) {
      console.error("❌ Error submitting round:", err);
      alert("Có lỗi xảy ra. Vui lòng thử lại.");
      setSubmitting(false);
    }
  };


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
      
      // Lưu vào localStorage (chỉ lưu 100 từ gần nhất để tránh quá lớn)
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

  // Pre-load tất cả từ trong prompt để cache sẵn
  const preloadWordDefinitions = async (promptText) => {
    if (!promptText || preloadingWords) return;
    
    setPreloadingWords(true);
    
    // Extract unique words
    const words = promptText
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/[.,!?;:]/g, ""))
      .filter((w) => w.length > 0)
      .filter((w, i, arr) => arr.indexOf(w) === i); // Remove duplicates
    
    // Pre-fetch tất cả từ song song (batch 10 từ một lúc để nhanh hơn)
    const batchSize = 10;
    for (let i = 0; i < words.length; i += batchSize) {
      const batch = words.slice(i, i + batchSize);
      
      // Fetch song song tất cả từ trong batch
      const fetchPromises = batch
        .filter(word => !wordDefinitionsCache[word] && !loadingWords[word])
        .map(word => fetchWordDefinition(word).catch(err => {
          console.warn(`Failed to preload definition for ${word}:`, err);
          return null;
        }));
      
      // Đợi batch này hoàn thành trước khi chuyển batch tiếp theo
      await Promise.all(fetchPromises);
      
      // Không cần delay giữa các batch vì đã đợi batch trước hoàn thành
    }
    
    setPreloadingWords(false);
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

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Bỏ countdown overlay - không cần nữa vì tự động bắt đầu

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
            <div className="prompt-section" style={{ position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h4 style={{ margin: 0 }}>Đọc đoạn văn sau:</h4>
                {/* Circular Progress Indicator - Vòng tròn nhỏ ở góc trên phải */}
                {isRecording && (
                  <div 
                    key={progressAnimationKey}
                    style={{
                      width: "48px",
                      height: "48px",
                      position: "relative",
                      flexShrink: 0
                    }}
                  >
                    <svg 
                      width="48" 
                      height="48" 
                      style={{ transform: "rotate(-90deg)" }}
                    >
                      {/* Background circle */}
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="4"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 20}`}
                        strokeDashoffset={`${2 * Math.PI * 20}`}
                        style={{
                          animation: `progressCircleComplete ${timeLimit}s linear forwards`
                        }}
                      />
                    </svg>
                    {/* Time remaining text */}
                    <div style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      fontSize: "12px",
                      fontWeight: "bold",
                      color: "#10b981"
                    }}>
                      {timeRemaining}
                    </div>
                  </div>
                )}
              </div>
              <div className="prompt-text" style={{ 
                position: "relative", 
                zIndex: 2, 
                padding: "24px",
                background: "white",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                fontSize: "18px",
                lineHeight: "1.8",
                color: "#333"
              }}>
                {(() => {
                  // Tách prompt thành words và spaces để map đúng index
                  const parts = prompt.split(/(\s+)/);
                  let wordIndex = 0; // Index của từ trong prompt (bỏ qua spaces)
                  
                  return parts.map((part, idx) => {
                    // Nếu là khoảng trắng, render trực tiếp
                    if (/^\s+$/.test(part)) {
                      return <span key={idx}>{part}</span>;
                    }
                    
                    // Đây là một từ
                    const currentWordIndex = wordIndex;
                    wordIndex++; // Tăng index cho từ tiếp theo
                    
                    const cleanWord = part.replace(/[.,!?;:]/g, "").toLowerCase();
                    const isHighlighted = highlightedWords.has(currentWordIndex);
                    const isMissing = missingWords.has(currentWordIndex);
                  
                  return (
                    <span
                      key={idx}
                      onClick={(e) => {
                        // Chỉ phát âm, không hiển thị tooltip khi đang luyện nói
                        speakWord(cleanWord);
                      }}
                      style={{ 
                        cursor: "pointer", 
                        position: "relative", 
                        display: "inline-block",
                        padding: "2px 4px",
                        borderRadius: "3px",
                        transition: "all 0.2s",
                        fontWeight: isHighlighted ? "bold" : "normal",
                        backgroundColor: isHighlighted ? "#d1fae5" : (isMissing ? "#fee2e2" : "transparent"),
                        color: isHighlighted ? "#065f46" : (isMissing ? "#991b1b" : "#333")
                      }}
                      onMouseEnter={(e) => {
                        if (!isHighlighted && !isMissing) {
                          e.target.style.backgroundColor = "#f3f4f6";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isHighlighted && !isMissing) {
                          e.target.style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      {part}
                    </span>
                  );
                  });
                })()}
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
                  <div style={{ marginTop: 12, fontSize: 14, color: "#666" }}>
                    Đọc to và rõ ràng đoạn văn trên
                  </div>
                </div>
              )}

              {audioBlob && !isRecording && !submitting && (
                <div className="audio-complete">
                  <p style={{ marginBottom: 12, color: "#10b981" }}>
                    ✅ Đã ghi âm xong. Đang lưu...
                  </p>
                </div>
              )}

              {submitting && (
                <div className="submitting-indicator">
                  <p>Đang lưu...</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="recording-section">
            <div className="recording-controls">
              {loadingPrompt ? (
                <p style={{ textAlign: "center", color: "#666" }}>
                  Đang tải đề bài...
                </p>
              ) : promptError ? (
                <div style={{ textAlign: "center" }}>
                  <p style={{ color: "#ef4444", marginBottom: 12 }}>
                    ❌ {promptError}
                  </p>
                  <button
                    onClick={fetchPrompt}
                    style={{
                      padding: "8px 16px",
                      background: "#10b981",
                      color: "white",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer"
                    }}
                  >
                    Thử lại
                  </button>
                </div>
              ) : (
                <p style={{ textAlign: "center", color: "#666" }}>
                  Đang tải đề bài...
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
