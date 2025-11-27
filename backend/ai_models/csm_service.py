#!/usr/bin/env python3
"""
CSM Service - Python wrapper để generate speech từ text
Sử dụng CSM (Conversational Speech Model) từ Sesame AI Labs
"""

import json
import sys
import os
import io
import base64
from pathlib import Path

# Try to use venv Python if available
csm_dir = Path(__file__).parent / "csm"
venv_python = csm_dir / ".venv" / "Scripts" / "python.exe" if sys.platform == "win32" else csm_dir / ".venv" / "bin" / "python"
if venv_python.exists():
    # Add venv site-packages to path
    if sys.platform == "win32":
        venv_site_packages = csm_dir / ".venv" / "Lib" / "site-packages"
    else:
        venv_site_packages = csm_dir / ".venv" / "lib" / f"python{sys.version_info.major}.{sys.version_info.minor}" / "site-packages"
    if venv_site_packages.exists():
        sys.path.insert(0, str(venv_site_packages))

import torch
import torchaudio

# Set UTF-8 encoding cho Windows
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except:
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add CSM directory to path
csm_dir = Path(__file__).parent / "csm"
sys.path.insert(0, str(csm_dir))

try:
    from generator import load_csm_1b, Segment
except ImportError as e:
    print(f"Error importing CSM: {e}", file=sys.stderr)
    print("Make sure CSM is installed: pip install -r csm/requirements.txt", file=sys.stderr)
    sys.exit(1)

# Disable lazy compilation in Mimi
os.environ['NO_TORCH_COMPILE'] = '1'

class CSMService:
    """CSM Service singleton"""
    _instance = None
    _generator = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(CSMService, cls).__new__(cls)
        return cls._instance
    
    def get_generator(self):
        """Lazy load generator"""
        if self._generator is None:
            try:
                # Detect device
                if torch.backends.mps.is_available():
                    device = "mps"
                elif torch.cuda.is_available():
                    device = "cuda"
                else:
                    device = "cpu"
                    print("⚠️ Warning: No GPU available, using CPU (very slow)", file=sys.stderr)
                
                print(f"🚀 Loading CSM-1B on {device}...", file=sys.stderr)
                self._generator = load_csm_1b(device=device)
                print("✅ CSM-1B loaded successfully", file=sys.stderr)
            except Exception as e:
                print(f"❌ Error loading CSM: {e}", file=sys.stderr)
                raise
        return self._generator
    
    def generate_speech(self, text, speaker=0, context_segments=None, max_audio_length_ms=10000):
        """
        Generate speech từ text
        
        Args:
            text: Text cần convert
            speaker: Speaker ID (0 hoặc 1)
            context_segments: List of previous segments (optional)
            max_audio_length_ms: Max audio length in milliseconds
        
        Returns:
            (audio_tensor, sample_rate)
        """
        generator = self.get_generator()
        
        # Convert context segments nếu có
        context = []
        if context_segments:
            for seg in context_segments:
                # Nếu là dict, convert sang Segment
                if isinstance(seg, dict):
                    # Cần audio tensor, nếu không có thì skip
                    if 'audio' in seg and seg['audio'] is not None:
                        audio_tensor = torch.tensor(seg['audio'])
                        segment = Segment(
                            speaker=seg.get('speaker', 0),
                            text=seg.get('text', ''),
                            audio=audio_tensor
                        )
                        context.append(segment)
                elif isinstance(seg, Segment):
                    context.append(seg)
        
        # Generate audio
        audio = generator.generate(
            text=text,
            speaker=speaker,
            context=context,
            max_audio_length_ms=max_audio_length_ms,
            temperature=0.9,
            topk=50
        )
        
        return audio, generator.sample_rate
    
    def generate_speech_base64(self, text, speaker=0, context_segments=None, max_audio_length_ms=10000):
        """
        Generate speech và trả về base64 encoded WAV
        
        Returns:
            {"audio_base64": str, "sample_rate": int, "format": "wav"}
        """
        try:
            audio, sample_rate = self.generate_speech(text, speaker, context_segments, max_audio_length_ms)
            
            # Convert to WAV bytes
            buffer = io.BytesIO()
            torchaudio.save(buffer, audio.unsqueeze(0).cpu(), sample_rate, format='wav')
            buffer.seek(0)
            wav_bytes = buffer.read()
            
            # Encode to base64
            audio_base64 = base64.b64encode(wav_bytes).decode('utf-8')
            
            return {
                "success": True,
                "audio_base64": audio_base64,
                "sample_rate": sample_rate,
                "format": "wav",
                "mime_type": "audio/wav"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }


def main():
    """Main function - nhận input từ stdin"""
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python csm_service.py <command> [args...]"
        }))
        sys.exit(1)
    
    command = sys.argv[1]
    service = CSMService()
    
    try:
        if command == "generate":
            # Đọc input từ stdin
            input_data = json.loads(sys.stdin.read())
            
            text = input_data.get('text', '')
            speaker = input_data.get('speaker', 0)
            context = input_data.get('context', [])
            max_audio_length_ms = input_data.get('max_audio_length_ms', 10000)
            
            if not text:
                print(json.dumps({
                    "success": False,
                    "error": "Text is required"
                }))
                sys.exit(1)
            
            result = service.generate_speech_base64(
                text=text,
                speaker=speaker,
                context_segments=context,
                max_audio_length_ms=max_audio_length_ms
            )
            
            print(json.dumps(result, ensure_ascii=False))
            
        elif command == "check":
            # Check if CSM is available
            try:
                generator = service.get_generator()
                print(json.dumps({
                    "success": True,
                    "available": True,
                    "device": str(generator.device),
                    "sample_rate": generator.sample_rate
                }))
            except Exception as e:
                print(json.dumps({
                    "success": False,
                    "available": False,
                    "error": str(e)
                }))
        else:
            print(json.dumps({
                "success": False,
                "error": f"Unknown command: {command}"
            }))
            sys.exit(1)
            
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()

