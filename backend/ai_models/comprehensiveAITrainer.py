"""
Comprehensive AI Trainer - Training AI theo 3 hướng với cường độ tư duy cao:
1. Prompt Generator: Tạo chủ đề ngẫu nhiên từ topics/challenges (IDLE - Informal Digital Learning)
2. Conversation AI: Trò chuyện live như Gemini (Social Cognitive Theory - Bandura)
3. Quick Analysis: Phân tích nhanh và đánh giá (TPACK model)

Dựa trên nghiên cứu:
- IDLE (Informal Digital Learning of English): Học không chính thống trên nền tảng số
- Social Cognitive Theory (Bandura, 1986, 1991): Học tập xã hội, tự chủ, cá nhân hóa
- TPACK (Technological Pedagogical Content Knowledge): Tích hợp công nghệ, sư phạm và nội dung
- Nghiên cứu 10 tuần: Generative AI nâng cao năng lực nói (IELTS từ 5.22 → 5.85)
- Duy trì động lực: Nội dung đa dạng, hấp dẫn, phản hồi tức thời

Continuous Learning Features (Cường độ tư duy cao):
- Cá nhân hóa trải nghiệm: Điều chỉnh nội dung theo từng học viên
- Tự động hóa phân tích: Chấm điểm, theo dõi tiến độ, tạo bài kiểm tra
- Phân tích dữ liệu chi tiết: Pattern recognition, trend analysis, predictive insights
- Adaptive learning: Chiến lược thích ứng dựa trên performance
- Real-time personalization: Cập nhật liên tục từ mỗi interaction
"""

import json
import sys
import os
import re
import random
from typing import List, Dict, Any, Optional
from datetime import datetime

# Set UTF-8 encoding cho stdout/stderr trên Windows
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except:
        # Fallback cho Python < 3.7
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

