import React, { useState, useRef, useEffect } from "react";
import { getAuth } from "../../utils/auth";
import api from "../../api";
import { FaMicrophone, FaRedo } from "react-icons/fa";
import "../../styles/tell-me-story.css";

// Component tooltip thông minh với tự động điều chỉnh vị trí
const WordTooltipWrapper = ({ word, cleanWord, isOpen, tooltip, loading, onWordClick, onClose, micButtonRef }) => {
  const wordRef = useRef(null);
  const tooltipRef = useRef(null);
  const [tooltipPosition, setTooltipPosition] = useState('top'); // 'top' or 'bottom'

  useEffect(() => {
    if (isOpen && tooltipRef.current) {
      // Đợi một chút để tooltip render xong
      setTimeout(() => {
        if (tooltipRef.current) {
          const tooltip = tooltipRef.current;
          const tooltipHeight = tooltip.offsetHeight || 180;
          const tooltipWidth = tooltip.offsetWidth || 280;
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          const padding = 20;
          
          // Tìm mic button để đặt tooltip gần đó
          const micButton = (micButtonRef && micButtonRef.current) || 
                           document.querySelector('.story-input button') ||
                           document.querySelector('button[style*="borderRadius"]');
          
          if (micButton) {
            const micRect = micButton.getBoundingClientRect();
            // Đặt tooltip bên phải mic button, căn giữa theo chiều dọc
            let left = micRect.right + 20;
            let top = micRect.top + (micRect.height / 2) - (tooltipHeight / 2);
            
            // Nếu không đủ không gian bên phải, đặt bên trái
            if (left + tooltipWidth + padding > viewportWidth) {
              left = micRect.left - tooltipWidth - 20;
              if (left < padding) {
                left = padding;
              }
            }
            
            // Đảm bảo không bị tràn phía trên/dưới
            if (top + tooltipHeight > viewportHeight - padding) {
              top = viewportHeight - tooltipHeight - padding;
            }
            if (top < padding) {
              top = padding;
            }
            
            tooltip.style.top = `${top}px`;
            tooltip.style.left = `${left}px`;
          } else {
            // Fallback: đặt ở góc dưới bên phải
            tooltip.style.bottom = `${padding}px`;
            tooltip.style.right = `${padding}px`;
            tooltip.style.top = 'auto';
            tooltip.style.left = 'auto';
          }
        }
      }, 50);
    }
  }, [isOpen, tooltip]);

  return (
    <span
      ref={wordRef}
      onClick={onWordClick}
      style={{
        cursor: "pointer",
        position: "relative",
        display: "inline-block",
        padding: "2px 4px",
        borderRadius: "3px",
        transition: "background-color 0.2s",
        backgroundColor: isOpen ? "#e0f2fe" : "transparent"
      }}
      onMouseEnter={(e) => {
        if (!isOpen) {
          e.target.style.backgroundColor = "#f0f9ff";
        }
      }}
      onMouseLeave={(e) => {
        if (!isOpen) {
          e.target.style.backgroundColor = "transparent";
        }
      }}
    >
      {word}
      {isOpen && tooltip && (
        <div
          ref={tooltipRef}
          style={{
            position: "fixed",
            zIndex: 10000,
            background: "white",
            border: "2px solid #10b981",
            borderRadius: 12,
            padding: 16,
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
            minWidth: 240,
            maxWidth: 340,
            fontSize: 14,
            pointerEvents: "auto",
            animation: "fadeIn 0.2s ease-in"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ marginBottom: 8 }}>
            <strong style={{ fontSize: 16, color: "#10b981" }}>{tooltip.word}</strong>
            {loading && (
              <span style={{ marginLeft: 8, color: "#999", fontSize: 12 }}>Đang tải...</span>
            )}
          </div>
          {tooltip.pronunciation && (
            <div style={{ marginBottom: 6, color: "#10b981", fontWeight: "bold" }}>
              <strong>Phát âm:</strong> /{tooltip.pronunciation}/
            </div>
          )}
          {tooltip.definition && (
            <div style={{ marginBottom: 6 }}>
              <strong>Nghĩa:</strong> {tooltip.definition}
            </div>
          )}
          <button
            onClick={onClose}
            style={{
              marginTop: 8,
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
};

export default function TellMeYourStory({ onBack }) {
  const auth = getAuth();
  const [conversation, setConversation] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [playingAudio, setPlayingAudio] = useState(null); // Track which message is playing TTS
  const [wordTooltip, setWordTooltip] = useState(null); // Dictionary tooltip
  const [openWordTooltip, setOpenWordTooltip] = useState(null); // Word đang mở tooltip
  const [loadingWord, setLoadingWord] = useState(false); // Loading state cho dictionary
  const [hasRecordedAudio, setHasRecordedAudio] = useState(false); // Track if there's recorded audio to send
  const [voiceType, setVoiceType] = useState('female'); // 'male' hoặc 'female'
  const [voiceOrigin, setVoiceOrigin] = useState('native'); // 'native' hoặc 'asian'
  const [showVoiceSubmenu, setShowVoiceSubmenu] = useState(null); // 'male', 'female', hoặc null
  const [aiAudioUrls, setAiAudioUrls] = useState({}); // Lưu audio URLs cho AI messages
  const userAudioRefs = useRef({}); // Lưu audio refs cho user messages
  const messagesEndRef = useRef(null);
  const micButtonRef = useRef(null); // Ref cho mic button
  
  // Audio recording refs
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null); // Web Speech API for speech end detection
  const silenceTimerRef = useRef(null); // Timer để phát hiện im lặng
  const lastSoundTimeRef = useRef(null); // Thời gian có âm thanh cuối cùng
  
  // Timeout 30 phút cho conversation history
  const conversationTimeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    startConversation();
    // Không xóa conversation khi unmount - chỉ cleanup audio/recording
    return () => {
      // Cleanup: stop recording and close streams
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      window.speechSynthesis.cancel();
      // Clear timeout nếu có
      if (conversationTimeoutRef.current) {
        clearTimeout(conversationTimeoutRef.current);
      }
    };
  }, []);
  
  // Reset timeout mỗi khi có message mới
  useEffect(() => {
    if (conversation.length > 0) {
      lastActivityRef.current = Date.now();
      
      // Clear timeout cũ
      if (conversationTimeoutRef.current) {
        clearTimeout(conversationTimeoutRef.current);
      }
      
      // Set timeout mới: 30 phút = 30 * 60 * 1000 = 1800000ms
      conversationTimeoutRef.current = setTimeout(() => {
        // Nếu không có hoạt động trong 30 phút, xóa conversation và tạo mới
        const timeSinceLastActivity = Date.now() - lastActivityRef.current;
        if (timeSinceLastActivity >= 30 * 60 * 1000) {
          handleNewConversation();
        }
      }, 30 * 60 * 1000); // 30 phút
    }
    
    return () => {
      if (conversationTimeoutRef.current) {
        clearTimeout(conversationTimeoutRef.current);
      }
    };
  }, [conversation]);

  // Cleanup audio URLs when component unmounts
  useEffect(() => {
    return () => {
      Object.values(aiAudioUrls).forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [aiAudioUrls]);

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
      const initialMessage = res.data.initial_message ||
        "Hello! I'm your friend. Please tell me your story by speaking into the microphone!";
      
      setConversation([
        {
          type: "ai",
          text: initialMessage,
          timestamp: new Date(),
          id: 'initial'
        }
      ]);
      
      // Reset last activity
      lastActivityRef.current = Date.now();
      
      // Tự động phát âm message đầu tiên
      speakText(initialMessage, 'initial');
    } catch (err) {
      console.error("❌ Error starting conversation:", err);
    }
  };
  
  // Hàm tạo cuộc trò chuyện mới
  const handleNewConversation = async () => {
    // Clear timeout
    if (conversationTimeoutRef.current) {
      clearTimeout(conversationTimeoutRef.current);
    }
    
    // Xóa conversation hiện tại
    setConversation([]);
    setSessionId(null);
    
    // Cleanup audio URLs
    Object.values(aiAudioUrls).forEach(url => {
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    setAiAudioUrls({});
    userAudioRefs.current = {};
    
    // Dừng TTS nếu đang phát
    window.speechSynthesis.cancel();
    setPlayingAudio(null);
    
    // Tạo conversation mới
    await startConversation();
  };

  // Text-to-Speech cho AI response với giọng đã chọn
  // Sử dụng CSM (Sesame AI) cho giọng native, FPT.AI cho giọng asian, fallback về browser TTS
  const speakText = async (text, messageId, overrideVoiceType = null, overrideVoiceOrigin = null) => {
    // Dừng bất kỳ phát âm nào đang chạy
    window.speechSynthesis.cancel();
    
    // Lấy giá trị hiện tại của voiceType và voiceOrigin (đảm bảo dùng đúng giọng đã chọn)
    // Cho phép override để đảm bảo dùng đúng giọng khi thay đổi
    const currentVoiceType = overrideVoiceType !== null ? overrideVoiceType : voiceType;
    const currentVoiceOrigin = overrideVoiceOrigin !== null ? overrideVoiceOrigin : voiceOrigin;
    
    // Xây dựng context từ conversation history cho CSM (chỉ lấy các message gần đây)
    const recentMessages = conversation
      .slice(-5) // Lấy 5 message gần nhất
      .filter(msg => msg.text && msg.text !== "[Đang xử lý...]")
      .map(msg => ({
        speaker: msg.type === 'user' ? 0 : 1,
        text: msg.text
      }));
    
    // Luôn thử gọi TTS API trước (cho cả native và asian) để sử dụng CSM
    try {
      const response = await api.post('/learners/tts/generate', {
        text: text,
        voiceType: currentVoiceType,
        voiceOrigin: currentVoiceOrigin,
        region: currentVoiceOrigin === 'asian' ? 'north' : undefined, // Chỉ cần region cho asian
        useCSM: true, // Bật CSM để backend thử CSM trước
        context: recentMessages // Gửi context cho CSM
      }, {
        timeout: 60000 // 60 giây timeout (cho lần load model đầu tiên)
      });

      if (response.data.success && response.data.audioBase64) {
        // Phát audio từ base64 (từ CSM hoặc FPT.AI)
        const audioData = Uint8Array.from(atob(response.data.audioBase64), c => c.charCodeAt(0));
        const blob = new Blob([audioData], { type: response.data.mimeType || 'audio/wav' });
        const audioUrl = URL.createObjectURL(blob);
        
        // Lưu audio URL để có thể phát lại sau
        setAiAudioUrls(prev => ({ ...prev, [messageId]: audioUrl }));
        
        const audio = new Audio(audioUrl);
        audio.onplay = () => setPlayingAudio(messageId);
        audio.onended = () => {
          setPlayingAudio(null);
          // KHÔNG tự động bắt đầu recording nữa - người dùng phải click vào mic
          const source = response.data.source || 'unknown';
          console.log(`✅ AI finished speaking (${source === 'csm' ? 'CSM' : source === 'fpt' ? 'FPT.AI' : 'TTS'}) - mic will NOT auto-start`);
        };
        audio.onerror = () => {
          setPlayingAudio(null);
          // Fallback về SpeechSynthesis nếu audio fail
          console.warn("⚠️ Audio playback error, falling back to browser TTS");
          speakTextWithBrowser(text, messageId);
        };
        
        audio.play();
        return;
      } else if (response.data.fallback) {
        // Backend trả về fallback flag, dùng browser TTS
        console.log("ℹ️ TTS API unavailable, using browser TTS");
        speakTextWithBrowser(text, messageId);
        return;
      }
    } catch (err) {
      // Nếu API fail (timeout, network error, etc.), fallback về browser TTS
      console.warn("⚠️ TTS API error, falling back to browser TTS:", err.message);
    }
    
    // Fallback: Dùng SpeechSynthesis cho browser nếu API không available
    speakTextWithBrowser(text, messageId);
  };

  // Hàm phụ để dùng SpeechSynthesis API của browser
  const speakTextWithBrowser = (text, messageId) => {
    // Xử lý text cho giọng nữ Việt Nam: thêm pause nhẹ giữa các câu để tự nhiên hơn
    let processedText = text;
    if (voiceType === 'female' && voiceOrigin === 'asian') {
      // Thêm khoảng dừng ngắn sau dấu chấm, dấu phẩy để tròn vành rõ chữ
      processedText = text
        .replace(/\./g, '. ') // Thêm space sau dấu chấm
        .replace(/,/g, ', ') // Thêm space sau dấu phẩy
        .replace(/\?/g, '? ') // Thêm space sau dấu hỏi
        .replace(/!/g, '! '); // Thêm space sau dấu chấm than
    }
    
    // Với SpeechSynthesis, không thể lưu audio URL trực tiếp
    // Nhưng chúng ta vẫn có thể track khi nào đang phát
    const utterance = new SpeechSynthesisUtterance(processedText);
    const voices = window.speechSynthesis.getVoices();
    
    if (voiceType === 'male') {
      if (voiceOrigin === 'native') {
        // Giọng nam bản địa (tiếng Anh bản địa)
        utterance.lang = 'en-US';
        utterance.rate = 0.85;
        utterance.pitch = 0.85; // Trầm
        utterance.volume = 1.0;
        
        const maleVoice = voices.find(voice => 
          voice.lang.includes('en-US') && 
          (voice.name.toLowerCase().includes('david') ||
           voice.name.toLowerCase().includes('mark') ||
           voice.name.toLowerCase().includes('richard') ||
           voice.gender === 'male')
        ) || voices.find(voice => 
          voice.lang.includes('en-US') && 
          !voice.name.toLowerCase().includes('female') &&
          !voice.name.toLowerCase().includes('zira')
        );
        
        if (maleVoice) utterance.voice = maleVoice;
      } else {
        // Giọng nam châu Á (tiếng Anh với accent châu Á)
        utterance.lang = 'en-US';
        utterance.rate = 0.8;
        utterance.pitch = 0.9; // Hơi cao hơn một chút
        utterance.volume = 0.95;
        
        // Tìm voice nam có accent châu Á hoặc tiếng Anh châu Á
        const asianMaleVoice = voices.find(voice => 
          (voice.lang.includes('en') || voice.lang.includes('vi')) && 
          (voice.name.toLowerCase().includes('male') ||
           voice.gender === 'male')
        ) || voices.find(voice => 
          voice.lang.includes('en-US')
        );
        
        if (asianMaleVoice) utterance.voice = asianMaleVoice;
      }
    } else {
      // Giọng nữ
      if (voiceOrigin === 'native') {
        // Giọng nữ bản địa (tiếng Anh bản địa)
        utterance.lang = 'en-US';
        utterance.rate = 0.8;
        utterance.pitch = 1.1;
        utterance.volume = 0.9;
        
        const femaleVoice = voices.find(voice => 
          voice.lang.includes('en-US') && 
          (voice.name.toLowerCase().includes('zira') ||
           voice.name.toLowerCase().includes('samantha') ||
           voice.name.toLowerCase().includes('karen') ||
           voice.name.toLowerCase().includes('susan') ||
           voice.gender === 'female')
        ) || voices.find(voice => 
          voice.lang.includes('en-US') && 
          !voice.name.toLowerCase().includes('male')
        );
        
        if (femaleVoice) utterance.voice = femaleVoice;
      } else {
        // Giọng nữ châu Á (tiếng Việt - giọng người Việt Nam)
        // Đặc điểm: êm ái, chuẩn mực, đầy biểu cảm, tròn vành rõ chữ
        utterance.lang = 'vi-VN';
        utterance.rate = 0.75; // Chậm hơn để tròn vành rõ chữ, dễ nghe
        utterance.pitch = 1.2; // Cao hơn một chút để có âm sắc biểu cảm, êm ái
        utterance.volume = 0.85; // Nhẹ nhàng, êm ái hơn
        
        // Tìm voice nữ tiếng Việt - ưu tiên voice có tên chứa "female", "nữ", hoặc gender = female
        const vietnameseFemaleVoice = voices.find(voice => 
          voice.lang.includes('vi') && 
          (voice.name.toLowerCase().includes('female') || 
           voice.name.toLowerCase().includes('nữ') ||
           voice.gender === 'female')
        ) || voices.find(voice => 
          voice.lang.includes('vi-VN') &&
          !voice.name.toLowerCase().includes('male')
        ) || voices.find(voice => 
          voice.lang.includes('vi') &&
          !voice.name.toLowerCase().includes('male')
        );
        
        if (vietnameseFemaleVoice) {
          utterance.voice = vietnameseFemaleVoice;
        }
        
        // Thêm pause nhẹ giữa các câu để tự nhiên hơn (thông qua text processing)
        // Sẽ được xử lý trong text trước khi speak
      }
    }

    utterance.onstart = () => {
      setPlayingAudio(messageId);
    };

    utterance.onend = () => {
      setPlayingAudio(null);
      // KHÔNG tự động bắt đầu recording nữa - người dùng phải click vào mic
      console.log("✅ AI finished speaking - mic will NOT auto-start");
    };

    utterance.onerror = () => {
      setPlayingAudio(null);
    };

    // Đảm bảo voices đã load trước khi speak (quan trọng cho giọng Việt Nam)
    if (voices.length === 0) {
      // Nếu voices chưa load, đợi một chút rồi thử lại
      window.speechSynthesis.onvoiceschanged = () => {
        const updatedVoices = window.speechSynthesis.getVoices();
        if (updatedVoices.length > 0) {
          // Tìm lại voice phù hợp với voices mới
          if (voiceType === 'female' && voiceOrigin === 'asian') {
            const vietnameseFemaleVoice = updatedVoices.find(voice => 
              voice.lang.includes('vi') && 
              (voice.name.toLowerCase().includes('female') || 
               voice.name.toLowerCase().includes('nữ') ||
               voice.gender === 'female')
            ) || updatedVoices.find(voice => 
              voice.lang.includes('vi-VN') &&
              !voice.name.toLowerCase().includes('male')
            );
            
            if (vietnameseFemaleVoice) {
              utterance.voice = vietnameseFemaleVoice;
            }
          }
          window.speechSynthesis.speak(utterance);
        }
      };
    } else {
      window.speechSynthesis.speak(utterance);
    }
  };

  // Play audio segment từ word đến hết (giống challenge)
  const playSegment = (messageId, start, end, wordIdx) => {
    const audio = userAudioRefs.current[messageId];
    if (!audio) {
      console.warn("Audio not found for message:", messageId, "Available refs:", Object.keys(userAudioRefs.current));
      return;
    }
    
    if (typeof start !== "number" || typeof end !== "number") {
      console.warn("Invalid start/end time:", { start, end });
      return;
    }
    
    console.log("Playing segment:", { messageId, start, end, wordIdx, audioSrc: audio.src });
    
    // Đảm bảo audio đã được load
    const tryPlay = () => {
      if (audio.readyState >= 2) {
        const startTime = start > 1000 ? start / 1000 : start;
        
        // Pause trước để reset
        audio.pause();
        
        // Set currentTime và phát từ đó đến hết
        const onSeeked = () => {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log("Audio playing from", audio.currentTime);
              })
              .catch(error => {
                console.error("Audio play error:", error);
              });
          }
          audio.removeEventListener('seeked', onSeeked);
        };
        
        audio.addEventListener('seeked', onSeeked, { once: true });
        audio.currentTime = Math.max(0, startTime);
        console.log("Setting currentTime to:", startTime);
        
        // Fallback: nếu seeked không fire trong 500ms, thử phát luôn
        setTimeout(() => {
          if (audio.paused && Math.abs(audio.currentTime - startTime) < 0.1) {
            console.log("Seeked event timeout, playing anyway");
            onSeeked();
          }
        }, 500);
      } else {
        console.log("Audio not ready, waiting...", audio.readyState);
        setTimeout(tryPlay, 100);
      }
    };
    
    if (audio.readyState === 0) {
      audio.load();
      audio.addEventListener('loadeddata', tryPlay, { once: true });
    } else {
      tryPlay();
    }
    
    // Scroll đến từ được click
    setTimeout(() => {
      const el = document.querySelector(`[data-word-idx="${wordIdx}"][data-message-id="${messageId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      }
    }, 100);
  };

  // Fetch word definition từ dictionary API
  const fetchWordDefinition = async (word) => {
    if (loadingWord) return;
    
    setLoadingWord(true);
    setOpenWordTooltip(word);
    
    try {
      const res = await api.get(`/learners/dictionary/${encodeURIComponent(word)}`);
      setWordTooltip(res.data);
    } catch (err) {
      console.error("❌ Error fetching word definition:", err);
      setWordTooltip({ word, definition: "Không tìm thấy nghĩa của từ này." });
    } finally {
      setLoadingWord(false);
    }
  };

  // Render transcript với words có thể click để phát audio (giống challenge)
  const renderTranscriptWithWords = (msg) => {
    if (!msg.transcriptJson || !msg.audioUrl) {
      // Fallback: render text thông thường
      return <p style={{ margin: 0, color: "white" }}>{msg.text}</p>;
    }
    
    const words = msg.transcriptJson.words || [];
    if (words.length === 0) {
      return <p style={{ margin: 0, color: "white" }}>{msg.text}</p>;
    }
    
    const messageId = msg.id || `user-${msg.timestamp?.getTime() || Date.now()}`;
    
    return (
      <div style={{ 
        display: "flex", 
        flexWrap: "wrap", 
        gap: "6px", 
        lineHeight: 1.8,
        alignItems: "center"
      }}>
        {words.map((w, idx) => {
          const wordText = String(w.word || "").toLowerCase().trim();
          if (!wordText) return null;
          
          const playStart = typeof w.start === "number" ? w.start : 0;
          const playEnd = typeof w.end === "number" ? w.end : (playStart + 2);
          
          return (
            <button
              key={idx}
              type="button"
              data-word-idx={idx}
              data-message-id={messageId}
              onClick={(e) => {
                e.stopPropagation();
                playSegment(messageId, playStart, playEnd, idx);
              }}
              style={{
                background: "rgba(255, 255, 255, 0.25)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: 6,
                padding: "4px 8px",
                color: "white",
                cursor: "pointer",
                fontSize: 15,
                fontWeight: 500,
                transition: "all 0.2s ease",
                textTransform: "lowercase",
                whiteSpace: "nowrap",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "rgba(255, 255, 255, 0.4)";
                e.target.style.borderColor = "rgba(255, 255, 255, 0.5)";
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.15)";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "rgba(255, 255, 255, 0.25)";
                e.target.style.borderColor = "rgba(255, 255, 255, 0.3)";
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
              }}
            >
              {wordText}
            </button>
          );
        })}
      </div>
    );
  };

  // Tạo word timings giả cho AI message dựa trên text và audio duration
  // Tính toán dựa trên vị trí của từ trong text (tỷ lệ)
  const createAIWordTimings = (text, audioDuration) => {
    if (!text || !audioDuration || audioDuration <= 0) return [];
    
    // Tách text thành words và giữ lại vị trí trong text gốc
    const words = [];
    const regex = /\b\w+\b/g;
    let match;
    let lastIndex = 0;
    
    while ((match = regex.exec(text)) !== null) {
      const word = match[0];
      const startPos = match.index; // Vị trí bắt đầu của từ trong text
      const endPos = match.index + word.length; // Vị trí kết thúc
      
      words.push({
        word: word,
        startPos: startPos,
        endPos: endPos
      });
    }
    
    if (words.length === 0) return [];
    
    const totalLength = text.length;
    const wordsWithTimings = [];
    
    words.forEach((wordInfo, idx) => {
      // Tính thời gian dựa trên vị trí của từ trong text (tỷ lệ)
      // startPos / totalLength = tỷ lệ vị trí trong text
      // Tỷ lệ này tương ứng với thời gian trong audio
      const startRatio = wordInfo.startPos / totalLength;
      const endRatio = wordInfo.endPos / totalLength;
      
      const start = startRatio * audioDuration;
      const end = endRatio * audioDuration;
      
      wordsWithTimings.push({
        word: wordInfo.word,
        start: start,
        end: end
      });
    });
    
    console.log("Created word timings:", wordsWithTimings.slice(0, 5), "...");
    return wordsWithTimings;
  };

  // Play AI audio từ word đến hết (giống challenge detail)
  const playAIAudioFromWord = (messageId, wordIndex, text) => {
    console.log("playAIAudioFromWord called:", { messageId, wordIndex, text, availableRefs: Object.keys(userAudioRefs.current) });
    
    const audio = userAudioRefs.current[`ai-${messageId}`] || userAudioRefs.current[messageId];
    if (!audio) {
      console.warn("AI Audio not found for message:", messageId, "Available refs:", Object.keys(userAudioRefs.current));
      // Thử tìm lại sau một chút
      setTimeout(() => {
        const retryAudio = userAudioRefs.current[`ai-${messageId}`] || userAudioRefs.current[messageId];
        if (retryAudio) {
          playAIAudioFromWord(messageId, wordIndex, text);
        }
      }, 200);
      return;
    }
    
    console.log("Audio found:", { src: audio.src, duration: audio.duration, readyState: audio.readyState });
    
    // Lấy audio duration
    const audioDuration = audio.duration || 0;
    if (!audioDuration || isNaN(audioDuration)) {
      console.log("Audio duration not available, waiting for loadedmetadata...");
      // Nếu chưa có duration, đợi loadedmetadata
      const onLoadedMetadata = () => {
        console.log("Audio metadata loaded, duration:", audio.duration);
        const words = createAIWordTimings(text, audio.duration);
        console.log("Created word timings:", words);
        if (words[wordIndex]) {
          playAIAudioSegment(messageId, words[wordIndex].start, audio.duration, wordIndex);
        } else {
          // Fallback: phát từ đầu
          playAIAudio(messageId);
        }
      };
      
      if (audio.readyState >= 1) {
        // Metadata đã có, thử lấy duration
        if (audio.duration && !isNaN(audio.duration)) {
          onLoadedMetadata();
        } else {
          audio.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
          audio.load();
        }
      } else {
        audio.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
        audio.load();
      }
      return;
    }
    
    // Tạo word timings
    const words = createAIWordTimings(text, audioDuration);
    console.log("Word timings:", words, "wordIndex:", wordIndex);
    if (words[wordIndex]) {
      playAIAudioSegment(messageId, words[wordIndex].start, audioDuration, wordIndex);
    } else {
      // Fallback: phát từ đầu
      console.log("Word index not found, playing from start");
      playAIAudio(messageId);
    }
  };

  // Play AI audio segment từ start đến hết (giống ChallengeDetail)
  const playAIAudioSegment = (messageId, start, end, wordIdx) => {
    const audio = userAudioRefs.current[`ai-${messageId}`] || userAudioRefs.current[messageId];
    if (!audio) {
      console.warn("Audio not found for message:", messageId);
      return;
    }
    
    if (typeof start !== "number" || isNaN(start)) {
      console.warn("Invalid start time:", start);
      return;
    }
    
    // Đảm bảo start là số giây (không phải milliseconds)
    const startTime = start > 1000 ? start / 1000 : start;
    
    console.log("Playing AI audio segment:", { messageId, startTime, audioDuration: audio.duration, readyState: audio.readyState });
    
    // Đảm bảo audio đã được load
    const tryPlay = () => {
      if (audio.readyState >= 2) { // HAVE_CURRENT_DATA hoặc cao hơn
        // Pause trước để reset
        audio.pause();
        
        // Set currentTime và đợi seeked event để đảm bảo đã seek xong
        const onSeeked = () => {
          // Phát audio sau khi đã seek xong - phát tiếp đến hết, không dừng
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log("✅ AI audio playing from", audio.currentTime, "- will continue to end");
                setPlayingAudio(messageId);
              })
              .catch(error => {
                console.error("❌ AI Audio play error:", error);
                setPlayingAudio(null);
              });
          }
          audio.removeEventListener('seeked', onSeeked);
        };
        
        audio.addEventListener('seeked', onSeeked, { once: true });
        audio.currentTime = Math.max(0, startTime);
        console.log("Setting currentTime to:", startTime, "seconds");
        
        // Fallback: nếu seeked không fire trong 500ms, thử phát luôn
        setTimeout(() => {
          if (audio.paused && Math.abs(audio.currentTime - startTime) < 0.1) {
            console.log("Seeked event timeout, playing anyway");
            onSeeked();
          }
        }, 500);
      } else {
        // Nếu chưa load xong, đợi một chút rồi thử lại
        console.log("Audio not ready, waiting...", audio.readyState);
        setTimeout(tryPlay, 100);
      }
    };
    
    // Thử phát ngay hoặc đợi audio load
    if (audio.readyState === 0) {
      // Nếu chưa load, load trước
      audio.load();
      audio.addEventListener('loadeddata', tryPlay, { once: true });
    } else {
      tryPlay();
    }
  };

  // Play AI audio từ đầu (fallback)
  const playAIAudio = (messageId) => {
    const audio = userAudioRefs.current[`ai-${messageId}`] || userAudioRefs.current[messageId];
    if (!audio) {
      console.warn("AI Audio not found for message:", messageId);
      return;
    }
    
    // Phát từ đầu
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log("AI audio playing from start");
          setPlayingAudio(messageId);
        })
        .catch(error => {
          console.error("AI Audio play error:", error);
        });
    }
  };

  // Render text với clickable words cho dictionary (cho AI messages)
  const renderTextWithDictionary = (text, messageId) => {
    if (!text) return null;
    
    // Split text thành words và spaces, giữ lại index của từ
    const parts = text.split(/(\s+|[.,!?;:])/);
    let wordIndex = -1; // Index của từ (không tính spaces và punctuation)
    
    return (
      <>
        {parts.map((part, idx) => {
          // Nếu là khoảng trắng hoặc punctuation, render trực tiếp
          if (/^\s+$/.test(part) || /^[.,!?;:]+$/.test(part)) {
            return <span key={idx}>{part}</span>;
          }
          
          // Clean word (remove punctuation)
          const cleanWord = part.replace(/[.,!?;:]/g, "").toLowerCase();
          
          // Chỉ làm clickable nếu là từ tiếng Anh (có chữ cái)
          if (cleanWord.match(/^[a-z]+$/i) && cleanWord.length > 1) {
            wordIndex++; // Tăng index cho từ
            const currentWordIndex = wordIndex; // Lưu lại để dùng trong onClick
            
            return (
              <WordTooltipWrapper
                key={idx}
                word={part}
                cleanWord={cleanWord}
                isOpen={openWordTooltip === cleanWord}
                tooltip={wordTooltip}
                loading={loadingWord}
                micButtonRef={micButtonRef}
                onWordClick={() => {
                  // Click vào từ chỉ để mở tooltip - KHÔNG phát audio
                  // Audio chỉ phát khi click vào nút phát lại bên cạnh timestamp
                  fetchWordDefinition(cleanWord);
                }}
                onClose={() => {
                  setOpenWordTooltip(null);
                  setWordTooltip(null);
                }}
              />
            );
          }
          
          return <span key={idx}>{part}</span>;
        })}
      </>
    );
  };

  // Bắt đầu ghi âm với speech recognition để bỏ qua tạp âm
  const startRecording = async () => {
    // Dừng TTS nếu đang phát (cho phép cắt ngang)
    if (playingAudio) {
      window.speechSynthesis.cancel();
      setPlayingAudio(null);
    }
    
    // Nếu đang recording, không làm gì (đã xử lý trong onClick)
    if (isRecording) {
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      lastSoundTimeRef.current = Date.now();

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
          lastSoundTimeRef.current = Date.now(); // Cập nhật khi có data
        }
      };

      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { 
          type: audioChunksRef.current[0]?.type || "audio/webm" 
        });
        
        console.log("🎤 Recording stopped:", {
          blobSize: blob?.size,
          chunksCount: audioChunksRef.current.length,
          chunksSizes: audioChunksRef.current.map(chunk => chunk.size),
          blobType: blob?.type
        });
        
        // Luôn tự động gửi khi dừng recording (nếu có audio)
        // Giảm threshold xuống 100 bytes để bắt được cả audio ngắn
        if (blob && blob.size > 100) { // Ít nhất 100 bytes (giảm từ 500)
          console.log("✅ Audio recorded, sending to server. Size:", blob.size, "bytes");
          handleAudioRecorded(blob);
        } else {
          // Nếu không có audio, reset
          console.warn("⚠️ Audio too small or empty. Size:", blob?.size, "bytes. Not sending.");
          audioChunksRef.current = [];
          setHasRecordedAudio(false);
        }
        
        // Stop all tracks
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
      };

      mr.start();
      setIsRecording(true);

      // Bắt đầu Web Speech API để nhận diện giọng nói và bỏ qua tạp âm
      startSpeechRecognition();
      
      // Bắt đầu phát hiện im lặng để tự động gửi
      startSilenceDetection();
    } catch (err) {
      console.error("❌ Error starting recording:", err);
      alert("Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.");
    }
  };

  // Web Speech API để nhận diện giọng nói và cập nhật lastSoundTime
  const startSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      return; // Browser không hỗ trợ
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      // Khi có kết quả nhận diện giọng nói, cập nhật thời gian
      lastSoundTimeRef.current = Date.now();
    };

    recognition.onerror = (event) => {
      // Bỏ qua lỗi "aborted" và các lỗi không quan trọng
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        console.warn("Speech recognition error:", event.error);
      }
    };

    recognition.onend = () => {
      // Tự động restart nếu vẫn đang recording
      if (isRecording && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // Ignore restart errors
        }
      }
    };

    try {
      recognition.start();
    } catch (e) {
      // Ignore start errors
    }
  };

  // Phát hiện im lặng để tự động gửi (sau 2 giây im lặng)
  const startSilenceDetection = () => {
    const SILENCE_THRESHOLD = 2000; // 2 giây im lặng
    
    const checkSilence = () => {
      if (!isRecording) return;
      
      const timeSinceLastSound = Date.now() - lastSoundTimeRef.current;
      
      // Nếu có audio chunks và đã im lặng đủ lâu, tự động gửi
      if (audioChunksRef.current.length > 0 && timeSinceLastSound >= SILENCE_THRESHOLD) {
        stopRecording();
        return;
      }
      
      // Tiếp tục kiểm tra
      silenceTimerRef.current = setTimeout(checkSilence, 500);
    };
    
    checkSilence();
  };

  // Dừng ghi âm
  const stopRecording = () => {
    // Đặt isRecording = false ngay để tránh các logic khác chạy
    setIsRecording(false);
    
    // Dừng speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort(); // Dùng abort thay vì stop để tránh lỗi
        recognitionRef.current = null;
      } catch (e) {
        // Ignore stop errors
      }
    }
    
    // Dừng silence detection
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    // Dừng MediaRecorder
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        } else if (mediaRecorderRef.current.state === "paused") {
          mediaRecorderRef.current.stop();
        }
      } catch (e) {
        console.warn("Error stopping MediaRecorder:", e);
      }
    }
    
    // Stop all tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      mediaStreamRef.current = null;
    }
  };


  // Xử lý audio đã ghi
  const handleAudioRecorded = (blob) => {
    // Chỉ tự động gửi nếu có audio data
    console.log("📤 handleAudioRecorded called:", {
      blobSize: blob?.size,
      blobType: blob?.type,
      hasBlob: !!blob
    });
    
    if (blob && blob.size > 0) {
      sendMessage(null, blob);
    } else {
      console.warn("⚠️ handleAudioRecorded: Invalid blob, not sending");
    }
  };

  // Gửi message (chỉ audio)
  const sendMessage = async (text = null, audio = null) => {
    if (!audio) {
      console.warn("⚠️ sendMessage: No audio provided");
      return;
    }

    console.log("📨 sendMessage called:", {
      hasAudio: !!audio,
      audioSize: audio.size,
      audioType: audio.type,
      sessionId: sessionId
    });

    const userMessage = {
      type: "user",
      text: "[Đang xử lý...]",
      audio: audio,
      timestamp: new Date(),
      id: `user-${Date.now()}`
    };

    setConversation(prev => [...prev, userMessage]);
    setSending(true);

    try {
      const formData = new FormData();
      if (audio) {
        // Đảm bảo audio là File object, không phải Blob
        const audioFile = audio instanceof File 
          ? audio 
          : new File([audio], `recording-${Date.now()}.webm`, { type: audio.type || "audio/webm" });
        formData.append("audio", audioFile);
        console.log("📎 Appended audio to FormData:", {
          fileName: audioFile.name,
          fileSize: audioFile.size,
          fileType: audioFile.type
        });
      }
      formData.append("session_id", sessionId);

      console.log("🚀 Sending audio to server...");
      const res = await api.post(
        "/learners/speaking-practice/story/message",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      console.log("✅ Server response received:", {
        hasTranscript: !!res.data.transcript,
        hasTranscriptJson: !!res.data.transcriptJson,
        hasResponse: !!res.data.response
      });

      // Tạo audio URL trước khi cập nhật message
      const audioUrl = URL.createObjectURL(audio);
      
      // Cập nhật user message với transcript và transcriptJson nếu có
      const updatedUserMessage = {
        ...userMessage,
        text: res.data.transcript || "[Audio message]",
        transcriptJson: res.data.transcriptJson || null, // Full transcript với words và timings
        audioUrl: audioUrl, // Lưu audio URL để phát lại
        audio: audio // Giữ lại audio blob
      };
      
      console.log("✅ Updated user message:", {
        id: updatedUserMessage.id,
        hasAudioUrl: !!updatedUserMessage.audioUrl,
        hasTranscriptJson: !!updatedUserMessage.transcriptJson,
        wordsCount: updatedUserMessage.transcriptJson?.words?.length || 0,
        audioUrl: updatedUserMessage.audioUrl
      });

      const aiMessage = {
        type: "ai",
        text: res.data.response,
        timestamp: new Date(),
        id: `ai-${Date.now()}`
      };

      setConversation(prev => {
        const newConv = [...prev];
        const userIdx = newConv.length - 1;
        newConv[userIdx] = updatedUserMessage;
        return [...newConv, aiMessage];
      });

      // Reset audio chunks sau khi gửi thành công
      audioChunksRef.current = [];
      setHasRecordedAudio(false);
      
      // Cập nhật last activity khi có message mới
      lastActivityRef.current = Date.now();

      // Tự động phát âm AI response (KHÔNG tự động mở mic sau khi nói xong)
      setTimeout(() => {
        speakText(res.data.response, aiMessage.id);
      }, 500);
    } catch (err) {
      console.error("❌ Error sending message:", err);
      const errorMessage = {
        type: "ai",
        text: "Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.",
        timestamp: new Date(),
        id: `error-${Date.now()}`
      };
      setConversation(prev => [...prev, errorMessage]);
      speakText(errorMessage.text, errorMessage.id);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="tell-me-story" style={{ 
      display: "flex", 
      flexDirection: "column", 
      height: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Animated background elements */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)",
        pointerEvents: "none",
        zIndex: 0
      }}></div>
      <div className="story-header" style={{
        padding: "20px",
        background: "rgba(255, 255, 255, 0.95)",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button 
            className="btn-back" 
            onClick={onBack}
            style={{
              padding: "8px 16px",
              background: "#6b7280",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 14
            }}
          >
            ← Quay lại
          </button>
          <h2 style={{ margin: 0, color: "#333" }}>Tell me your story</h2>
          <button
            onClick={handleNewConversation}
            style={{
              padding: "8px 16px",
              background: "#10b981",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#059669";
              e.target.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#10b981";
              e.target.style.transform = "translateY(0)";
            }}
          >
            Tạo cuộc trò chuyện mới
          </button>
        </div>
        <div style={{ 
          marginTop: 10, 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center",
          gap: 8,
          position: "relative"
        }}>
          <p style={{ margin: 0, color: "#666", fontSize: 14 }}>Giọng AI:</p>
          <div style={{ display: "flex", gap: 4, background: "#f3f4f6", borderRadius: 8, padding: 4, position: "relative" }}>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowVoiceSubmenu(showVoiceSubmenu === 'male' ? null : 'male')}
                style={{
                  padding: "6px 16px",
                  borderRadius: 6,
                  border: "none",
                  background: voiceType === 'male' 
                    ? "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)"
                    : "transparent",
                  color: voiceType === 'male' ? "white" : "#666",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: voiceType === 'male' ? 600 : 400,
                  transition: "all 0.2s"
                }}
              >
                Nam {voiceType === 'male' && `(${voiceOrigin === 'native' ? 'Bản địa' : 'Châu Á'})`}
              </button>
              {showVoiceSubmenu === 'male' && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: 4,
                  background: "white",
                  borderRadius: 8,
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  padding: 4,
                  zIndex: 1000,
                  minWidth: 120
                }}>
                  <button
                    onClick={async () => {
                      const newVoiceType = 'male';
                      const newVoiceOrigin = 'native';
                      setVoiceType(newVoiceType);
                      setVoiceOrigin(newVoiceOrigin);
                      setShowVoiceSubmenu(null);
                      // Áp dụng ngay giọng mới cho message đang phát
                      if (playingAudio) {
                        const currentMsg = conversation.find(m => m.id === playingAudio);
                        if (currentMsg) {
                          window.speechSynthesis.cancel();
                          setPlayingAudio(null);
                          // Đợi state update xong rồi mới speak với giọng mới
                          setTimeout(() => {
                            speakText(currentMsg.text, currentMsg.id, newVoiceType, newVoiceOrigin);
                          }, 150);
                        }
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "none",
                      background: voiceType === 'male' && voiceOrigin === 'native' 
                        ? "#3b82f6" 
                        : "transparent",
                      color: voiceType === 'male' && voiceOrigin === 'native' ? "white" : "#666",
                      cursor: "pointer",
                      fontSize: 13,
                      textAlign: "left"
                    }}
                  >
                    Bản địa
                  </button>
                  <button
                    onClick={async () => {
                      const newVoiceType = 'male';
                      const newVoiceOrigin = 'asian';
                      setVoiceType(newVoiceType);
                      setVoiceOrigin(newVoiceOrigin);
                      setShowVoiceSubmenu(null);
                      if (playingAudio) {
                        const currentMsg = conversation.find(m => m.id === playingAudio);
                        if (currentMsg) {
                          window.speechSynthesis.cancel();
                          setPlayingAudio(null);
                          setTimeout(() => {
                            speakText(currentMsg.text, currentMsg.id, newVoiceType, newVoiceOrigin);
                          }, 150);
                        }
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "none",
                      background: voiceType === 'male' && voiceOrigin === 'asian' 
                        ? "#3b82f6" 
                        : "transparent",
                      color: voiceType === 'male' && voiceOrigin === 'asian' ? "white" : "#666",
                      cursor: "pointer",
                      fontSize: 13,
                      textAlign: "left"
                    }}
                  >
                    Châu Á
                  </button>
                </div>
              )}
            </div>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowVoiceSubmenu(showVoiceSubmenu === 'female' ? null : 'female')}
                style={{
                  padding: "6px 16px",
                  borderRadius: 6,
                  border: "none",
                  background: voiceType === 'female' 
                    ? "linear-gradient(135deg, #ec4899 0%, #be185d 100%)"
                    : "transparent",
                  color: voiceType === 'female' ? "white" : "#666",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: voiceType === 'female' ? 600 : 400,
                  transition: "all 0.2s"
                }}
              >
                Nữ {voiceType === 'female' && `(${voiceOrigin === 'native' ? 'Bản địa' : 'Châu Á'})`}
              </button>
              {showVoiceSubmenu === 'female' && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: 4,
                  background: "white",
                  borderRadius: 8,
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  padding: 4,
                  zIndex: 1000,
                  minWidth: 120
                }}>
                  <button
                    onClick={async () => {
                      const newVoiceType = 'female';
                      const newVoiceOrigin = 'native';
                      setVoiceType(newVoiceType);
                      setVoiceOrigin(newVoiceOrigin);
                      setShowVoiceSubmenu(null);
                      if (playingAudio) {
                        const currentMsg = conversation.find(m => m.id === playingAudio);
                        if (currentMsg) {
                          window.speechSynthesis.cancel();
                          setPlayingAudio(null);
                          setTimeout(() => {
                            speakText(currentMsg.text, currentMsg.id, newVoiceType, newVoiceOrigin);
                          }, 150);
                        }
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "none",
                      background: voiceType === 'female' && voiceOrigin === 'native' 
                        ? "#ec4899" 
                        : "transparent",
                      color: voiceType === 'female' && voiceOrigin === 'native' ? "white" : "#666",
                      cursor: "pointer",
                      fontSize: 13,
                      textAlign: "left"
                    }}
                  >
                    Bản địa
                  </button>
                  <button
                    onClick={async () => {
                      const newVoiceType = 'female';
                      const newVoiceOrigin = 'asian';
                      setVoiceType(newVoiceType);
                      setVoiceOrigin(newVoiceOrigin);
                      setShowVoiceSubmenu(null);
                      if (playingAudio) {
                        const currentMsg = conversation.find(m => m.id === playingAudio);
                        if (currentMsg) {
                          window.speechSynthesis.cancel();
                          setPlayingAudio(null);
                          setTimeout(() => {
                            speakText(currentMsg.text, currentMsg.id, newVoiceType, newVoiceOrigin);
                          }, 150);
                        }
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "none",
                      background: voiceType === 'female' && voiceOrigin === 'asian' 
                        ? "#ec4899" 
                        : "transparent",
                      color: voiceType === 'female' && voiceOrigin === 'asian' ? "white" : "#666",
                      cursor: "pointer",
                      fontSize: 13,
                      textAlign: "left"
                    }}
                  >
                    Châu Á
                  </button>
                </div>
              )}
            </div>
          </div>
          {/* Click outside để đóng submenu */}
          {showVoiceSubmenu && (
            <div
              onClick={() => setShowVoiceSubmenu(null)}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 999
              }}
            />
          )}
        </div>
        <p style={{ marginTop: 8, color: "#666", textAlign: "center", fontSize: 13 }}>
          Trò chuyện với bạn AI bằng giọng nói. Nhấn vào mic để nói!
        </p>
      </div>

      <div className="story-conversation" style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        zIndex: 1
      }}>
        <div className="messages-container" style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 20px",
          background: "rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(15px)",
          scrollBehavior: "smooth"
        }}>
          {conversation.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                justifyContent: msg.type === "user" ? "flex-end" : "flex-start",
                marginBottom: 20,
                animation: "fadeIn 0.3s ease-in"
              }}
            >
              <div style={{
                maxWidth: "70%",
                padding: "14px 18px",
                borderRadius: 20,
                background: msg.type === "user" 
                  ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                  : "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
                color: msg.type === "user" ? "white" : "#333",
                boxShadow: msg.type === "user"
                  ? "0 4px 12px rgba(102, 126, 234, 0.3)"
                  : "0 4px 12px rgba(0, 0, 0, 0.1)",
                position: "relative",
                border: msg.type === "ai" ? "1px solid rgba(0, 0, 0, 0.05)" : "none"
              }}>
                {/* User message: Audio ref ẩn để phát lại */}
                {msg.type === "user" && msg.audioUrl && (
                  <audio 
                    ref={(el) => {
                      if (el) {
                        const msgId = msg.id || `user-${msg.timestamp?.getTime() || Date.now()}`;
                        userAudioRefs.current[msgId] = el;
                      }
                    }}
                    src={msg.audioUrl}
                    preload="auto"
                    style={{ display: "none" }}
                  />
                )}
                
                {/* User message: Transcript với words có thể click */}
                {msg.type === "user" && (
                  <div style={{ 
                    margin: 0, 
                    lineHeight: 1.6,
                    fontSize: 15,
                    fontWeight: 500,
                    wordBreak: "break-word"
                  }}>
                    {msg.text === "[Đang xử lý...]" ? (
                      <p style={{ margin: 0, color: "rgba(255, 255, 255, 0.8)", fontStyle: "italic" }}>
                        <span style={{ display: "inline-block", animation: "pulse 1.5s infinite" }}>●</span> Đang xử lý...
                      </p>
                    ) : msg.transcriptJson && msg.audioUrl ? (
                      <div>{renderTranscriptWithWords(msg)}</div>
                    ) : msg.text && msg.text !== "[Audio message]" ? (
                      <p style={{ margin: 0, color: "white" }}>{msg.text}</p>
                    ) : null}
                  </div>
                )}
                
                {/* AI message: Text với dictionary */}
                {msg.type === "ai" && (
                  <>
                    {/* Audio ref ẩn cho AI message nếu có */}
                    {aiAudioUrls[msg.id] && (
                      <audio 
                        ref={(el) => {
                          if (el) {
                            const msgId = msg.id;
                            userAudioRefs.current[`ai-${msgId}`] = el;
                            userAudioRefs.current[msgId] = el; // Cũng lưu với key không có prefix
                            console.log("AI audio ref set for:", msgId, "src:", el.src);
                            // Đảm bảo audio được load
                            el.load();
                          }
                        }}
                        src={aiAudioUrls[msg.id]}
                        preload="auto"
                        style={{ display: "none" }}
                        onLoadedMetadata={() => {
                          console.log("AI audio metadata loaded for:", msg.id, "duration:", userAudioRefs.current[`ai-${msg.id}`]?.duration);
                        }}
                        onPlay={() => setPlayingAudio(msg.id)}
                        onPause={() => {
                          if (playingAudio === msg.id) setPlayingAudio(null);
                        }}
                        onEnded={() => setPlayingAudio(null)}
                      />
                    )}
                    
                    <div style={{ 
                      margin: 0, 
                      lineHeight: 1.6,
                      fontSize: 15,
                      position: "relative",
                      wordBreak: "break-word"
                    }}>
                      {renderTextWithDictionary(msg.text, msg.id || idx)}
                    </div>
                    
                    {/* Speaking indicator */}
                    {playingAudio === msg.id && (
                      <div style={{
                        position: "absolute",
                        top: 12,
                        right: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: "rgba(16, 185, 129, 0.15)",
                        padding: "4px 8px",
                        borderRadius: 12,
                        fontSize: 11,
                        color: "#10b981",
                        fontWeight: 600
                      }}>
                        <div style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#10b981",
                          animation: "pulse 1s infinite"
                        }}></div>
                        Đang phát
                      </div>
                    )}
                  </>
                )}
                
                {/* Timestamp với nút phát lại (chỉ cho AI messages) */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 8
                }}>
                  {/* Nút phát lại nhỏ nhỏ (chỉ hiện cho AI messages) */}
                  {msg.type === "ai" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Phát lại audio - ưu tiên audio URL, nếu không có thì dùng SpeechSynthesis
                        const audio = userAudioRefs.current[`ai-${msg.id}`] || userAudioRefs.current[msg.id];
                        if (audio && aiAudioUrls[msg.id]) {
                          // Phát lại audio từ blob URL
                          audio.currentTime = 0;
                          const playPromise = audio.play();
                          if (playPromise !== undefined) {
                            playPromise
                              .then(() => {
                                setPlayingAudio(msg.id);
                              })
                              .catch(error => {
                                console.error("Audio play error:", error);
                              });
                          }
                        } else if (msg.text) {
                          // Fallback: dùng SpeechSynthesis nếu không có audio URL
                          speakText(msg.text, msg.id);
                        }
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "50%",
                        transition: "all 0.2s",
                        opacity: 0.6,
                        minWidth: "20px",
                        minHeight: "20px"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = "1";
                        e.currentTarget.style.background = "rgba(16, 185, 129, 0.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = "0.6";
                        e.currentTarget.style.background = "transparent";
                      }}
                      title="Phát lại"
                    >
                      <FaRedo size={12} color="#10b981" />
                    </button>
                  )}
                  <div style={{
                    fontSize: 11,
                    opacity: 0.7,
                    color: msg.type === "user" ? "rgba(255, 255, 255, 0.9)" : "#666"
                  }}>
                    {msg.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {sending && (
            <div style={{
              display: "flex",
              justifyContent: "flex-start",
              marginBottom: 20
            }}>
              <div style={{
                padding: "12px 16px",
                borderRadius: 18,
                background: "white",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#10b981",
                    animation: "pulse 1s infinite"
                  }}></div>
                  <span style={{ color: "#666", fontSize: 14 }}>AI đang suy nghĩ...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="story-input" style={{
          padding: "24px 20px",
          background: "rgba(255, 255, 255, 0.98)",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.1)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
          position: "relative",
          zIndex: 2
        }}>
          {/* Mic button ở giữa - click để bắt đầu/dừng recording */}
          <button
            ref={micButtonRef}
            onClick={() => {
              if (sending) return; // Không làm gì nếu đang gửi
              
              // Dừng TTS nếu đang phát (cho phép cắt ngang)
              if (playingAudio) {
                window.speechSynthesis.cancel();
                setPlayingAudio(null);
              }
              
              // Nếu đang recording, dừng và gửi
              if (isRecording) {
                stopRecording();
                return;
              }
              
              // Nếu chưa recording, bắt đầu ghi âm
              startRecording();
            }}
            disabled={sending}
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              border: "none",
              background: isRecording 
                ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              cursor: sending ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: isRecording 
                ? "0 0 20px rgba(239, 68, 68, 0.6)"
                : "0 4px 15px rgba(102, 126, 234, 0.4)",
              transition: "all 0.3s",
              transform: isRecording ? "scale(1.1)" : "scale(1)",
              zIndex: 10
            }}
          >
            <FaMicrophone size={32} />
          </button>
          
          {/* Status text */}
          <div style={{ textAlign: "center" }}>
            <p style={{ 
              margin: 0, 
              color: "#666", 
              fontSize: 14,
              fontWeight: 500
            }}>
              {isRecording 
                ? "Đang ghi âm... (Tự động gửi khi im lặng 2 giây hoặc bấm mic để dừng và gửi)" 
                : playingAudio
                ? "AI đang nói... (Ấn vào mic để cắt ngang và nói)"
                : "Nhấn vào mic để bắt đầu ghi âm"}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
