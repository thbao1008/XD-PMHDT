"""
AiESP Continuous Learning System
- Tự động học liên tục từ OpenRouter (giáo viên)
- Tự động train và cải thiện model
- Monitoring và đánh giá performance
- Tự động trigger training khi cần
"""

import json
import sys
import os
import time
import subprocess
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

# Set UTF-8 encoding
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except:
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False
    print("[AiESP Learning] Warning: psycopg2 not installed", file=sys.stderr)

def get_db_connection():
    """Kết nối database"""
    if not HAS_PSYCOPG2:
        raise ImportError("psycopg2 required")
    
    try:
        from dotenv import load_dotenv
    except:
        pass
    
    env_file = os.path.join(os.path.dirname(__file__), '..', '.env.local')
    if not os.path.exists(env_file):
        env_file = os.path.join(os.path.dirname(__file__), '..', '.env.docker')
    
    try:
        load_dotenv(env_file)
    except:
        pass
    
    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        database=os.getenv('DB_NAME', 'aesp'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', '1234'),
        port=int(os.getenv('DB_PORT', 5432))
    )

class AiESPContinuousLearning:
    """
    Hệ thống học tập liên tục cho AiESP
    - Tự động train khi có đủ dữ liệu
    - Đánh giá và cải thiện model
    - Monitoring performance
    """
    
    def __init__(self):
        self.task_types = ['conversation_ai', 'translation_check', 'speaking_practice', 'game_conversation']
        self.training_threshold = 20  # Train mỗi 20 samples (giảm từ 50 để học nhanh hơn)
        self.initial_training_threshold = 3  # Train lần đầu với 3 samples (giảm từ 5)
        self.min_accuracy_improvement = 0.01  # Cải thiện tối thiểu 1% (giảm từ 2%)
        self.max_training_attempts = 5  # Tối đa 5 lần train liên tiếp (tăng từ 3)
    
    def check_and_train_all_tasks(self):
        """Kiểm tra và train tất cả task types"""
        results = {}
        
        for task_type in self.task_types:
            try:
                result = self.check_and_train_task(task_type)
                results[task_type] = result
            except Exception as e:
                print(f"[AiESP Learning] Error training {task_type}: {e}", file=sys.stderr)
                results[task_type] = {'status': 'error', 'error': str(e)}
        
        return results
    
    def check_and_train_task(self, task_type: str) -> Dict[str, Any]:
        """Kiểm tra và train một task type cụ thể"""
        if not HAS_PSYCOPG2:
            return {
                "task_type": task_type,
                "status": "skipped",
                "reason": "psycopg2 not installed. Install with: pip install psycopg2-binary"
            }
        
        try:
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
        except ImportError as e:
            return {
                "task_type": task_type,
                "status": "error",
                "error": f"Database connection failed: {e}"
            }
        except Exception as e:
            return {
                "task_type": task_type,
                "status": "error",
                "error": f"Database error: {e}"
            }
        
        try:
            # 1. Kiểm tra số lượng training data mới
            cursor.execute('''
                SELECT COUNT(*) as count
                FROM assistant_ai_training
                WHERE task_type = %s
                AND created_at > (
                    SELECT COALESCE(MAX(trained_at), '1970-01-01')
                    FROM assistant_ai_models
                    WHERE task_type = %s
                )
            ''', [task_type, task_type])
            
            new_samples = cursor.fetchone()['count']
            
            # 2. Lấy accuracy hiện tại
            cursor.execute('''
                SELECT accuracy_score, trained_at
                FROM assistant_ai_models
                WHERE task_type = %s
                ORDER BY trained_at DESC
                LIMIT 1
            ''', [task_type])
            
            current_model = cursor.fetchone()
            current_accuracy = float(current_model['accuracy_score']) if current_model and current_model['accuracy_score'] else 0.0
            
            # 3. Quyết định có train không
            should_train = False
            reason = ""
            
            # Nếu chưa có model (accuracy = 0.0), train ngay với ít samples hơn
            if current_accuracy == 0.0 and new_samples >= self.initial_training_threshold:
                should_train = True
                reason = f"Chưa có model, train với {new_samples} samples (tối thiểu {self.initial_training_threshold})"
            elif new_samples >= self.training_threshold:
                should_train = True
                reason = f"Có {new_samples} samples mới (>= {self.training_threshold})"
            # Train nhanh hơn khi accuracy thấp
            elif current_accuracy < 0.7 and new_samples >= 10:  # Giảm từ 20 → 10
                should_train = True
                reason = f"Accuracy thấp ({current_accuracy:.2%}), có {new_samples} samples mới"
            elif current_accuracy < 0.5 and new_samples >= 5:  # Giảm từ 10 → 5
                should_train = True
                reason = f"Accuracy rất thấp ({current_accuracy:.2%}), train với {new_samples} samples"
            elif current_accuracy < 0.85 and new_samples >= 15:  # Thêm điều kiện mới: train khi accuracy < 85% và có 15+ samples
                should_train = True
                reason = f"Accuracy chưa đạt mục tiêu ({current_accuracy:.2%}), có {new_samples} samples mới"
            elif new_samples >= 50:  # Giảm từ 100 → 50 để force train sớm hơn
                should_train = True
                reason = f"Có {new_samples} samples mới (>= 50, force train)"
            
            if not should_train:
                return {
                    'status': 'skipped',
                    'task_type': task_type,
                    'current_accuracy': current_accuracy,
                    'new_samples': new_samples,
                    'reason': f"Chưa đủ điều kiện train ({new_samples} samples mới)"
                }
            
            # 4. Train model
            print(f"[AiESP Learning] Training {task_type}... ({reason})", file=sys.stderr)
            train_result = self.train_task(task_type)
            
            # 5. Đánh giá kết quả
            cursor.execute('''
                SELECT accuracy_score, trained_at
                FROM assistant_ai_models
                WHERE task_type = %s
                ORDER BY trained_at DESC
                LIMIT 1
            ''', [task_type])
            
            new_model = cursor.fetchone()
            new_accuracy = float(new_model['accuracy_score']) if new_model and new_model['accuracy_score'] else 0.0
            
            accuracy_improvement = new_accuracy - current_accuracy
            
            # 6. Đánh giá performance
            performance = self.evaluate_performance(task_type, current_accuracy, new_accuracy)
            
            return {
                'status': 'trained',
                'task_type': task_type,
                'current_accuracy': current_accuracy,
                'new_accuracy': new_accuracy,
                'accuracy_improvement': accuracy_improvement,
                'new_samples': new_samples,
                'performance': performance,
                'train_result': train_result
            }
            
        finally:
            conn.close()
    
    def train_task(self, task_type: str) -> Dict[str, Any]:
        """Train một task type"""
        try:
            assistant_path = os.path.join(os.path.dirname(__file__), 'assistantAI.py')
            
            result = subprocess.run(
                ['python', assistant_path, 'train', task_type],
                capture_output=True,
                text=True,
                encoding='utf-8',
                timeout=300  # 5 phút timeout
            )
            
            if result.returncode == 0:
                try:
                    return json.loads(result.stdout)
                except:
                    return {'status': 'success', 'output': result.stdout}
            else:
                return {'status': 'error', 'error': result.stderr}
                
        except subprocess.TimeoutExpired:
            return {'status': 'error', 'error': 'Training timeout'}
        except Exception as e:
            return {'status': 'error', 'error': str(e)}
    
    def evaluate_performance(self, task_type: str, old_accuracy: float, new_accuracy: float) -> Dict[str, Any]:
        """Đánh giá performance của model"""
        improvement = new_accuracy - old_accuracy
        improvement_percent = (improvement / old_accuracy * 100) if old_accuracy > 0 else 0
        
        # Đánh giá
        if new_accuracy >= 0.95:
            grade = "Excellent"
            recommendation = "Model đã đạt trình độ cao. Có thể giảm tần suất training."
        elif new_accuracy >= 0.85:
            grade = "Very Good"
            recommendation = "Model tốt. Tiếp tục training để đạt 95%+."
        elif new_accuracy >= 0.70:
            grade = "Good"
            recommendation = "Model ổn. Cần thêm training data để cải thiện."
        elif new_accuracy >= 0.50:
            grade = "Fair"
            recommendation = "Model cần cải thiện. Tăng training data và review patterns."
        else:
            grade = "Poor"
            recommendation = "Model yếu. Cần nhiều training data hơn và review logic."
        
        # Đánh giá cải thiện
        if improvement >= 0.05:
            improvement_status = "Significant improvement"
        elif improvement >= 0.02:
            improvement_status = "Moderate improvement"
        elif improvement >= 0:
            improvement_status = "Slight improvement"
        else:
            improvement_status = "Degradation - review needed"
        
        return {
            'grade': grade,
            'improvement': improvement,
            'improvement_percent': improvement_percent,
            'improvement_status': improvement_status,
            'recommendation': recommendation,
            'target_accuracy': 0.95,
            'distance_to_target': 0.95 - new_accuracy
        }
    
    def monitor_all_models(self) -> Dict[str, Any]:
        """Monitor tất cả models"""
        if not HAS_PSYCOPG2:
            return {
                "status": "skipped",
                "reason": "psycopg2 not installed. Install with: pip install psycopg2-binary",
                "models": {}
            }
        
        try:
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
        except ImportError as e:
            return {
                "status": "error",
                "error": f"Database connection failed: {e}",
                "models": {}
            }
        except Exception as e:
            return {
                "status": "error",
                "error": f"Database error: {e}",
                "models": {}
            }
        
        try:
            monitoring = {}
            
            for task_type in self.task_types:
                # Lấy model mới nhất
                cursor.execute('''
                    SELECT accuracy_score, trained_at, model_state
                    FROM assistant_ai_models
                    WHERE task_type = %s
                    ORDER BY trained_at DESC
                    LIMIT 1
                ''', [task_type])
                
                model = cursor.fetchone()
                
                # Đếm training data
                cursor.execute('''
                    SELECT COUNT(*) as count
                    FROM assistant_ai_training
                    WHERE task_type = %s
                ''', [task_type])
                
                training_count = cursor.fetchone()['count']
                
                # Đếm training data mới (chưa train)
                cursor.execute('''
                    SELECT COUNT(*) as count
                    FROM assistant_ai_training
                    WHERE task_type = %s
                    AND created_at > (
                        SELECT COALESCE(MAX(trained_at), '1970-01-01')
                        FROM assistant_ai_models
                        WHERE task_type = %s
                    )
                ''', [task_type, task_type])
                
                new_samples = cursor.fetchone()['count']
                
                monitoring[task_type] = {
                    'accuracy': float(model['accuracy_score']) if model and model['accuracy_score'] else 0.0,
                    'trained_at': model['trained_at'].isoformat() if model and model['trained_at'] else None,
                    'training_samples': training_count,
                    'new_samples': new_samples,
                    'ready': float(model['accuracy_score']) >= 0.85 if model and model['accuracy_score'] else False,
                    'needs_training': new_samples >= self.training_threshold
                }
            
            return monitoring
            
        finally:
            conn.close()
    
    def run_continuous_learning(self, interval_seconds: int = 120):
        """Chạy continuous learning (mỗi 2 phút mặc định để học nhanh hơn)"""
        print(f"[AiESP Learning] Starting continuous learning (interval: {interval_seconds}s)", file=sys.stderr)
        
        # Generate initial samples nếu cần
        self._generate_samples_if_needed()
        
        while True:
            try:
                print(f"[AiESP Learning] Checking at {datetime.now()}", file=sys.stderr)
                
                # 1. Monitor tất cả models
                monitoring = self.monitor_all_models()
                print(f"[AiESP Learning] Monitoring: {json.dumps(monitoring, indent=2, ensure_ascii=False)}", file=sys.stderr)
                
                # 2. Generate samples nếu cần
                self._generate_samples_if_needed()
                
                # 3. Check Local GPU training nếu cần (mỗi 5 phút để học nhanh hơn)
                now = datetime.now()
                last_local_gpu_check = getattr(self, '_last_local_gpu_check', now)
                local_gpu_check_interval = 5 * 60  # 5 phút (giảm từ 10 phút)
                if (now - last_local_gpu_check).total_seconds() >= local_gpu_check_interval:
                    self._check_local_gpu_training()
                    self._last_local_gpu_check = now
                
                # 4. Train các task types cần train
                results = self.check_and_train_all_tasks()
                
                # 5. Log kết quả
                for task_type, result in results.items():
                    if result.get('status') == 'trained':
                        print(f"[AiESP Learning] ✅ {task_type}: {result['current_accuracy']:.2%} → {result['new_accuracy']:.2%} ({result['performance']['grade']})", file=sys.stderr)
                    elif result.get('status') == 'skipped':
                        print(f"[AiESP Learning] ⏭️  {task_type}: {result['reason']}", file=sys.stderr)
                
                # 6. Đợi interval
                time.sleep(interval_seconds)
                
            except KeyboardInterrupt:
                print("[AiESP Learning] Stopped by user", file=sys.stderr)
                break
            except Exception as e:
                print(f"[AiESP Learning] Error in continuous learning: {e}", file=sys.stderr)
                time.sleep(interval_seconds)  # Đợi rồi thử lại
    
    def _check_local_gpu_training(self):
        """Kiểm tra và trigger Local GPU training nếu cần"""
        try:
            local_gpu_path = os.path.join(os.path.dirname(__file__), 'localGPUTraining.py')
            if not os.path.exists(local_gpu_path):
                return
            
            # Check GPU availability trước
            check_result = subprocess.run(
                ['python', local_gpu_path, 'check-gpu'],
                capture_output=True,
                text=True,
                encoding='utf-8',
                timeout=10
            )
            
            if check_result.returncode == 0:
                gpu_info = json.loads(check_result.stdout)
                if gpu_info.get('nvidia_gpu_available') and gpu_info.get('nvidia_gpu_index') is not None:
                    nvidia_gpu_index = str(gpu_info.get('nvidia_gpu_index', '0'))
                    nvidia_gpu_name = gpu_info.get('nvidia_gpu_name', 'NVIDIA GPU')
                    print(f"[AiESP Learning] 🚀 NVIDIA GPU (rời) available: {nvidia_gpu_name} (index {nvidia_gpu_index}), starting training...", file=sys.stderr)
                    
                    # Train với NVIDIA GPU (background, không block)
                    subprocess.Popen(
                        ['python', local_gpu_path, 'train-all', '--web-learning'],
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        env={
                            **os.environ,
                            'CUDA_VISIBLE_DEVICES': nvidia_gpu_index,  # Chỉ sử dụng NVIDIA GPU
                            'PYTORCH_CUDA_ALLOC_CONF': 'max_split_size_mb:512'
                        }
                    )
                    print("[AiESP Learning] ✅ Local NVIDIA GPU training started in background", file=sys.stderr)
                elif gpu_info.get('cuda_available'):
                    print("[AiESP Learning] ⚠️ CUDA available but NVIDIA GPU not specifically detected, skipping", file=sys.stderr)
                else:
                    print("[AiESP Learning] ⚠️ GPU not available, skipping local GPU training", file=sys.stderr)
        except Exception as e:
            print(f"[AiESP Learning] ⚠️ Error checking local GPU training: {e}", file=sys.stderr)
    
    def _generate_samples_if_needed(self):
        """Tự động generate samples nếu cần"""
        if not HAS_PSYCOPG2:
            print("[AiESP Learning] ⚠️ psycopg2 not installed, skipping sample generation. Install with: pip install psycopg2-binary", file=sys.stderr)
            return
        
        try:
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
        except ImportError as e:
            print(f"[AiESP Learning] ⚠️ Database connection failed: {e}. Skipping sample generation.", file=sys.stderr)
            return
        except Exception as e:
            print(f"[AiESP Learning] ⚠️ Database error: {e}. Skipping sample generation.", file=sys.stderr)
            return
        
        try:
            for task_type in self.task_types:
                # Đếm samples hiện có
                cursor.execute('''
                    SELECT COUNT(*) as count
                    FROM assistant_ai_training
                    WHERE task_type = %s
                ''', [task_type])
                
                sample_count = cursor.fetchone()['count']
                
                # Nếu ít hơn 30 samples, generate thêm (tăng từ 20 để có đủ data)
                if sample_count < 30:
                    needed = 50 - sample_count
                    print(f"[AiESP Learning] Generating {needed} samples for {task_type} (currently {sample_count})", file=sys.stderr)
                    
                    try:
                        generator_path = os.path.join(os.path.dirname(__file__), 'aiespSampleGenerator.py')
                        result = subprocess.run(
                            ['python', generator_path, 'generate', task_type, str(needed)],
                            capture_output=True,
                            text=True,
                            encoding='utf-8',
                            timeout=60
                        )
                        
                        if result.returncode == 0:
                            print(f"[AiESP Learning] ✅ Generated samples for {task_type}", file=sys.stderr)
                        else:
                            print(f"[AiESP Learning] ⚠️ Sample generation warning: {result.stderr}", file=sys.stderr)
                    except Exception as e:
                        print(f"[AiESP Learning] ⚠️ Error generating samples: {e}", file=sys.stderr)
        
        finally:
            conn.close()


