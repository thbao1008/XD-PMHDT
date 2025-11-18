import React, { useEffect, useRef, useState } from "react";

export default function AudioRecorder({
  onRecorded,
  isSubmitting = false,
  maxDuration = 120,
  mimeType = "audio/webm"
}) {
  const mediaStreamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);
  const [recordedFile, setRecordedFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  useEffect(() => {
    return () => {
      stopRecordingInternal();
      clearTimer();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function stopTracks() {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      chunksRef.current = [];

      const options =
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported &&
        MediaRecorder.isTypeSupported(mimeType)
          ? { mimeType }
          : undefined;

      const mr = new MediaRecorder(stream, options);
      recorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || mimeType });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setRecordedFile(blob);
        onRecorded?.(blob);
      };

      mr.start();
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => {
          if (d + 1 >= maxDuration) {
            stopRecordingInternal();
            return maxDuration;
          }
          return d + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("startRecording error", err);
      setError("Không thể truy cập micro. Kiểm tra quyền truy cập.");
    }
  }

  function stopRecordingInternal() {
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    } catch (e) {}
    setIsRecording(false);
    clearTimer();
    stopTracks();
  }

  function stopRecording() {
    stopRecordingInternal();
  }

  function handleFileInput(e) {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    setDuration(0);
    setRecordedFile(f);
    onRecorded?.(f);
  }

  function clearPreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setDuration(0);
    setRecordedFile(null);
    setFileInputKey((k) => k + 1);
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  return (
    <div className="audio-recorder">
      <div className="flex items-center gap-3">
        {!isRecording ? (
          <button
            type="button"
            className="px-3 py-1 bg-red-600 text-white rounded"
            onClick={startRecording}
          >
            Ghi âm
          </button>
        ) : (
          <button
            type="button"
            className="px-3 py-1 bg-gray-700 text-white rounded"
            onClick={stopRecording}
          >
            Dừng
          </button>
        )}

        <div className="text-sm text-gray-700">
          {isRecording ? (
            <span>Đang ghi… <strong>{formatTime(duration)}</strong></span>
          ) : (
            <span>Thời lượng: <strong>{formatTime(duration)}</strong></span>
          )}
        </div>

        <div>
          <label className="text-sm mr-2">Hoặc upload</label>
          <input
            key={fileInputKey}
            type="file"
            accept="audio/*"
            onChange={handleFileInput}
            className="text-sm"
          />
        </div>
      </div>

      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}

      {previewUrl && (
        <div className="mt-3">
          <audio controls src={previewUrl} className="w-full" />
          <div className="mt-2">
            <button className="text-sm border px-2 py-1 rounded" onClick={clearPreview}>Xóa</button>
          </div>
        </div>
      )}
    </div>
  );
}
