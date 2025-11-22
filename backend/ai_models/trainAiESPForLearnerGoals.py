"""
Train AiESP với 3 mục tiêu của learner:
1. Practice (speaking practice)
2. Kể chuyện và lắng nghe (story/conversation)
3. Game trò chuyện với nhiều đối tượng để hoàn thành nhiệm vụ
"""

import json
import sys
import os
from typing import Dict, Any, List
import random

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
    print("[Train AiESP] Warning: psycopg2 not installed", file=sys.stderr)

try:
    from dotenv import load_dotenv
except:
    pass

def get_db_connection():
    """Kết nối database"""
    if not HAS_PSYCOPG2:
        raise ImportError("psycopg2 required")
    
    env_file = os.path.join(os.path.dirname(__file__), '..', '.env')
    if not os.path.exists(env_file):
        env_file = os.path.join(os.path.dirname(__file__), '..', '.env.local')
    if not os.path.exists(env_file):
        env_file = os.path.join(os.path.dirname(__file__), '..', '.env.docker')
    
    try:
        if os.path.exists(env_file):
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


class LearnerGoalsTrainer:
    """
    Trainer cho 3 mục tiêu của learner
    """
    
    def __init__(self):
        self.practice_samples = self._generate_practice_samples()
        self.story_samples = self._generate_story_samples()
        self.game_samples = self._generate_game_samples()
    
    def _generate_practice_samples(self) -> List[Dict[str, Any]]:
        """Generate samples cho speaking practice"""
        samples = []
        
        practice_scenarios = [
            {
                'user': "I need to practice pronunciation.",
                'ai': "Great! Let's practice together. What word or phrase would you like to work on? I'll help you pronounce it correctly."
            },
            {
                'user': "Can you help me practice speaking English?",
                'ai': "Absolutely! I'm here to help you practice. Let's start with something simple. Tell me about your day, or we can practice specific topics. What would you like to focus on?"
            },
            {
                'user': "I want to improve my English speaking skills.",
                'ai': "That's wonderful! Practice makes perfect. Let's work on your speaking skills together. Would you like to practice conversations, pronunciation, or specific topics?"
            },
            {
                'user': "How can I practice speaking better?",
                'ai': "Great question! Here are some ways: 1) Practice daily conversations with me, 2) Read aloud to improve pronunciation, 3) Try speaking about topics you're interested in. What would you like to try first?"
            },
            {
                'user': "I'm nervous about speaking English.",
                'ai': "I understand that feeling. It's completely normal to feel nervous. The good news is that practice helps reduce that nervousness. Let's start with something easy and build your confidence. What topic are you comfortable talking about?"
            }
        ]
        
        for scenario in practice_scenarios:
            samples.append({
                'user_message': scenario['user'],
                'history': [],
                'expected_response': scenario['ai']
            })
        
        return samples
    
    def _generate_story_samples(self) -> List[Dict[str, Any]]:
        """Generate samples cho kể chuyện và lắng nghe"""
        samples = []
        
        story_scenarios = [
            {
                'user': "I want to tell you a story about my day.",
                'ai': "I'd love to hear your story! Please go ahead and share. I'm listening and ready to hear all about your day."
            },
            {
                'user': "Can I share something with you?",
                'ai': "Of course! I'm here to listen. Please share whatever you'd like to tell me. I'm all ears."
            },
            {
                'user': "I had an interesting experience today.",
                'ai': "That sounds interesting! I'd love to hear about it. Please tell me what happened. I'm listening."
            },
            {
                'user': "I need someone to listen to me.",
                'ai': "I'm here for you. I'm ready to listen to whatever you want to share. Take your time, and tell me what's on your mind."
            },
            {
                'user': "Let me tell you what happened yesterday.",
                'ai': "Please do! I'm listening. I'd love to hear about what happened yesterday. Go ahead and share your story."
            },
            {
                'user': "I'm feeling sad today.",
                'ai': "I'm sorry you're feeling sad. I'm here to listen. Would you like to tell me what's making you feel this way? Sometimes sharing helps."
            },
            {
                'user': "I had a great day!",
                'ai': "That's wonderful! I'm so happy to hear that. I'd love to hear all about it! What made your day so great?"
            }
        ]
        
        for scenario in story_scenarios:
            samples.append({
                'user_message': scenario['user'],
                'history': [],
                'expected_response': scenario['ai']
            })
        
        # Thêm follow-up responses
        follow_ups = [
            {
                'user': "What do you think about that?",
                'history': [{'text_content': 'I had a great day!', 'ai_response': "That's wonderful! I'm so happy to hear that."}],
                'ai': "That sounds amazing! I'm really happy for you. It's great when we have days like that. What was the best part?"
            },
            {
                'user': "Do you understand?",
                'history': [{'text_content': 'I had an interesting experience today.', 'ai_response': "That sounds interesting! I'd love to hear about it."}],
                'ai': "Yes, I understand. Thank you for sharing that with me. It sounds like it was quite an experience. How did it make you feel?"
            }
        ]
        
        for follow_up in follow_ups:
            samples.append({
                'user_message': follow_up['user'],
                'history': follow_up['history'],
                'expected_response': follow_up['ai']
            })
        
        return samples
    
    def _generate_game_samples(self) -> List[Dict[str, Any]]:
        """Generate samples cho game trò chuyện với nhiều đối tượng"""
        samples = []
        
        # Game scenarios với nhiều NPCs (Non-Player Characters)
        game_scenarios = [
            {
                'user': "I need to find the key to open the door.",
                'ai': "You're looking for a key? Let me help you. Have you talked to the shopkeeper? They might know where the key is. Or maybe check with the librarian - they often have information about important items."
            },
            {
                'user': "How do I complete this quest?",
                'ai': "To complete this quest, you'll need to talk to several people. First, visit the village elder to get information. Then, speak with the merchant to get supplies. Finally, talk to the guard to get permission. Each person has a piece of the puzzle!"
            },
            {
                'user': "I need to talk to someone to finish my mission.",
                'ai': "Great! There are several people who can help you. The teacher at the school might have information. The doctor at the clinic could provide supplies. And the mayor at the town hall might give you the final approval. Who would you like to talk to first?"
            },
            {
                'user': "What should I do next in this game?",
                'ai': "To progress, you need to interact with different characters. Try talking to: 1) The farmer for food items, 2) The blacksmith for tools, 3) The scholar for knowledge. Each conversation will help you get closer to completing your goal!"
            },
            {
                'user': "I'm stuck. Who can help me?",
                'ai': "Don't worry! There are many people who can help you. Try talking to: the guide at the entrance, the helper at the market, or the advisor at the castle. Each person has different information and can guide you in different ways. Who would you like to approach?"
            },
            {
                'user': "I need to collect items for my quest.",
                'ai': "To collect items, you'll need to talk to different people. The collector has rare items, the trader has common supplies, and the artisan can create special items. Start by talking to the collector - they usually know where everything is!"
            },
            {
                'user': "How do I talk to the characters in this game?",
                'ai': "Great question! To talk to characters, just approach them and start a conversation. Each character has unique information and can help you in different ways. Try talking to: the friendly merchant, the wise teacher, or the helpful guide. They all have something valuable to share!"
            },
            {
                'user': "I completed talking to one person, what's next?",
                'ai': "Good progress! Now you need to talk to more people to complete your mission. Based on what you learned, try talking to: the next person in the chain, or someone who can help with the next step. Each conversation brings you closer to your goal!"
            }
        ]
        
        for scenario in game_scenarios:
            samples.append({
                'user_message': scenario['user'],
                'history': [],
                'expected_response': scenario['ai']
            })
        
        # Multi-turn game conversations
        game_conversations = [
            {
                'user': "I talked to the shopkeeper, they said to talk to the librarian.",
                'history': [{'text_content': 'I need to find the key to open the door.', 'ai_response': "You're looking for a key? Let me help you. Have you talked to the shopkeeper?"}],
                'ai': "Perfect! The shopkeeper gave you a good lead. Now go talk to the librarian. They should have information about the key. When you talk to them, ask about the 'ancient key' or 'door key'. They'll help you find it!"
            },
            {
                'user': "The librarian said I need permission from the mayor.",
                'history': [
                    {'text_content': 'I need to find the key to open the door.', 'ai_response': "You're looking for a key? Let me help you."},
                    {'text_content': 'I talked to the shopkeeper, they said to talk to the librarian.', 'ai_response': "Perfect! The shopkeeper gave you a good lead."}
                ],
                'ai': "Excellent progress! You're getting closer. Now you need to talk to the mayor to get permission. Go to the town hall and speak with the mayor. Explain that you need the key and that the librarian sent you. They should help you complete your quest!"
            }
        ]
        
        for conv in game_conversations:
            samples.append({
                'user_message': conv['user'],
                'history': conv['history'],
                'expected_response': conv['ai']
            })
        
        return samples
    
    def save_samples_to_database(self, task_type: str, samples: List[Dict[str, Any]]):
        """Lưu samples vào database"""
        if not HAS_PSYCOPG2:
            print(f"[Train AiESP] Cannot save to database: psycopg2 not available", file=sys.stderr)
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
                    
                    if cursor.rowcount > 0:
                        saved_count += 1
                    else:
                        skipped_count += 1
                    
                except Exception as e:
                    conn.rollback()
                    skipped_count += 1
                    continue
            
            conn.commit()
            print(f"[Train AiESP] Saved {saved_count} samples for {task_type}, skipped {skipped_count} duplicates", file=sys.stderr)
            
        except Exception as e:
            conn.rollback()
            print(f"[Train AiESP] Error saving samples: {e}", file=sys.stderr)
        finally:
            conn.close()
    
    def train_all_goals(self):
        """Train cho cả 3 mục tiêu"""
        print("[Train AiESP] Starting training for 3 learner goals...", file=sys.stderr)
        
        # 1. Practice (speaking_practice)
        print("[Train AiESP] Training for: Speaking Practice", file=sys.stderr)
        self.save_samples_to_database('speaking_practice', self.practice_samples)
        
        # 2. Story/Conversation (conversation_ai)
        print("[Train AiESP] Training for: Story/Conversation", file=sys.stderr)
        self.save_samples_to_database('conversation_ai', self.story_samples)
        
        # 3. Game Conversation (game_conversation - new task type)
        print("[Train AiESP] Training for: Game Conversation", file=sys.stderr)
        self.save_samples_to_database('game_conversation', self.game_samples)
        
        print("[Train AiESP] ✅ Training samples generated for all 3 goals", file=sys.stderr)


def main():
    """Main function"""
    trainer = LearnerGoalsTrainer()
    trainer.train_all_goals()
    
    print(json.dumps({
        'status': 'success',
        'practice_samples': len(trainer.practice_samples),
        'story_samples': len(trainer.story_samples),
        'game_samples': len(trainer.game_samples),
        'message': 'Training samples generated for all 3 learner goals'
    }, ensure_ascii=False))


if __name__ == '__main__':
    main()