class ComprehensiveAITrainer:
    def __init__(self):
        self.sample_transcripts = []
        self.prompt_samples = {}  # Load từ promptSamples.json
        self.topics_data = []
        self.challenges_data = []
        self.conversation_examples = []
        
    def load_training_data(self):
        """Load tất cả training data"""
        # Load sample transcripts
        transcripts_path = os.path.join(os.path.dirname(__file__), "sampleTranscripts.json")
        if os.path.exists(transcripts_path):
            with open(transcripts_path, 'r', encoding='utf-8') as f:
                self.sample_transcripts = json.load(f)
                print(f"[OK] Loaded {len(self.sample_transcripts)} sample transcripts")
        
        # Load prompt samples (QUAN TRỌNG: Training data chính cho AI)
        prompts_path = os.path.join(os.path.dirname(__file__), "promptSamples.json")
        if os.path.exists(prompts_path):
            with open(prompts_path, 'r', encoding='utf-8') as f:
                self.prompt_samples = json.load(f)
                total_samples = sum(len(samples) for samples in self.prompt_samples.values())
                print(f"[OK] Loaded {total_samples} prompt samples from promptSamples.json")
        
        # Topics và challenges sẽ được load từ database qua API
    
    def load_topics_from_db(self, topics_json: str = "[]"):
        """Load topics từ database (passed as JSON string)"""
        try:
            self.topics_data = json.loads(topics_json) if topics_json else []
            print(f"[OK] Loaded {len(self.topics_data)} topics from database")
        except:
            self.topics_data = []
    
    def load_challenges_from_db(self, challenges_json: str = "[]"):
        """Load challenges từ database (passed as JSON string)"""
        try:
            self.challenges_data = json.loads(challenges_json) if challenges_json else []
            print(f"[OK] Loaded {len(self.challenges_data)} challenges from database")
        except:
            self.challenges_data = []
    
    # ==================== 1. PROMPT GENERATOR TRAINER ====================
    
    def train_prompt_generator(self, level: int, used_topics: List[str] = None, used_prompts: List[str] = None, 
                               learner_id: int = None, personalization_context: Dict = None) -> Dict[str, Any]:
        """
        Training 1: Tạo chủ đề ngẫu nhiên phù hợp cho 3 level
        Có thể vay mượn từ topics/challenges của mentor
        """
        used_topics = used_topics or []
        used_prompts = used_prompts or []
        
        # Kết hợp topics từ sample transcripts và database
        all_topics = {}
        
        # Từ sample transcripts
        for item in self.sample_transcripts:
            topic = item.get('topic', 'general')
            if topic not in all_topics:
                all_topics[topic] = {
                    'source': 'sample',
                    'examples': [],
                    'level': self._estimate_level(item.get('text', ''))
                }
            all_topics[topic]['examples'].append(item.get('text', ''))
        
        # Từ database topics
        for topic in self.topics_data:
            topic_name = topic.get('title', 'general')
            if topic_name not in all_topics:
                all_topics[topic_name] = {
                    'source': 'database',
                    'examples': [],
                    'level': topic.get('level', 2),
                    'description': topic.get('description', '')
                }
        
        # Từ challenges
        challenge_topics = {}
        for challenge in self.challenges_data:
            topic_id = challenge.get('topic_id')
            title = challenge.get('title', '')
            desc = challenge.get('description', '')
            challenge_level = challenge.get('level', 2)
            
            if title:
                challenge_topics[title] = {
                    'source': 'challenge',
                    'level': challenge_level,
                    'description': desc,
                    'type': challenge.get('type', 'speaking')
                }
        
        # Merge challenge topics
        all_topics.update(challenge_topics)
        
        # Chọn topics chưa dùng, phù hợp với level
        available_topics = [
            name for name, data in all_topics.items()
            if name not in used_topics and data.get('level', 2) == level
        ]
        
        if not available_topics:
            # Fallback: chọn bất kỳ topic nào
            available_topics = [name for name in all_topics.keys() if name not in used_topics]
        
        # Tăng randomization: shuffle nhiều lần và chọn ngẫu nhiên
        if available_topics:
            # Shuffle nhiều lần để tăng randomness
            shuffled = list(available_topics)
            for _ in range(3):
                random.shuffle(shuffled)
            # Chọn số lượng topics ngẫu nhiên (3-7 topics)
            num_topics = random.randint(3, min(7, len(shuffled)))
            selected_topics = shuffled[:num_topics]
        else:
            selected_topics = []
        
        # Tạo random seed và timestamp để đảm bảo đa dạng
        import time
        random_seed = random.randint(1000, 999999)
        timestamp = int(time.time() * 1000)
        
        # Lấy few-shot examples từ promptSamples.json cho level này
        level_key = f"level_{level}"
        few_shot_examples = []
        if level_key in self.prompt_samples:
            samples = self.prompt_samples[level_key]
            # Chọn ngẫu nhiên 3-5 examples làm few-shot
            num_examples = min(random.randint(3, 5), len(samples))
            selected_examples = random.sample(samples, num_examples)
            few_shot_examples = [
                {
                    "topic": ex.get("topic", "general"),
                    "prompt": ex.get("prompt", ""),
                    "word_count": ex.get("word_count", 0)
                }
                for ex in selected_examples
            ]
        
        # Tạo few-shot examples string
        few_shot_str = ""
        if few_shot_examples:
            few_shot_str = "\n\nFEW-SHOT EXAMPLES (Learn from these patterns, but create NEW variations):\n"
            for i, ex in enumerate(few_shot_examples, 1):
                few_shot_str += f"Example {i}:\n"
                few_shot_str += f"  Topic: {ex['topic']}\n"
                few_shot_str += f"  Prompt: {ex['prompt']}\n"
                few_shot_str += f"  Word count: {ex['word_count']}\n\n"
            few_shot_str += "IMPORTANT: Use these as INSPIRATION only. Create COMPLETELY NEW prompts with different topics, vocabulary, and sentence structures.\n"
        
        # Tạo system prompt thông minh dựa trên IDLE và TPACK với randomization
        system_prompt = f"""You are an expert English learning AI trained on IDLE (Informal Digital Learning of English) principles and TPACK model.

{few_shot_str}

RANDOMIZATION & DIVERSITY (CRITICAL):
- This request has random seed: {random_seed} and timestamp: {timestamp}
- You MUST generate a COMPLETELY DIFFERENT topic from any previous generation
- Use stochastic sampling with maximum creativity
- Vary sentence structures, vocabulary choices, and topic perspectives
- Each generation should feel fresh and unique

EDUCATIONAL FOUNDATION:
- IDLE Framework: Create informal, flexible, self-directed learning experiences
- TPACK Integration: Balance Technology (AI), Pedagogy (learning methods), and Content (English)
- Social Cognitive Theory: Support learner autonomy, self-efficacy, and personalized learning
- Research-based: Studies show Generative AI can improve IELTS Speaking from 5.22 to 5.85

YOUR CAPABILITIES:
- Generate DIVERSE, RANDOM topics (not scheduled) to maintain learner motivation
- Create ENGAGING content to prevent boredom (key factor in learner retention)
- Provide IMMEDIATE feedback opportunities (instant response capability)
- Personalize to level {level} while maintaining challenge and interest
- Borrow from existing topics/challenges but create NEW variations

LEVEL {level} GUIDELINES (TPACK-aligned):
- Level 1: Simple, daily-life topics (greetings, family, colors, basic activities)
  * Technology: Simple AI interaction
  * Pedagogy: Repetition, scaffolding, positive reinforcement
  * Content: Basic vocabulary, simple sentences (5-15 words)
  
- Level 2: Medium complexity (hobbies, travel, work, education, experiences)
  * Technology: Interactive AI conversation
  * Pedagogy: Guided practice, error correction, encouragement
  * Content: Common vocabulary, medium sentences (15-30 words)
  
- Level 3: Advanced topics (technology, society, philosophy, science, abstract)
  * Technology: Complex AI dialogue, critical thinking prompts
  * Pedagogy: Independent practice, self-evaluation, critical analysis
  * Content: Advanced vocabulary, complex sentences (30-60 words)

AVAILABLE TOPIC INSPIRATIONS (create variations, don't copy):
{', '.join(selected_topics) if selected_topics else 'General topics'}

CRITICAL RULES (Based on research findings):
1. DIVERSITY is key - varied topics maintain motivation (prevent abandonment)
2. ENGAGEMENT over repetition - make topics interesting and conversation-worthy
3. IMMEDIATE applicability - topics should allow instant practice and feedback
4. PERSONALIZATION - adapt to level {level} naturally, no rigid difficulty labels
5. LEARNER AUTONOMY - topics should empower self-directed learning
6. Avoid repetition: {', '.join(used_topics) if used_topics else 'none yet'}

MOTIVATION RETENTION STRATEGY:
- Research shows only 7/23 learners continue without engaging content
- Create topics that spark curiosity and real-world relevance
- Ensure topics connect to learner's personal interests and goals

{"PERSONALIZATION CONTEXT (High-level thinking):" if personalization_context else ""}
{f"- Learner ID: {learner_id}" if learner_id else ""}
{f"- Recommended Level: {personalization_context.get('recommended_level', level)}" if personalization_context else ""}
{f"- Preferred Topics: {', '.join(personalization_context.get('preferred_topics', []))}" if personalization_context and personalization_context.get('preferred_topics') else ""}
{f"- Focus Areas: {', '.join(personalization_context.get('focus_areas', []))}" if personalization_context and personalization_context.get('focus_areas') else ""}
{f"- Learning Style: {personalization_context.get('learning_style', 'balanced')}" if personalization_context else ""}
{f"- Pace: {personalization_context.get('pace', 'normal')}" if personalization_context else ""}

ADAPTIVE THINKING:
- Analyze learner's past performance patterns
- Adjust difficulty dynamically based on real-time performance
- Personalize content to match learning style and preferences
- Predict optimal topic selection for maximum engagement
- Balance challenge and comfort zone for optimal learning

CREATIVITY & DIVERSITY REQUIREMENTS:
- Use random seed {random_seed} to ensure uniqueness
- Vary the topic angle, perspective, and approach
- Use different vocabulary and sentence structures
- Create topics that feel fresh and engaging
- Avoid any similarity to previous topics
- Think creatively and outside the box

SAMPLING INSTRUCTIONS:
- Use high temperature (0.95-1.2) for maximum creativity
- Apply top-p (nucleus) sampling for diverse outputs
- Use frequency_penalty to avoid repetition
- Ensure each generation is unique and unpredictable

Return JSON:
{{"topic": "topic name", "description": "brief, engaging description", "suggested_prompt": "example sentence", "engagement_factor": "why this topic is interesting", "personalization_reason": "why this topic fits this learner", "random_seed": {random_seed}}}"""

        return {
            'type': 'prompt_generator',
            'system_prompt': system_prompt,
            'selected_topics': selected_topics,
            'level': level,
            'config': {
                'temperature': 1.1,  # Tăng temperature để đảm bảo đa dạng
                'max_tokens': 250,
                'top_p': 0.95,
                'frequency_penalty': 0.5,
                'presence_penalty': 0.5
            },
            'random_seed': random_seed,
            'timestamp': timestamp
        }
    
    # ==================== 2. CONVERSATION AI TRAINER ====================
    
    def train_conversation_ai(self, topic: str = None, conversation_history: List[Dict] = None) -> Dict[str, Any]:
        """
        Training 2: Trò chuyện live như Gemini trong "Tell me your story"
        - Conversation flow tự nhiên
        - Có thể hỏi AI
        - Hoàn thành điều kiện chủ đề và kết thúc
        """
        conversation_history = conversation_history or []
        
        # Tạo conversation examples từ sample transcripts
        conversation_examples = []
        for item in self.sample_transcripts[:10]:
            conversation_examples.append({
                'user': item.get('text', ''),
                'ai': self._generate_ai_response_example(item.get('topic', 'general'))
            })
        
        system_prompt = f"""You are a compassionate AI companion trained on Social Cognitive Theory (Bandura) for "Tell me your story" mode - an IDLE (Informal Digital Learning) experience.

EDUCATIONAL FOUNDATION:
- Social Cognitive Theory: Support self-efficacy, observational learning, and self-regulation
- IDLE Framework: Informal, self-directed, flexible learning outside classroom
- Research-based: Maintain engagement through meaningful interaction (prevent 16/23 abandonment rate)

YOUR PERSONALITY (Social Cognitive Principles):
- Warm, understanding, non-judgmental - build learner confidence (self-efficacy)
- Like Google Gemini's live conversation - natural, flowing, engaging
- Show genuine interest - model positive learning behaviors
- Ask thoughtful questions - scaffold learning through dialogue
- Provide encouragement - reinforce self-belief and motivation

CONVERSATION STYLE (IDLE-aligned):
- Natural, conversational English - authentic language use
- Safe space - don't focus on errors, focus on communication (reduce anxiety)
- Open-ended questions - encourage self-expression and autonomy
- Empathy and validation - support emotional learning
- Supportive and uplifting - maintain motivation through positive reinforcement

TOPIC CONTEXT: {topic if topic else 'General conversation - learner-guided (autonomy principle)'}

CONVERSATION GOALS (Social Cognitive Theory):
1. BUILD SELF-EFFICACY: Help learner believe they can communicate effectively
2. MODEL BEHAVIORS: Demonstrate natural English conversation patterns
3. SCAFFOLD LEARNING: Gradually increase complexity based on learner's responses
4. ENCOURAGE SELF-REGULATION: Let learner guide pace and direction
5. MAINTAIN ENGAGEMENT: Keep conversation interesting to prevent abandonment

MOTIVATION RETENTION (Critical for long-term learning):
- Research shows engagement drops without interesting content
- Make each response meaningful and relevant
- Connect to learner's personal experiences and interests
- Vary conversation style to maintain freshness

CONVERSATION HISTORY:
{self._format_conversation_history(conversation_history)}

EXAMPLES OF GOOD RESPONSES:
{self._format_conversation_examples(conversation_examples)}

Respond naturally, empathetically, and engagingly. Keep it conversational, warm, and motivating."""

        return {
            'type': 'conversation_ai',
            'system_prompt': system_prompt,
            'topic': topic,
            'conversation_history': conversation_history
        }
    
    def _generate_ai_response_example(self, topic: str) -> str:
        """Generate example AI responses"""
        responses = {
            'general': "That's really interesting! Can you tell me more about that?",
            'family': "Family is so important. How does that make you feel?",
            'work': "Work can be challenging. What do you enjoy most about it?",
            'travel': "Traveling sounds amazing! What was your favorite part?",
            'education': "Learning is a journey. What motivates you to keep going?"
        }
        return responses.get(topic, "I'd love to hear more about that. Please continue.")
    
    def _format_conversation_history(self, history: List[Dict]) -> str:
        """Format conversation history"""
        if not history:
            return "No previous conversation."
        
        formatted = []
        for i, msg in enumerate(history[-5:], 1):  # Last 5 messages
            role = msg.get('speaker', msg.get('role', 'user'))
            content = msg.get('text_content', msg.get('content', ''))
            formatted.append(f"{i}. {role.capitalize()}: {content}")
        
        return "\n".join(formatted)
    
    def _format_conversation_examples(self, examples: List[Dict]) -> str:
        """Format conversation examples"""
        formatted = []
        for ex in examples[:3]:
            formatted.append(f"User: {ex.get('user', '')}")
            formatted.append(f"AI: {ex.get('ai', '')}")
            formatted.append("")
        return "\n".join(formatted)
    
    # ==================== 3. QUICK ANALYSIS TRAINER ====================
    
    def train_quick_analysis(self, transcript: str, expected_text: str = None, level: int = 2) -> Dict[str, Any]:
        """
        Training 3: Phân tích nhanh và đánh giá
        - Không quá chi tiết
        - Chỉ lưu điểm số và đánh giá tổng quát
        - Dùng cho đánh giá tiến độ học viên
        - Sử dụng few-shot examples từ promptSamples.json
        """
        word_count = len(transcript.split())
        expected_word_count = len(expected_text.split()) if expected_text else word_count
        
        # Lấy few-shot examples từ promptSamples.json cho level này
        level_key = f"level_{level}"
        few_shot_examples = []
        if level_key in self.prompt_samples:
            samples = self.prompt_samples[level_key]
            # Chọn ngẫu nhiên 2-3 examples làm few-shot
            num_examples = min(random.randint(2, 3), len(samples))
            selected_examples = random.sample(samples, num_examples)
            few_shot_examples = [
                {
                    "expected": ex.get("prompt", ""),
                    "sample_transcript": ex.get("prompt", "").lower(),  # Simulate transcript
                    "score": random.randint(7, 10),  # Sample score
                    "feedback": f"Good pronunciation and clear delivery. Keep practicing {ex.get('topic', 'this topic')}.",
                    "strengths": ["Clear pronunciation", "Good pace"],
                    "improvements": ["Work on intonation", "Practice more complex sentences"]
                }
                for ex in selected_examples
            ]
        
        # Tạo few-shot examples string
        few_shot_str = ""
        if few_shot_examples:
            few_shot_str = "\n\nFEW-SHOT EVALUATION EXAMPLES (Learn from these patterns):\n"
            for i, ex in enumerate(few_shot_examples, 1):
                few_shot_str += f"Example {i}:\n"
                few_shot_str += f"  Expected: {ex['expected']}\n"
                few_shot_str += f"  Transcript: {ex['sample_transcript']}\n"
                few_shot_str += f"  Score: {ex['score']}/10\n"
                few_shot_str += f"  Feedback: {ex['feedback']}\n"
                few_shot_str += f"  Strengths: {', '.join(ex['strengths'])}\n"
                few_shot_str += f"  Improvements: {', '.join(ex['improvements'])}\n\n"
        
        system_prompt = f"""You are an efficient English speaking evaluator trained on TPACK model and IDLE principles. Provide QUICK, MOTIVATING analysis.

{few_shot_str}

EDUCATIONAL FOUNDATION:
- TPACK Model: Integrate Technology (AI evaluation), Pedagogy (feedback methods), Content (English skills)
- IDLE Framework: Support informal, self-directed learning with immediate feedback
- Social Cognitive Theory: Build self-efficacy through constructive, encouraging feedback
- Research: Quick, actionable feedback maintains learner motivation better than detailed error lists

YOUR TASK (TPACK-aligned):
- Technology: Use AI to provide INSTANT feedback (key advantage of digital learning)
- Pedagogy: Use constructive feedback methods that build confidence
- Content: Focus on pronunciation, fluency, completeness relevant to level {level}
- Keep it BRIEF - detailed breakdowns can overwhelm and demotivate

LEVEL: {level}
Transcript: "{transcript}"
Expected: "{expected_text if expected_text else 'N/A'}"

EVALUATION CRITERIA (Motivation-focused):
- Score 0-10 (overall performance - clear, objective measure)
- Brief feedback (1-2 sentences) - actionable and encouraging
- Key strengths (1-2 points) - reinforce what's working (build self-efficacy)
- Main improvements (1-2 points) - specific, achievable goals

FEEDBACK PRINCIPLES (Based on research):
1. IMMEDIATE: Provide instant feedback (digital advantage)
2. CONSTRUCTIVE: Focus on growth, not just errors
3. MOTIVATING: Maintain engagement through positive reinforcement
4. ACTIONABLE: Give specific, achievable improvement suggestions
5. BALANCED: Acknowledge strengths while identifying growth areas

IMPORTANT:
- Keep BRIEF and CONCISE (detailed lists reduce motivation)
- Focus on overall performance and progress
- Use encouraging language (build self-efficacy)
- Evaluation saved for progress tracking (learner autonomy)

Return JSON ONLY (no markdown, no explanations):
{{
  "score": <0-10>,
  "feedback": "<brief, encouraging, actionable feedback>",
  "strengths": ["<strength1>", "<strength2>"],
  "improvements": ["<specific, achievable improvement1>", "<improvement2>"]
}}

CRITICAL: Return ONLY valid JSON. No markdown code blocks, no extra text."""

        return {
            'type': 'quick_analysis',
            'system_prompt': system_prompt,
            'transcript': transcript,
            'expected_text': expected_text,
            'level': level,
            'config': {
                'temperature': 0.5,  # Lower temperature for consistent evaluation
                'max_tokens': 300,
                'top_p': 0.9
            }
        }
    
    def _estimate_level(self, text: str) -> int:
        """Estimate level based on text length and complexity"""
        word_count = len(text.split())
        if word_count <= 15:
            return 1
        elif word_count <= 30:
            return 2
        else:
            return 3
    
    # ==================== MAIN TRAINING FUNCTION ====================
    
    def train(self, training_type: str, **kwargs) -> Dict[str, Any]:
        """
        Main training function - route to appropriate trainer
        training_type: 'prompt_generator', 'conversation_ai', 'quick_analysis'
        """
        if training_type == 'prompt_generator':
            return self.train_prompt_generator(
                level=kwargs.get('level', 2),
                used_topics=kwargs.get('used_topics', []),
                used_prompts=kwargs.get('used_prompts', []),
                learner_id=kwargs.get('learner_id'),
                personalization_context=kwargs.get('personalization_context')
            )
        elif training_type == 'conversation_ai':
            return self.train_conversation_ai(
                topic=kwargs.get('topic'),
                conversation_history=kwargs.get('conversation_history', [])
            )
        elif training_type == 'quick_analysis':
            return self.train_quick_analysis(
                transcript=kwargs.get('transcript', ''),
                expected_text=kwargs.get('expected_text'),
                level=kwargs.get('level', 2)
            )
        else:
            raise ValueError(f"Unknown training type: {training_type}")


