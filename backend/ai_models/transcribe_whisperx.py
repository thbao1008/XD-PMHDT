#!/usr/bin/env python3
import whisperx
import torch
import os
import sys
import json
import argparse
import traceback

# Ensure stdout/stderr use UTF-8 (prevents UnicodeEncodeError on Windows)
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

# Optional: lightweight language detection per word
# langdetect đôi khi không chính xác với từ rất ngắn; dùng cho đánh dấu tham khảo
try:
    from langdetect import detect
except Exception:
    detect = None

def detect_language_per_word(words):
    if not isinstance(words, list):
        return []
    for w in words:
        try:
            token = w.get("word") if isinstance(w, dict) else None
            if not token:
                lang = "unknown"
            elif detect:
                lang = detect(token)
            else:
                # Fallback: heuristic theo unicode block (Latin vs non-Latin)
                # rất thô nhưng đủ để đánh dấu non-English cơ bản
                has_non_latin = any(ord(ch) > 0x024F for ch in token)
                lang = "en" if not has_non_latin else "nonlatin"
            w["lang"] = lang
        except Exception:
            w["lang"] = "unknown"
    return words

def run_whisperx(audio_path, output_path="outputs/record.json", model_size="base", language=None, compute_type="float32"):
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Không tìm thấy file audio: {audio_path}")

    out_dir = os.path.dirname(output_path) or "."
    os.makedirs(out_dir, exist_ok=True)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[whisperx] Running on: {audio_path} - transcribe_whisperx.py:52", flush=True)
    print(f"[whisperx] Model: {model_size} | Device: {device} | compute_type: {compute_type} - transcribe_whisperx.py:53", flush=True)

    # Try to set env for ctranslate2 if needed
    os.environ.setdefault("CT2_COMPUTE_TYPE", compute_type)

    # Load model — whisperx.load_model may accept compute_type; try both ways
    try:
        model = whisperx.load_model(model_size, device, compute_type=compute_type)
    except TypeError:
        # older whisperx API may not accept compute_type param; rely on env var
        model = whisperx.load_model(model_size, device)

    # Transcribe (language optional)
    result = model.transcribe(audio_path, language=language) if language else model.transcribe(audio_path)

    # Align words
    align_model, metadata = whisperx.load_align_model(language_code=result.get("language"), device=device)
    aligned_result = whisperx.align(result["segments"], align_model, metadata, audio_path, device)

    # Attach language per word
    word_segments = aligned_result.get("word_segments") or []
    words_with_lang = detect_language_per_word(word_segments)

    # Build segments with words grouped per segment for FE "conversation view"
    # WhisperX returns segment-level start/end; words have their own start/end.
    # FE có thể dùng trực tiếp result["segments"]; ở đây thêm "segment_words" để tiện mapping.
    segments = result.get("segments") or []
    if segments and words_with_lang:
        # Gán words vào mỗi segment theo khoảng thời gian
        for seg in segments:
            s = float(seg.get("start", 0.0))
            e = float(seg.get("end", s))
            seg_words = [w for w in words_with_lang if isinstance(w, dict) and float(w.get("start", -1)) >= s and float(w.get("end", -1)) <= e]
            seg["segment_words"] = seg_words

    output = {
        "language": result.get("language"),
        "segments": segments,
        "words": words_with_lang
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"[whisperx] Saved result to: {output_path} - transcribe_whisperx.py:97", flush=True)
    return output

def main():
    parser = argparse.ArgumentParser(description="Transcribe audio with WhisperX and produce JSON output.")
    parser.add_argument("input", help="Path to input audio file")
    parser.add_argument("--output", "-o", help="Path to output JSON file (default: outputs/<basename>.json)")
    parser.add_argument("--model", "-m", default="base", help="Whisper model size (tiny, base, small, medium, large)")
    parser.add_argument("--lang", "-l", default=None, help="Language code (e.g., en, vi). If omitted, auto-detect.")
    parser.add_argument("--compute-type", default="float32", choices=["float16","float32"], help="Compute type; use float32 on CPU")
    args = parser.parse_args()

    input_path = args.input
    output_path = args.output if args.output else os.path.join("outputs", f"{os.path.splitext(os.path.basename(input_path))[0]}.json")

    try:
        run_whisperx(input_path, output_path=output_path, model_size=args.model, language=args.lang, compute_type=args.compute_type)
        sys.exit(0)
    except Exception as e:
        print("[whisperx] Error during transcription: - transcribe_whisperx.py:116", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        print(f"[whisperx] Failed: {str(e)} - transcribe_whisperx.py:118", file=sys.stderr)
        sys.exit(2)

if __name__ == "__main__":
    main()
