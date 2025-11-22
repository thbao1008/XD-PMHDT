"""
AiESP - AI phụ trợ học từ OpenRouter
Kiến trúc mở rộng: Hỗ trợ nhiều task types (conversation_ai, speaking_practice, translation_check, etc.)
OpenRouter sẽ hỗ trợ và AiESP sẽ học từ đó
"""

import json
import sys
import os
from typing import Dict, Any, List, Tuple
from datetime import datetime
import re
from collections import Counter

# Try to import psycopg2, fallback to None if not available
try:
    import psycopg2
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False
    print("[AiESP] Warning: psycopg2 not installed. Install with: pip install psycopg2-binary", file=sys.stderr)

# Set UTF-8 encoding cho stdout/stderr trên Windows
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except:
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def get_db_connection():
    """Kết nối PostgreSQL database"""
    if not HAS_PSYCOPG2:
        raise ImportError("psycopg2 is required. Install with: pip install psycopg2-binary")
    
    import os
    try:
        from dotenv import load_dotenv
    except ImportError:
        pass
    
    # Load env từ .env.local hoặc .env.docker
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

class AiESP:
    """
    AiESP - AI phụ trợ với kiến trúc mở rộng
    Hỗ trợ nhiều task types: conversation_ai, speaking_practice, translation_check, etc.
    """
    def __init__(self, task_type='translation_check'):
        self.task_type = task_type
        self.model_state = {}
        self.accuracy = 0.0
        self.load_model(task_type)
    
    def load_model(self, task_type='translation_check'):
        """Load model từ database hoặc khởi tạo mới"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT model_state, accuracy_score 
                FROM assistant_ai_models 
                WHERE task_type = %s
                ORDER BY trained_at DESC 
                LIMIT 1
            ''', [task_type])
            
            result = cursor.fetchone()
            if result and result[0]:
                try:
                    self.model_state = result[0] if isinstance(result[0], dict) else json.loads(result[0])
                    self.accuracy = float(result[1]) if result[1] else 0.0
                except:
                    self.model_state = {}
                    self.accuracy = 0.0
            else:
                self.model_state = {}
                self.accuracy = 0.0
            
            conn.close()
        except Exception as e:
            print(f"[AiESP] Error loading model: {e}", file=sys.stderr)
            self.model_state = {}
            self.accuracy = 0.0
    
    def generate_response(self, input_data: Dict[str, Any]) -> str:
        """
        Generate response dựa trên task_type
        Kiến trúc mở rộng: Mỗi task type có logic riêng
        """
        if self.task_type == 'conversation_ai':
            return self._generate_conversation_response(input_data)
        elif self.task_type == 'speaking_practice':
            return self._generate_speaking_practice_response(input_data)
        elif self.task_type == 'game_conversation':
            return self._generate_game_conversation_response(input_data)
        elif self.task_type == 'translation_check':
            return self._generate_translation_check(input_data)
        else:
            # Generic response cho task types mới
            return self._generate_generic_response(input_data)
    
    def _generate_conversation_response(self, input_data: Dict[str, Any]) -> str:
        """Generate conversation response - CẢI THIỆN ĐỂ HIỂU NGỮ CẢNH VÀ CÓ SỰ NGẪU NHIÊN"""
        user_message = input_data.get('user_message', '')
        history = input_data.get('history', [])
        
        # Nếu chưa có model hoặc accuracy thấp, dùng rule-based đơn giản
        if self.accuracy < 0.5:
            return self._rule_based_conversation(user_message, history)
        
        # 1. Extract topic và context
        topic = self._extract_topic(user_message, history)
        context_keywords = self._extract_context_keywords(history)
        
        # 2. Tìm patterns phù hợp (có thể có nhiều patterns match)
        matched_patterns = []
        
        # 2a. Match theo topic trước (ưu tiên)
        topic_patterns = self.model_state.get('topic_patterns', {})
        if topic in topic_patterns:
            for pattern in topic_patterns[topic]:
                if self._match_conversation_pattern(user_message, pattern):
                    matched_patterns.append(pattern)
        
        # 2b. Match theo context
        context_key = '_'.join(context_keywords[:3]) if context_keywords else 'general'
        context_patterns = self.model_state.get('context_patterns', {})
        if context_key in context_patterns:
            for pattern in context_patterns[context_key]:
                if self._match_conversation_pattern(user_message, pattern):
                    if pattern not in matched_patterns:
                        matched_patterns.append(pattern)
        
        # 2c. Match theo keywords (fallback)
        if not matched_patterns:
            all_patterns = self.model_state.get('conversation_patterns', [])
            for pattern in all_patterns:
                if self._match_conversation_pattern(user_message, pattern):
                    matched_patterns.append(pattern)
                    if len(matched_patterns) >= 5:  # Giới hạn 5 patterns
                        break
        
        # 3. Chọn response với sự ngẫu nhiên (không chỉ dùng pattern đầu tiên)
        if matched_patterns:
            # Chọn ngẫu nhiên từ top 3 patterns phù hợp nhất
            import random
            top_patterns = matched_patterns[:3]
            selected_pattern = random.choice(top_patterns)
            
            # Có thể thêm variation nhỏ cho response
            response = selected_pattern.get('response', '')
            return self._add_response_variation(response, user_message, history)
        
        # Fallback về rule-based
        return self._rule_based_conversation(user_message, history)
    
    def _rule_based_conversation(self, user_message: str, history: List[Dict]) -> str:
        """Rule-based conversation - đơn giản nhưng tự nhiên"""
        user_lower = user_message.lower()
        
        # Emotional responses
        if any(word in user_lower for word in ['sad', 'unhappy', 'depressed', 'down', 'bad']):
            return "Oh no... that sounds really hard. I'm here with you. What's going on?"
        
        if any(word in user_lower for word in ['happy', 'excited', 'great', 'good', 'amazing']):
            return "That's awesome! I'm so happy for you! Tell me more about it!"
        
        if any(word in user_lower for word in ['worried', 'anxious', 'nervous', 'scared']):
            return "I understand that feeling. It's okay to feel that way. What's on your mind?"
        
        if any(word in user_lower for word in ['thank', 'thanks']):
            return "You're welcome! I'm here whenever you need me."
        
        # Default empathetic response
        return "I hear you. That sounds important. Can you tell me more?"
    
    def _match_conversation_pattern(self, user_message: str, pattern: Dict) -> bool:
        """Kiểm tra xem user message có match với pattern không - CẢI THIỆN ĐỂ HIỂU NGỮ CẢNH"""
        keywords = pattern.get('keywords', [])
        if not keywords:
            return False
        
        user_lower = user_message.lower()
        
        # Match ít nhất 2 keywords (để chính xác hơn)
        matched_keywords = sum(1 for kw in keywords if kw.lower() in user_lower)
        return matched_keywords >= 2
    
    def _generate_speaking_practice_response(self, input_data: Dict[str, Any]) -> str:
        """Generate speaking practice response - hỗ trợ luyện tập"""
        user_message = input_data.get('user_message', '')
        history = input_data.get('history', [])
        
        # Nếu chưa có model hoặc accuracy thấp, dùng rule-based
        if self.accuracy < 0.5:
            return self._rule_based_practice_response(user_message, history)
        
        # Sử dụng patterns đã học
        patterns = self.model_state.get('conversation_patterns', [])
        
        # Tìm pattern phù hợp
        for pattern in patterns:
            if self._match_conversation_pattern(user_message, pattern):
                return pattern.get('response', '')
        
        # Fallback về rule-based
        return self._rule_based_practice_response(user_message, history)
    
    def _rule_based_practice_response(self, user_message: str, history: List[Dict]) -> str:
        """Rule-based practice response"""
        user_lower = user_message.lower()
        
        if any(word in user_lower for word in ['practice', 'practicing', 'pronunciation']):
            return "Great! Let's practice together. What word or phrase would you like to work on? I'll help you pronounce it correctly."
        
        if any(word in user_lower for word in ['improve', 'better', 'skills']):
            return "That's wonderful! Practice makes perfect. Let's work on your speaking skills together. What would you like to practice?"
        
        if any(word in user_lower for word in ['nervous', 'afraid', 'scared', 'worried']):
            return "I understand that feeling. It's completely normal to feel nervous. Let's start with something easy and build your confidence. What topic are you comfortable talking about?"
        
        return "I'm here to help you practice! What would you like to work on today?"
    
    def _generate_game_conversation_response(self, input_data: Dict[str, Any]) -> str:
        """Generate game conversation response - hỗ trợ game với nhiều NPCs"""
        user_message = input_data.get('user_message', '')
        history = input_data.get('history', [])
        
        # Nếu chưa có model hoặc accuracy thấp, dùng rule-based
        if self.accuracy < 0.5:
            return self._rule_based_game_response(user_message, history)
        
        # Sử dụng patterns đã học
        patterns = self.model_state.get('conversation_patterns', [])
        
        # Tìm pattern phù hợp
        for pattern in patterns:
            if self._match_conversation_pattern(user_message, pattern):
                return pattern.get('response', '')
        
        # Fallback về rule-based
        return self._rule_based_game_response(user_message, history)
    
    def _rule_based_game_response(self, user_message: str, history: List[Dict]) -> str:
        """Rule-based game conversation response"""
        user_lower = user_message.lower()
        
        if any(word in user_lower for word in ['key', 'door', 'open', 'find']):
            return "You're looking for something? Let me help you. Have you talked to the shopkeeper? They might know where it is. Or maybe check with the librarian - they often have information about important items."
        
        if any(word in user_lower for word in ['quest', 'mission', 'complete', 'finish']):
            return "To complete this quest, you'll need to talk to several people. First, visit the village elder to get information. Then, speak with the merchant to get supplies. Finally, talk to the guard to get permission. Each person has a piece of the puzzle!"
        
        if any(word in user_lower for word in ['stuck', 'help', 'what', 'next', 'do']):
            return "Don't worry! There are many people who can help you. Try talking to: the guide at the entrance, the helper at the market, or the advisor at the castle. Each person has different information and can guide you in different ways."
        
        if any(word in user_lower for word in ['talked', 'spoke', 'said', 'told']):
            return "Good progress! Based on what you learned, try talking to the next person in the chain. Each conversation brings you closer to your goal!"
        
        if any(word in user_lower for word in ['collect', 'items', 'get', 'need']):
            return "To collect items, you'll need to talk to different people. The collector has rare items, the trader has common supplies, and the artisan can create special items. Start by talking to the collector!"
        
        return "To progress in this game, you need to interact with different characters. Try talking to: the farmer, the blacksmith, or the scholar. Each conversation will help you get closer to completing your goal!"
    
    def _generate_translation_check(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Check translation - giữ nguyên logic cũ"""
        english_text = input_data.get('english_text', '')
        vietnamese_translation = input_data.get('vietnamese_translation', '')
        
        if self.accuracy < 0.7:
            return self._rule_based_translation_check(english_text, vietnamese_translation)
        
        return self._model_based_translation_check(english_text, vietnamese_translation)
    
    def _rule_based_translation_check(self, english_text: str, vietnamese_translation: str) -> Dict[str, Any]:
        """Rule-based translation checking"""
        if not vietnamese_translation or len(vietnamese_translation.strip()) < 3:
            return {
                "correct": False,
                "feedback": "Bản dịch quá ngắn. Hãy thử lại."
            }
        
        english_words = len(english_text.split())
        vietnamese_words = len(vietnamese_translation.split())
        
        if vietnamese_words < english_words * 0.3:
            return {
                "correct": False,
                "feedback": "Bản dịch có vẻ quá ngắn so với đoạn văn gốc."
            }
        
        if vietnamese_words > english_words * 2:
            return {
                "correct": False,
                "feedback": "Bản dịch có vẻ quá dài so với đoạn văn gốc."
            }
        
        return {
            "correct": True,
            "feedback": "Chính xác! Bạn đã hiểu đúng nghĩa."
        }
    
    def _model_based_translation_check(self, english_text: str, vietnamese_translation: str) -> Dict[str, Any]:
        """Model-based translation checking"""
        patterns = self.model_state.get('patterns', [])
        
        for pattern in patterns:
            if self._match_pattern(english_text, vietnamese_translation, pattern):
                return pattern['output']
        
        return self._rule_based_translation_check(english_text, vietnamese_translation)
    
    def _match_pattern(self, english: str, vietnamese: str, pattern: Dict) -> bool:
        """Kiểm tra xem input có match với pattern không"""
        english_keywords = pattern.get('english_keywords', [])
        vietnamese_keywords = pattern.get('vietnamese_keywords', [])
        
        english_lower = english.lower()
        vietnamese_lower = vietnamese.lower()
        
        english_match = all(kw in english_lower for kw in english_keywords) if english_keywords else True
        vietnamese_match = any(kw in vietnamese_lower for kw in vietnamese_keywords) if vietnamese_keywords else True
        
        return english_match and vietnamese_match
    
    def _generate_generic_response(self, input_data: Dict[str, Any]) -> str:
        """Generic response cho task types mới"""
        # Có thể mở rộng cho các task types khác trong tương lai
        return "I'm here to help!"
    
    def train(self, task_type: str = None):
        """Train model từ training data - hỗ trợ nhiều task types"""
        if task_type:
            self.task_type = task_type
            self.load_model(task_type)
        
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Lấy training data cho task_type này
            cursor.execute('''
                SELECT input_data, expected_output 
                FROM assistant_ai_training 
                WHERE task_type = %s
                ORDER BY created_at DESC
                LIMIT 1000
            ''', [self.task_type])
            
            training_samples = cursor.fetchall()
            
            # Giảm min_samples để train nhanh hơn
            # Nếu chưa có model (accuracy = 0.0), train với ít samples hơn (tối thiểu 3)
            # Nếu đã có model, cần ít nhất 5 samples (giảm từ 10)
            min_samples = 3 if self.accuracy == 0.0 else 5
            
            if len(training_samples) < min_samples:
                print(f"[AiESP] Not enough training data for {self.task_type}: {len(training_samples)} samples (need {min_samples})", file=sys.stderr)
                conn.close()
                return
            
            # Train dựa trên task_type
            if self.task_type == 'conversation_ai':
                self._train_conversation(cursor, training_samples)
            elif self.task_type == 'translation_check':
                self._train_translation(cursor, training_samples)
            else:
                # Generic training cho task types mới
                self._train_generic(cursor, training_samples)
            
            # Lưu model
            cursor.execute('''
                INSERT INTO assistant_ai_models (task_type, accuracy_score, model_state, trained_at)
                VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
            ''', [self.task_type, self.accuracy, json.dumps(self.model_state)])
            
            conn.commit()
            conn.close()
            
            print(f"[AiESP] Training completed for {self.task_type}: {len(training_samples)} samples, accuracy: {self.accuracy:.2%}", file=sys.stderr)
        except Exception as e:
            print(f"[AiESP] Training error: {e}", file=sys.stderr)
            raise
    
    def _train_conversation(self, cursor, training_samples):
        """Train conversation patterns từ OpenRouter responses - CẢI THIỆN ĐỂ HỌC NGỮ CẢNH VÀ CHỦ ĐỀ"""
        conversation_patterns = []
        topic_patterns = {}  # Nhóm theo chủ đề
        context_patterns = {}  # Nhóm theo ngữ cảnh
        correct_count = 0
        total_count = len(training_samples)
        
        for input_data_raw, expected_output_raw in training_samples:
            try:
                input_data = input_data_raw if isinstance(input_data_raw, dict) else json.loads(input_data_raw)
                expected_output = expected_output_raw if isinstance(expected_output_raw, dict) else json.loads(expected_output_raw)
                
                user_message = input_data.get('user_message', '')
                response = expected_output.get('response', '')
                history = input_data.get('history', [])
                
                if not user_message or not response:
                    continue
                
                # 1. Extract keywords từ user message (cải thiện)
                keywords = self._extract_keywords(user_message)
                
                # 2. Extract topic từ user message và history
                topic = self._extract_topic(user_message, history)
                
                # 3. Extract context từ history (ngữ cảnh cuộc trò chuyện)
                context_keywords = self._extract_context_keywords(history)
                
                # 4. Tạo pattern với nhiều thông tin hơn
                pattern = {
                    'keywords': keywords[:8],  # Tăng lên 8 keywords
                    'response': response,
                    'topic': topic,
                    'context_keywords': context_keywords[:5],
                    'history_length': len(history),
                    'response_length': len(response.split()),
                    'response_style': self._classify_response_style(response)
                }
                
                conversation_patterns.append(pattern)
                
                # 5. Nhóm theo topic để có sự đa dạng
                if topic not in topic_patterns:
                    topic_patterns[topic] = []
                topic_patterns[topic].append(pattern)
                
                # 6. Nhóm theo context
                context_key = '_'.join(context_keywords[:3]) if context_keywords else 'general'
                if context_key not in context_patterns:
                    context_patterns[context_key] = []
                context_patterns[context_key].append(pattern)
                
                correct_count += 1
                
            except Exception as e:
                continue
        
        # Lưu tất cả patterns và topic/context groups
        self.model_state['conversation_patterns'] = conversation_patterns[:500]  # Tăng lên 500 patterns
        self.model_state['topic_patterns'] = {k: v[:20] for k, v in topic_patterns.items()}  # Top 20 mỗi topic
        self.model_state['context_patterns'] = {k: v[:20] for k, v in context_patterns.items()}  # Top 20 mỗi context
        self.accuracy = correct_count / total_count if total_count > 0 else 0.0
    
    def _train_translation(self, cursor, training_samples):
        """Train translation patterns"""
        patterns = []
        correct_count = 0
        total_count = len(training_samples)
        
        for input_data_raw, expected_output_raw in training_samples:
            try:
                input_data = input_data_raw if isinstance(input_data_raw, dict) else json.loads(input_data_raw)
                expected_output = expected_output_raw if isinstance(expected_output_raw, dict) else json.loads(expected_output_raw)
                
                english_text = input_data.get('english_text', '')
                vietnamese_translation = input_data.get('vietnamese_translation', '')
                
                english_keywords = self._extract_keywords(english_text)
                vietnamese_keywords = self._extract_keywords(vietnamese_translation)
                
                patterns.append({
                    'english_keywords': english_keywords[:5],
                    'vietnamese_keywords': vietnamese_keywords[:5],
                    'output': expected_output
                })
                
                if expected_output.get('correct', False):
                    correct_count += 1
                
            except Exception as e:
                continue
        
        self.model_state['patterns'] = patterns[:100]
        self.accuracy = correct_count / total_count if total_count > 0 else 0.0
    
    def _train_generic(self, cursor, training_samples):
        """Generic training cho task types mới"""
        # Có thể mở rộng cho các task types khác
        self.model_state = {'patterns': []}
        self.accuracy = 0.5  # Default accuracy
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract keywords từ text (loại bỏ stop words)"""
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their'}
        
        words = re.findall(r'\b\w+\b', text.lower())
        keywords = [w for w in words if w not in stop_words and len(w) > 2]
        
        word_freq = Counter(keywords)
        return [word for word, _ in word_freq.most_common(10)]
    
    def _extract_topic(self, user_message: str, history: List[Dict]) -> str:
        """Extract topic từ user message và history"""
        # Common topics
        topics = {
            'emotion': ['sad', 'happy', 'angry', 'worried', 'anxious', 'excited', 'depressed', 'nervous', 'scared'],
            'work': ['work', 'job', 'office', 'boss', 'colleague', 'project', 'meeting', 'career'],
            'family': ['family', 'parent', 'mother', 'father', 'sibling', 'brother', 'sister', 'child'],
            'relationship': ['friend', 'boyfriend', 'girlfriend', 'partner', 'love', 'relationship', 'dating'],
            'health': ['health', 'sick', 'ill', 'doctor', 'hospital', 'pain', 'tired', 'sleep'],
            'education': ['school', 'study', 'exam', 'test', 'homework', 'teacher', 'student', 'learn'],
            'hobby': ['hobby', 'sport', 'music', 'movie', 'book', 'game', 'travel', 'cooking'],
            'future': ['future', 'plan', 'dream', 'goal', 'wish', 'hope', 'want', 'aspiration']
        }
        
        text = user_message.lower()
        if history:
            # Thêm context từ history
            for h in history[-2:]:  # Lấy 2 messages gần nhất
                if isinstance(h, dict):
                    text += ' ' + (h.get('text_content', '') or h.get('ai_response', '')).lower()
        
        # Tìm topic phù hợp nhất
        topic_scores = {}
        for topic, keywords in topics.items():
            score = sum(1 for kw in keywords if kw in text)
            if score > 0:
                topic_scores[topic] = score
        
        if topic_scores:
            return max(topic_scores, key=topic_scores.get)
        
        return 'general'
    
    def _extract_context_keywords(self, history: List[Dict]) -> List[str]:
        """Extract context keywords từ history"""
        if not history:
            return []
        
        context_text = ''
        for h in history[-3:]:  # Lấy 3 messages gần nhất
            if isinstance(h, dict):
                context_text += ' ' + (h.get('text_content', '') or h.get('ai_response', '')).lower()
        
        if not context_text:
            return []
        
        # Extract keywords từ context
        return self._extract_keywords(context_text)
    
    def _classify_response_style(self, response: str) -> str:
        """Phân loại style của response"""
        response_lower = response.lower()
        
        if any(word in response_lower for word in ['?', 'what', 'how', 'why', 'tell me']):
            return 'questioning'
        elif any(word in response_lower for word in ['sorry', 'understand', 'feel']):
            return 'empathetic'
        elif any(word in response_lower for word in ['great', 'awesome', 'amazing', 'congratulations']):
            return 'encouraging'
        elif any(word in response_lower for word in ['okay', 'sure', 'yes', 'alright']):
            return 'agreeing'
        else:
            return 'general'
    
    def _add_response_variation(self, response: str, user_message: str, history: List[Dict]) -> str:
        """Thêm variation nhỏ cho response để tự nhiên hơn"""
        # Hiện tại chỉ trả về response gốc
        # Có thể cải thiện sau để thêm variation
        return response


def main():
    """Main function - hỗ trợ nhiều commands"""
    if len(sys.argv) < 2:
        print("Usage: python assistantAI.py <command> [task_type] [args...]", file=sys.stderr)
        print("Commands: conversation, translation_check, train, check_translation", file=sys.stderr)
        sys.exit(1)
    
    command = sys.argv[1]
    task_type = sys.argv[2] if len(sys.argv) > 2 else 'translation_check'
    
    ai = AiESP(task_type=task_type)
    
    if command == 'conversation':
        # Đọc input từ stdin
        input_data = json.loads(sys.stdin.read())
        response = ai.generate_response(input_data)
        print(response, end='')
    
    elif command == 'check_translation':
        # Đọc input từ stdin
        input_data = json.loads(sys.stdin.read())
        result = ai._generate_translation_check(input_data)
        print(json.dumps(result, ensure_ascii=False))
    
    elif command == 'train':
        ai.train()
        print(json.dumps({
            'status': 'success',
            'task_type': ai.task_type,
            'accuracy': ai.accuracy,
            'trained_at': datetime.now().isoformat()
        }, ensure_ascii=False))
    
    else:
        print(f"Unknown command: {command}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
