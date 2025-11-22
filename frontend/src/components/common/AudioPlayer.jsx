// src/components/common/AudioPlayer.jsx
import React, { useState, useRef, useEffect } from "react";
import { FiPlay, FiPause } from "react-icons/fi";
import "../../styles/audio-player.css";

export default function AudioPlayer({ src, duration = null }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const audioRef = useRef(null);
  const [waveformData, setWaveformData] = useState([]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener("loadedmetadata", () => {
        setAudioDuration(audioRef.current.duration || duration || 0);
      });
      audioRef.current.addEventListener("timeupdate", () => {
        setCurrentTime(audioRef.current.currentTime);
      });
      audioRef.current.addEventListener("ended", () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });
    }

    // Generate random waveform data if not provided
    if (waveformData.length === 0) {
      const bars = Array.from({ length: 50 }, () => Math.random() * 60 + 20);
      setWaveformData(bars);
    }
  }, [src, duration]);

  function togglePlay() {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  return (
    <div className="audio-player-custom">
      <audio ref={audioRef} src={src} style={{ display: "none" }} />
      <button className="audio-play-btn" onClick={togglePlay}>
        {isPlaying ? <FiPause size={16} /> : <FiPlay size={16} />}
      </button>
      <div className="audio-separator"></div>
      <div className="audio-waveform-container">
        <div className="audio-waveform-bars">
          {waveformData.map((height, i) => (
            <div
              key={i}
              className={`waveform-bar-item ${isPlaying ? "playing" : ""}`}
              style={{
                height: `${height}%`,
                animationDelay: `${i * 0.05}s`
              }}
            />
          ))}
        </div>
      </div>
      <div className="audio-duration-text">
        {formatTime(audioDuration || currentTime)}
      </div>
    </div>
  );
}