def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Usage:", file=sys.stderr)
        print("  python aiespContinuousLearning.py check [task_type]", file=sys.stderr)
        print("  python aiespContinuousLearning.py train [task_type]", file=sys.stderr)
        print("  python aiespContinuousLearning.py train-all", file=sys.stderr)
        print("  python aiespContinuousLearning.py monitor", file=sys.stderr)
        print("  python aiespContinuousLearning.py continuous [interval_seconds]", file=sys.stderr)
        sys.exit(1)
    
    command = sys.argv[1]
    learner = AiESPContinuousLearning()
    
    if command == 'check':
        task_type = sys.argv[2] if len(sys.argv) > 2 else None
        if task_type:
            result = learner.check_and_train_task(task_type)
        else:
            result = learner.check_and_train_all_tasks()
        print(json.dumps(result, indent=2, ensure_ascii=False))
    
    elif command == 'train':
        task_type = sys.argv[2] if len(sys.argv) > 2 else 'conversation_ai'
        result = learner.train_task(task_type)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    
    elif command == 'train-all':
        # Train tất cả task types
        task_types = ['conversation_ai', 'translation_check', 'speaking_practice', 'game_conversation']
        results = {}
        for tt in task_types:
            print(f"\n📚 Training {tt}...", file=sys.stderr)
            result = learner.train_task(tt)
            results[tt] = result
            if result.get('status') == 'success':
                print(f"✅ {tt} training completed", file=sys.stderr)
            else:
                print(f"⚠️ {tt} training: {result.get('error', 'Unknown error')}", file=sys.stderr)
        print(json.dumps(results, indent=2, ensure_ascii=False))
    
    elif command == 'monitor':
        monitoring = learner.monitor_all_models()
        print(json.dumps(monitoring, indent=2, ensure_ascii=False))
    
    elif command == 'continuous':
        interval = int(sys.argv[2]) if len(sys.argv) > 2 else 300
        learner.run_continuous_learning(interval)
    
    else:
        print(f"Unknown command: {command}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()

