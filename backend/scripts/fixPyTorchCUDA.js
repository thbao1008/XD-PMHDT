/**
 * Script khắc phục PyTorch bị downgrade về CPU
 * Chạy script này nếu PyTorch bị thay đổi thành CPU version
 */
import { execSync } from 'child_process';

const pythonCmd = 'py -3'; // Hoặc 'python' tùy hệ thống

console.log('='.repeat(60));
console.log('🔧 Khắc phục PyTorch bị downgrade về CPU');
console.log('='.repeat(60));

try {
  // 1. Kiểm tra PyTorch hiện tại
  console.log('\n1. Kiểm tra PyTorch hiện tại...');
  const currentTorch = execSync(`${pythonCmd} -c "import torch; print(torch.__version__); print('CUDA:', torch.version.cuda if torch.cuda.is_available() else 'CPU'); print('GPU:', torch.cuda.is_available())"`, {
    encoding: 'utf-8',
    shell: true
  });
  console.log(currentTorch);
  
  const lines = currentTorch.trim().split('\n');
  const version = lines[0];
  const cuda = lines[1];
  const gpu = lines[2];
  
  if (version.includes('+cu') && gpu.includes('True')) {
    console.log('✅ PyTorch CUDA đã đúng, không cần sửa!');
    process.exit(0);
  }
  
  console.log('\n⚠️  PyTorch đang là CPU version hoặc không có GPU!');
  console.log('🔧 Đang khắc phục...\n');
  
  // 2. Gỡ PyTorch CPU
  console.log('2. Gỡ PyTorch CPU...');
  try {
    execSync(`${pythonCmd} -m pip uninstall torch torchvision torchaudio -y`, {
      stdio: 'inherit',
      shell: true
    });
    console.log('✅ Đã gỡ PyTorch CPU');
  } catch (e) {
    console.log('⚠️  Không thể gỡ (có thể đã gỡ rồi)');
  }
  
  // 3. Cài lại PyTorch CUDA 2.5.1+cu121 (version CUDA cao nhất hiện có)
  console.log('\n3. Cài lại PyTorch CUDA 2.5.1+cu121...');
  console.log('   (Version CUDA cao nhất hiện có, có thể mất vài phút...)');
  execSync(`${pythonCmd} -m pip install torch==2.5.1+cu121 torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121`, {
    stdio: 'inherit',
    shell: true
  });
  console.log('✅ Đã cài PyTorch CUDA 2.5.1+cu121');
  
  // 4. Verify
  console.log('\n4. Kiểm tra lại...');
  const newTorch = execSync(`${pythonCmd} -c "import torch; print(torch.__version__); print('CUDA:', torch.version.cuda if torch.cuda.is_available() else 'CPU'); print('GPU:', torch.cuda.is_available())"`, {
    encoding: 'utf-8',
    shell: true
  });
  console.log(newTorch);
  
  const newLines = newTorch.trim().split('\n');
  const newVersion = newLines[0];
  const newCuda = newLines[1];
  const newGpu = newLines[2];
  
  if (newVersion.includes('+cu') && newGpu.includes('True')) {
    console.log('\n✅ Khắc phục thành công! PyTorch CUDA đã được cài đặt.');
    console.log('💡 Bây giờ cài WhisperX với:');
    console.log('   py -3 -m pip install whisperx --no-deps');
    console.log('   py -3 -m pip install faster-whisper --no-deps');
    console.log('   py -3 -m pip install transformers');
    console.log('   py -3 -m pip install pyannote.audio --no-deps');
    console.log('   py -3 -m pip install lightning pytorch-lightning pyannote-core pyannote-database pyannote-metrics pyannote-pipeline pyannoteai-sdk torch-audiomentations opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp');
  } else {
    console.log('\n❌ Vẫn chưa đúng. Kiểm tra lại cài đặt CUDA Toolkit.');
  }
  
} catch (error) {
  console.error('\n❌ Lỗi:', error.message);
  process.exit(1);
}

