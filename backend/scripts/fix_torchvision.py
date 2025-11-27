#!/usr/bin/env python3
"""
Script để fix lỗi torchvision/torch compatibility
Lỗi: operator torchvision::nms does not exist
"""

import subprocess
import sys
import os

def run_command(cmd, description):
    """Chạy command và hiển thị kết quả"""
    print(f"\n{'='*60}")
    print(f"🔧 {description}")
    print(f"{'='*60}")
    print(f"Command: {cmd}\n")
    
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            check=True,
            capture_output=True,
            text=True
        )
        print(result.stdout)
        if result.stderr:
            print("Warnings:", result.stderr)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error: {e}")
        print(f"stdout: {e.stdout}")
        print(f"stderr: {e.stderr}")
        return False

def check_torch_versions():
    """Kiểm tra version của torch và torchvision"""
    print("\n" + "="*60)
    print("📊 Checking current versions")
    print("="*60)
    
    try:
        import torch
        import torchvision
        print(f"✅ torch: {torch.__version__}")
        print(f"✅ torchvision: {torchvision.__version__}")
        print(f"✅ CUDA available: {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            print(f"✅ CUDA version: {torch.version.cuda}")
        return True
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Error checking versions: {e}")
        return False

def fix_torchvision():
    """Fix lỗi torchvision bằng cách reinstall"""
    print("\n" + "="*60)
    print("🔧 Fixing torchvision/torch compatibility")
    print("="*60)
    
    # Bước 1: Uninstall
    print("\n📦 Step 1: Uninstalling torch and torchvision...")
    if not run_command(
        f"{sys.executable} -m pip uninstall torch torchvision -y",
        "Uninstalling torch and torchvision"
    ):
        print("⚠️  Uninstall failed, but continuing...")
    
    # Bước 2: Kiểm tra CUDA
    print("\n📦 Step 2: Checking CUDA availability...")
    try:
        import torch
        has_cuda = torch.cuda.is_available()
        cuda_version = torch.version.cuda if has_cuda else None
    except:
        # Nếu chưa có torch, thử detect CUDA từ system
        has_cuda = False
        cuda_version = None
        try:
            result = subprocess.run(
                "nvidia-smi",
                shell=True,
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                has_cuda = True
                print("✅ NVIDIA GPU detected")
        except:
            pass
    
    # Bước 3: Install lại
    print("\n📦 Step 3: Installing compatible versions...")
    if has_cuda and cuda_version:
        # Có CUDA - detect CUDA version và chọn index phù hợp
        # CUDA 12.4+ dùng cu124, CUDA 12.1-12.3 dùng cu121, CUDA 11.8 dùng cu118
        if cuda_version and (cuda_version.startswith("12.4") or cuda_version.startswith("13.")):
            print("Installing with CUDA 12.4 support...")
            install_cmd = f"{sys.executable} -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124"
        elif cuda_version and cuda_version.startswith("12."):
            print("Installing with CUDA 12.1 support...")
            install_cmd = f"{sys.executable} -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121"
        else:
            print("Installing with CUDA 12.1 support (default)...")
            install_cmd = f"{sys.executable} -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121"
    else:
        # CPU only
        print("Installing CPU-only version...")
        install_cmd = f"{sys.executable} -m pip install torch torchvision"
    
    if not run_command(install_cmd, "Installing torch and torchvision"):
        return False
    
    # Bước 4: Verify
    print("\n📦 Step 4: Verifying installation...")
    if check_torch_versions():
        print("\n✅ Installation successful!")
        
        # Test import
        print("\n🧪 Testing imports...")
        try:
            from transformers import Pipeline
            print("✅ transformers import successful")
        except Exception as e:
            print(f"⚠️  transformers import failed: {e}")
            print("   This might be expected if transformers needs to be reinstalled")
        
        try:
            import whisperx
            print("✅ whisperx import successful")
        except Exception as e:
            print(f"⚠️  whisperx import failed: {e}")
            print("   You may need to reinstall whisperx: pip install whisperx")
        
        return True
    else:
        print("\n❌ Verification failed")
        return False

def main():
    print("="*60)
    print("🔧 Torchvision/Torch Compatibility Fix Script")
    print("="*60)
    print("\nThis script will:")
    print("1. Check current torch/torchvision versions")
    print("2. Uninstall existing versions")
    print("3. Reinstall compatible versions")
    print("4. Verify the installation")
    
    response = input("\nDo you want to continue? (y/n): ").strip().lower()
    if response != 'y':
        print("Cancelled.")
        return
    
    # Check current versions first
    check_torch_versions()
    
    # Fix
    if fix_torchvision():
        print("\n" + "="*60)
        print("✅ Fix completed successfully!")
        print("="*60)
        print("\nNext steps:")
        print("1. Restart your backend server")
        print("2. Test whisperx transcription")
        print("3. If issues persist, try: pip install --upgrade transformers whisperx")
    else:
        print("\n" + "="*60)
        print("❌ Fix failed. Please check the errors above.")
        print("="*60)
        print("\nManual fix:")
        print("1. pip uninstall torch torchvision -y")
        print("2. pip install torch torchvision")
        print("3. pip install --upgrade transformers whisperx")

if __name__ == "__main__":
    main()

