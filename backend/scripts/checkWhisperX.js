/**
 * Script kiểm tra và hướng dẫn cài đặt WhisperX
 */
import { execSync } from 'child_process';
import { spawn } from 'child_process';

function findPythonExecutable() {
  const pythonCommands = process.platform === 'win32' 
    ? ['py -3', 'py', 'python', 'python3'] 
    : ['python3', 'python'];
  
  for (const cmd of pythonCommands) {
    try {
      const [exec, ...flags] = cmd.split(' ');
      if (process.platform === 'win32') {
        if (exec === 'py') {
          try {
            execSync(`py -3 --version`, { stdio: 'ignore', timeout: 2000, shell: true });
            return 'py -3';
          } catch (e) {
            try {
              execSync(`py --version`, { stdio: 'ignore', timeout: 2000, shell: true });
              return 'py';
            } catch (e2) {
              continue;
            }
          }
        } else {
          execSync(`${cmd} --version`, { stdio: 'ignore', timeout: 2000, shell: true });
          return cmd;
        }
      } else {
        execSync(`which ${exec}`, { stdio: 'ignore', timeout: 2000 });
        return cmd;
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

function checkWhisperX(pythonCmd) {
  try {
    const [exec, ...flags] = pythonCmd.split(' ');
    const result = execSync(`${exec} ${flags.join(' ')} -c "import whisperx; import torch; print('OK')"`, {
      encoding: 'utf-8',
      timeout: 5000,
      shell: process.platform === 'win32'
    });
    return result.trim() === 'OK';
  } catch (e) {
    return false;
  }
}

function checkTorch(pythonCmd) {
  try {
    const [exec, ...flags] = pythonCmd.split(' ');
    const result = execSync(`${exec} ${flags.join(' ')} -c "import torch; print(torch.__version__); print(torch.version.cuda if torch.cuda.is_available() else 'CPU')"`, {
      encoding: 'utf-8',
      timeout: 5000,
      shell: process.platform === 'win32'
    });
    const lines = result.trim().split('\n');
    return {
      installed: true,
      version: lines[0],
      cuda: lines[1] || 'CPU'
    };
  } catch (e) {
    return { installed: false };
  }
}

console.log('='.repeat(60));
console.log('🔍 Kiểm tra WhisperX và PyTorch');
console.log('='.repeat(60));

const pythonCmd = findPythonExecutable();
if (!pythonCmd) {
  console.error('❌ Không tìm thấy Python!');
  console.error('💡 Vui lòng cài đặt Python 3.8+ từ https://www.python.org/');
  process.exit(1);
}

console.log(`\n✅ Tìm thấy Python: ${pythonCmd}`);

// Kiểm tra PyTorch
console.log('\n📦 Kiểm tra PyTorch...');
const torchInfo = checkTorch(pythonCmd);
if (torchInfo.installed) {
  console.log(`   ✅ PyTorch ${torchInfo.version} đã cài đặt`);
  console.log(`   📊 CUDA: ${torchInfo.cuda}`);
  if (torchInfo.cuda !== 'CPU') {
    console.log(`   🚀 GPU support: Có`);
  } else {
    console.log(`   ⚠️  GPU support: Không (chỉ CPU)`);
  }
} else {
  console.log('   ❌ PyTorch chưa cài đặt');
  console.log('   💡 Cài đặt:');
  if (process.platform === 'win32') {
    console.log(`      ${pythonCmd} -m pip install torch --index-url https://download.pytorch.org/whl/cu121`);
  } else {
    console.log(`      ${pythonCmd} -m pip install torch --index-url https://download.pytorch.org/whl/cu121`);
  }
}

// Kiểm tra WhisperX
console.log('\n📦 Kiểm tra WhisperX...');
if (checkWhisperX(pythonCmd)) {
  console.log('   ✅ WhisperX đã cài đặt');
  console.log('\n🎉 Tất cả dependencies đã sẵn sàng!');
} else {
  console.log('   ❌ WhisperX chưa cài đặt');
  console.log('   💡 Cài đặt:');
  console.log(`      ${pythonCmd} -m pip install whisperx`);
  console.log('\n⚠️  Vui lòng cài đặt WhisperX trước khi sử dụng!');
  process.exit(1);
}

console.log('\n' + '='.repeat(60));

