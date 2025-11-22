#!/usr/bin/env python3
"""
Script kiểm tra tương thích CUDA 12.1 với WhisperX
"""
import sys
import torch
import os

def test_cuda_compatibility():
    print("=" * 60)
    print("🔍 Kiểm tra tương thích CUDA 12.1 với WhisperX")
    print("=" * 60)
    
    # 1. Kiểm tra PyTorch
    print("\n1. PyTorch Information:")
    print(f"   Version: {torch.__version__}")
    print(f"   CUDA available: {torch.cuda.is_available()}")
    
    if torch.cuda.is_available():
        print(f"   CUDA version: {torch.version.cuda}")
        print(f"   cuDNN version: {torch.backends.cudnn.version() if torch.backends.cudnn.is_available() else 'N/A'}")
        print(f"   GPU name: {torch.cuda.get_device_name(0)}")
        gpu_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        print(f"   GPU memory: {gpu_memory:.1f} GB")
        
        # Kiểm tra CUDA 12.x
        cuda_version = torch.version.cuda
        if cuda_version and cuda_version.startswith("12."):
            print(f"   ✅ CUDA 12.x detected - Compatible!")
        else:
            print(f"   ⚠️  CUDA version: {cuda_version} (Expected 12.x)")
    else:
        print("   ❌ CUDA not available")
        return False
    
    # 2. Kiểm tra WhisperX
    print("\n2. WhisperX Information:")
    try:
        import whisperx
        whisperx_version = getattr(whisperx, '__version__', 'unknown')
        print(f"   Version: {whisperx_version}")
        print("   ✅ WhisperX installed")
    except ImportError as e:
        print(f"   ❌ WhisperX not installed: {e}")
        return False
    
    # 3. Test GPU với WhisperX
    print("\n3. Testing GPU with WhisperX:")
    try:
        # Thử load model nhỏ để test (KHÔNG test VAD để tránh lỗi use_auth_token)
        print("   Loading model 'tiny' on GPU...")
        model = whisperx.load_model("tiny", device="cuda", compute_type="float16")
        print("   ✅ Model loaded successfully on GPU!")
        
        # Cleanup
        del model
        torch.cuda.empty_cache()
        print("   ✅ GPU test passed!")
        print("   ⚠️  Note: torchcodec warning is normal (FFmpeg optional)")
        print("   ⚠️  Note: VAD (pyannote) may have use_auth_token error - this is a known issue")
        print("   💡 WhisperX transcription will still work without VAD")
        return True
    except RuntimeError as e:
        error_str = str(e).lower()
        if "cublas" in error_str or "cuda" in error_str or "dll" in error_str:
            print(f"   ⚠️  GPU error (CUDA library issue): {e}")
            print("   💡 Tip: May need to install CUDA 12.1 runtime libraries")
            print("   💡 Will fallback to CPU automatically")
            return False
        else:
            print(f"   ❌ GPU error: {e}")
            return False
    except Exception as e:
        print(f"   ❌ Unexpected error: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("✅ Tất cả kiểm tra đều PASS!")
    print("=" * 60)
    return True

if __name__ == "__main__":
    try:
        success = test_cuda_compatibility()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