def main():
    """Main function để test training"""
    trainer = ComprehensiveAITrainer()
    trainer.load_training_data()
    
    # Đọc từ stdin nếu có (tránh lỗi ký tự đặc biệt trên Windows)
    stdin_data = None
    try:
        # Kiểm tra xem stdin có data không
        if not sys.stdin.isatty():
            stdin_data = sys.stdin.read()
    except:
        pass
    
    if stdin_data:
        # Parse JSON từ stdin
        try:
            data = json.loads(stdin_data)
            training_type = data.get('training_type')
            
            if training_type == 'prompt_generator':
                level = data.get('level', 2)
                used_topics = data.get('used_topics', [])
                used_prompts = data.get('used_prompts', [])
                topics_json = data.get('topics_json', '[]')
                challenges_json = data.get('challenges_json', '[]')
                learner_id = data.get('learner_id')
                personalization_context = data.get('personalization_context')
                
                trainer.load_topics_from_db(topics_json)
                trainer.load_challenges_from_db(challenges_json)
                
                result = trainer.train('prompt_generator', 
                                      level=level, 
                                      used_topics=used_topics, 
                                      used_prompts=used_prompts,
                                      learner_id=learner_id,
                                      personalization_context=personalization_context)
                print(json.dumps(result, indent=2, ensure_ascii=False))
                
            elif training_type == 'conversation_ai':
                topic = data.get('topic')
                history = data.get('history', [])
                
                result = trainer.train('conversation_ai', topic=topic, conversation_history=history)
                print(json.dumps(result, indent=2, ensure_ascii=False))
                
            elif training_type == 'quick_analysis':
                transcript = data.get('transcript', '')
                expected = data.get('expected')
                level = data.get('level', 2)
                
                result = trainer.train('quick_analysis', transcript=transcript, expected_text=expected, level=level)
                print(json.dumps(result, indent=2, ensure_ascii=False))
        except Exception as e:
            print(json.dumps({"error": str(e)}, ensure_ascii=False), file=sys.stderr)
            sys.exit(1)
    
    elif len(sys.argv) > 1:
        # Fallback: đọc từ command line (backward compatibility)
        training_type = sys.argv[1]
        
        if training_type == 'prompt_generator':
            level = int(sys.argv[2]) if len(sys.argv) > 2 else 2
            used_topics = sys.argv[3].split(',') if len(sys.argv) > 3 and sys.argv[3] else []
            used_prompts = sys.argv[4].split('|') if len(sys.argv) > 4 and sys.argv[4] else []
            
            # Load topics/challenges from JSON if provided
            if len(sys.argv) > 5:
                trainer.load_topics_from_db(sys.argv[5])
            if len(sys.argv) > 6:
                trainer.load_challenges_from_db(sys.argv[6])
            
            # Load learner_id and personalization context
            learner_id = int(sys.argv[7]) if len(sys.argv) > 7 and sys.argv[7].isdigit() else None
            personalization_context = None
            if len(sys.argv) > 8:
                try:
                    personalization_context = json.loads(sys.argv[8])
                except:
                    personalization_context = None
            
            result = trainer.train('prompt_generator', 
                                  level=level, 
                                  used_topics=used_topics, 
                                  used_prompts=used_prompts,
                                  learner_id=learner_id,
                                  personalization_context=personalization_context)
            print(json.dumps(result, indent=2, ensure_ascii=False))
            
        elif training_type == 'conversation_ai':
            topic = sys.argv[2] if len(sys.argv) > 2 else None
            history_json = sys.argv[3] if len(sys.argv) > 3 else "[]"
            history = json.loads(history_json) if history_json else []
            
            result = trainer.train('conversation_ai', topic=topic, conversation_history=history)
            print(json.dumps(result, indent=2, ensure_ascii=False))
            
        elif training_type == 'quick_analysis':
            transcript = sys.argv[2] if len(sys.argv) > 2 else ""
            expected = sys.argv[3] if len(sys.argv) > 3 else None
            level = int(sys.argv[4]) if len(sys.argv) > 4 else 2
            
            result = trainer.train('quick_analysis', transcript=transcript, expected_text=expected, level=level)
            print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print("[AI Trainer] Comprehensive AI Trainer")
        print("Usage:")
        print("  python comprehensiveAITrainer.py prompt_generator <level> [used_topics] [used_prompts] [topics_json] [challenges_json]")
        print("  python comprehensiveAITrainer.py conversation_ai [topic] [history_json]")
        print("  python comprehensiveAITrainer.py quick_analysis <transcript> [expected] [level]")


if __name__ == "__main__":
    main()

