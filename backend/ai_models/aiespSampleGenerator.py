"""
AiESP Sample Generator
Tự động tạo training samples cho AiESP từ các nguồn có sẵn
- promptSamples.json: Prompts từ speaking practice
- sampleTranscripts.json: Transcripts mẫu
- Database: Từ các conversations thực tế
"""

import json
import sys
import os
from typing import Dict, Any, List
import random
from datetime import datetime

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
    print("[AiESP Sample Generator] Warning: psycopg2 not installed", file=sys.stderr)

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

class AiESPSampleGenerator:
    """
    Tự động tạo training samples cho AiESP
    """
    
    def __init__(self):
        self.prompt_samples = self._load_prompt_samples()
        self.transcript_samples = self._load_transcript_samples()
        self.conversation_templates = self._load_conversation_templates()
    
    def _load_prompt_samples(self) -> List[str]:
        """Load prompts từ promptSamples.json"""
        try:
            prompts_path = os.path.join(os.path.dirname(__file__), 'promptSamples.json')
            if os.path.exists(prompts_path):
                with open(prompts_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                prompts = []
                for level_key in ['level_1', 'level_2', 'level_3']:
                    if level_key in data:
                        for item in data[level_key]:
                            prompt = item.get('prompt', '')
                            if prompt:
                                prompts.append(prompt)
                
                return prompts
        except Exception as e:
            print(f"[Sample Generator] Error loading prompts: {e}", file=sys.stderr)
        
        return []
    
    def _load_transcript_samples(self) -> List[Dict]:
        """Load transcripts từ sampleTranscripts.json"""
        try:
            transcripts_path = os.path.join(os.path.dirname(__file__), 'sampleTranscripts.json')
            if os.path.exists(transcripts_path):
                with open(transcripts_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            print(f"[Sample Generator] Error loading transcripts: {e}", file=sys.stderr)
        
        return []
    
    def _load_conversation_templates(self) -> List[Dict]:
        """Load conversation templates"""
        return [
            {
                'user': "I'm feeling sad today.",
                'ai': "Oh no... I'm so sorry you're feeling that way. What's making you feel sad? I'm here to listen."
            },
            {
                'user': "I got a promotion at work!",
                'ai': "That's amazing! Congratulations! I'm so happy for you! How do you feel about this new role?"
            },
            {
                'user': "I'm nervous about my exam tomorrow.",
                'ai': "I understand that feeling. Exams can be really stressful. You've prepared for this. Take a deep breath. What helps you feel calmer?"
            },
            {
                'user': "I had a fight with my friend.",
                'ai': "That sounds really difficult. It's hard when someone you care about hurts you. What happened? I'm here to listen."
            },
            {
                'user': "I'm excited about my vacation next week!",
                'ai': "That's awesome! Where are you going? I'd love to hear about your plans!"
            },
            {
                'user': "I'm worried about my future.",
                'ai': "I get that. Thinking about the future can be overwhelming. What's on your mind most? Let's talk about it."
            },
            {
                'user': "I made a mistake at work today.",
                'ai': "That's tough. Everyone makes mistakes. How are you feeling about it? What happened?"
            },
            {
                'user': "I'm grateful for my family.",
                'ai': "That's beautiful. Family is so important. What makes you feel grateful today?"
            },
            {
                'user': "I don't know what to do with my life.",
                'ai': "That's a lot to process. It's okay to feel uncertain. What are you thinking about? I'm here to help you figure it out."
            },
            {
                'user': "I'm proud of myself for finishing my project.",
                'ai': "That's wonderful! You should be proud! Finishing a project is a big accomplishment. How does it feel?"
            }
        ]
    
    def generate_conversation_samples(self, count: int = 50) -> List[Dict[str, Any]]:
        """Tạo conversation samples từ nhiều nguồn"""
        samples = []
        
        # 1. Từ conversation templates
        for template in self.conversation_templates:
            samples.append({
                'user_message': template['user'],
                'history': [],
                'expected_response': template['ai']
            })
        
        # 2. Từ prompts (tạo user messages giả lập)
        for prompt in self.prompt_samples[:20]:  # Lấy 20 prompts đầu
            # Tạo user message từ prompt (giả lập user nói về prompt)
            user_messages = [
                f"I need to practice reading this: {prompt[:50]}...",
                f"Can you help me understand this text?",
                f"I'm learning English. This is difficult for me.",
                f"I want to improve my pronunciation.",
                f"This text is about {self._extract_topic(prompt)}."
            ]
            
            for user_msg in user_messages[:2]:  # 2 variations mỗi prompt
                samples.append({
                    'user_message': user_msg,
                    'history': [],
                    'expected_response': self._generate_ai_response_for_practice(user_msg)
                })
        
        # 3. Từ transcripts (tạo conversations thực tế hơn)
        for transcript in self.transcript_samples[:10]:
            text = transcript.get('text', '')
            if text:
                samples.append({
                    'user_message': text,
                    'history': [],
                    'expected_response': self._generate_ai_response_for_transcript(text)
                })
        
        # 4. Tạo variations (thêm history, context)
        variations = []
        for sample in samples[:30]:  # Lấy 30 samples đầu
            # Thêm history
            history_samples = [
                {'text_content': sample['user_message'], 'ai_response': sample['expected_response']}
            ]
            
            # Tạo follow-up messages
            follow_ups = [
                "Tell me more about that.",
                "That's interesting. What else?",
                "I see. How does that make you feel?",
                "I understand. Can you explain more?",
                "That sounds important. What happened next?"
            ]
            
            for follow_up in follow_ups[:2]:  # 2 follow-ups mỗi sample
                variations.append({
                    'user_message': follow_up,
                    'history': history_samples,
                    'expected_response': self._generate_followup_response(follow_up, history_samples)
                })
        
        samples.extend(variations)
        
        # 5. Shuffle và limit
        random.shuffle(samples)
        return samples[:count]
    
    def _extract_topic(self, text: str) -> str:
        """Extract topic từ text"""
        # Simple topic extraction
        words = text.lower().split()
        common_words = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'about', 'into', 'through', 'during', 'including', 'until', 'against', 'among', 'throughout', 'despite', 'towards', 'upon', 'concerning', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'including', 'until', 'against', 'among', 'throughout', 'despite', 'towards', 'upon', 'concerning', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'including', 'until', 'against', 'among', 'throughout', 'despite', 'towards', 'upon', 'concerning'}
        
        keywords = [w for w in words if w not in common_words and len(w) > 3]
        if keywords:
            return keywords[0]
        return "something"
    
    def _generate_ai_response_for_practice(self, user_message: str) -> str:
        """Generate AI response cho practice messages"""
        responses = [
            "I'm here to help you practice! Let's work on this together. What would you like to focus on?",
            "That's great that you're practicing! I'm here to support you. What do you need help with?",
            "I understand. Learning English can be challenging. Let's take it step by step. What's the hardest part for you?",
            "I'm proud of you for practicing! Keep going. What would you like to work on today?",
            "That's a good start! I'm here to help. What questions do you have?"
        ]
        return random.choice(responses)
    
    def _generate_ai_response_for_transcript(self, text: str) -> str:
        """Generate AI response cho transcript"""
        text_lower = text.lower()
        
        if any(word in text_lower for word in ['sad', 'unhappy', 'depressed', 'down', 'bad', 'difficult', 'hard']):
            return "Oh no... that sounds really hard. I'm here with you. What's going on?"
        
        if any(word in text_lower for word in ['happy', 'excited', 'great', 'good', 'amazing', 'wonderful']):
            return "That's awesome! I'm so happy for you! Tell me more about it!"
        
        if any(word in text_lower for word in ['worried', 'anxious', 'nervous', 'scared', 'afraid']):
            return "I understand that feeling. It's okay to feel that way. What's on your mind?"
        
        return "I hear you. That sounds important. Can you tell me more?"
    
    def _generate_followup_response(self, follow_up: str, history: List[Dict]) -> str:
        """Generate follow-up response"""
        responses = [
            "I'm listening. Please continue.",
            "That's interesting. What else would you like to share?",
            "I understand. How does that make you feel?",
            "Tell me more about that.",
            "I'm here to listen. What's on your mind?"
        ]
        return random.choice(responses)
    
    def save_samples_to_database(self, task_type: str, samples: List[Dict[str, Any]]):
        """Lưu samples vào database"""
        if not HAS_PSYCOPG2:
            print("[Sample Generator] Cannot save to database: psycopg2 not available", file=sys.stderr)
            return
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            saved_count = 0
            skipped_count = 0
            
            for sample in samples:
                try:
                    input_data = {
                        'user_message': sample['user_message'],
                        'history': sample.get('history', [])
                    }
                    
                    expected_output = {
                        'response': sample['expected_response']
                    }
                    
                    # Insert với ON CONFLICT để tránh duplicate
                    cursor.execute('''
                        INSERT INTO assistant_ai_training 
                        (task_type, input_data, expected_output, created_at)
                        VALUES (%s, %s, %s, NOW())
                        ON CONFLICT (task_type, md5(input_data::text)) DO NOTHING
                    ''', [
                        task_type,
                        json.dumps(input_data),
                        json.dumps(expected_output)
                    ])
                    
                    # Kiểm tra xem có insert được không
                    if cursor.rowcount > 0:
                        saved_count += 1
                    else:
                        skipped_count += 1
                    
                except Exception as e:
                    # Rollback transaction và tiếp tục
                    conn.rollback()
                    skipped_count += 1
                    continue
            
            conn.commit()
            print(f"[Sample Generator] Saved {saved_count} samples, skipped {skipped_count} duplicates", file=sys.stderr)
            
        except Exception as e:
            conn.rollback()
            print(f"[Sample Generator] Error saving samples: {e}", file=sys.stderr)
        finally:
            conn.close()
    
    def generate_and_save(self, task_type: str, count: int = 50):
        """Generate và save samples"""
        print(f"[Sample Generator] Generating {count} samples for {task_type}...", file=sys.stderr)
        
        if task_type == 'conversation_ai':
            samples = self.generate_conversation_samples(count)
        else:
            print(f"[Sample Generator] Unknown task_type: {task_type}", file=sys.stderr)
            return
        
        self.save_samples_to_database(task_type, samples)
        print(f"[Sample Generator] ✅ Generated and saved {len(samples)} samples for {task_type}", file=sys.stderr)


def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Usage:", file=sys.stderr)
        print("  python aiespSampleGenerator.py generate <task_type> [count]", file=sys.stderr)
        print("  python aiespSampleGenerator.py generate-all [count]", file=sys.stderr)
        sys.exit(1)
    
    command = sys.argv[1]
    generator = AiESPSampleGenerator()
    
    if command == 'generate':
        task_type = sys.argv[2] if len(sys.argv) > 2 else 'conversation_ai'
        count = int(sys.argv[3]) if len(sys.argv) > 3 else 50
        
        generator.generate_and_save(task_type, count)
        print(json.dumps({'status': 'success', 'task_type': task_type, 'count': count}, ensure_ascii=False))
    
    elif command == 'generate-all':
        count = int(sys.argv[2]) if len(sys.argv) > 2 else 50
        
        task_types = ['conversation_ai', 'translation_check']
        for task_type in task_types:
            generator.generate_and_save(task_type, count)
        
        print(json.dumps({'status': 'success', 'count': count}, ensure_ascii=False))
    
    else:
        print(f"Unknown command: {command}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()

