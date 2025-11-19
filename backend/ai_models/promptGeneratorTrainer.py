"""
AI Prompt Generator Trainer
Training AI để tự động tạo prompts đa dạng cho speaking practice
Sử dụng sample transcripts và scenarios làm training data
"""

import json
import sys
import os
import re
from typing import List, Dict, Any, Optional
from collections import Counter
import random

# Thêm path để import các module khác nếu cần
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

class PromptGeneratorTrainer:
    def __init__(self):
        self.sample_transcripts = []
        self.scenarios = []
        self.topic_patterns = {}
        self.level_patterns = {1: [], 2: [], 3: []}
        
    def load_training_data(self):
        """Load training data từ các nguồn"""
        # Load sample transcripts
        transcripts_path = os.path.join(os.path.dirname(__file__), "sampleTranscripts.json")
        if os.path.exists(transcripts_path):
            with open(transcripts_path, 'r', encoding='utf-8') as f:
                self.sample_transcripts = json.load(f)
                print(f"✅ Loaded {len(self.sample_transcripts)} sample transcripts")
        
        # Load scenarios từ database hoặc file (nếu có)
        # Có thể query từ database sau
        
    def analyze_patterns(self):
        """Phân tích patterns từ training data"""
        # Phân tích theo topic
        topic_groups = {}
        for item in self.sample_transcripts:
            topic = item.get('topic', 'general')
            text = item.get('text', '')
            word_count = len(text.split())
            
            if topic not in topic_groups:
                topic_groups[topic] = {
                    'examples': [],
                    'word_counts': [],
                    'vocabulary': set(),
                    'structures': []
                }
            
            topic_groups[topic]['examples'].append(text)
            topic_groups[topic]['word_counts'].append(word_count)
            
            # Extract vocabulary
            words = re.findall(r'\b\w+\b', text.lower())
            topic_groups[topic]['vocabulary'].update(words)
            
            # Extract sentence structures (simple patterns)
            if word_count <= 15:
                self.level_patterns[1].append(text)
            elif word_count <= 30:
                self.level_patterns[2].append(text)
            else:
                self.level_patterns[3].append(text)
        
        self.topic_patterns = topic_groups
        print(f"✅ Analyzed {len(topic_groups)} topics")
        
    def generate_training_prompt(self, level: int, used_topics: List[str] = None, used_prompts: List[str] = None) -> Dict[str, Any]:
        """
        Tạo training prompt thông minh cho AI
        Trả về system prompt và examples để AI tự học
        """
        used_topics = used_topics or []
        used_prompts = used_prompts or []
        
        # Chọn topics chưa dùng
        available_topics = [t for t in self.topic_patterns.keys() if t not in used_topics]
        if not available_topics:
            available_topics = list(self.topic_patterns.keys())
        
        selected_topics = random.sample(available_topics, min(5, len(available_topics)))
        
        # Lấy examples từ level tương ứng
        level_examples = self.level_patterns.get(level, [])
        if not level_examples:
            # Fallback to all examples
            level_examples = [item['text'] for item in self.sample_transcripts]
        
        # Chọn diverse examples
        diverse_examples = self._select_diverse_examples(level_examples, selected_topics, used_prompts)
        
        # Extract vocabulary patterns
        vocab_patterns = self._extract_vocab_patterns(selected_topics)
        
        # Tạo system prompt
        system_prompt = self._create_system_prompt(level, selected_topics, vocab_patterns)
        
        # Tạo few-shot examples
        few_shot_examples = self._create_few_shot_examples(diverse_examples, selected_topics)
        
        return {
            'system_prompt': system_prompt,
            'few_shot_examples': few_shot_examples,
            'selected_topics': selected_topics,
            'vocab_patterns': vocab_patterns,
            'level': level
        }
    
    def _select_diverse_examples(self, examples: List[str], topics: List[str], used_prompts: List[str]) -> List[str]:
        """Chọn examples đa dạng, tránh lặp lại"""
        # Filter out used prompts
        filtered = [e for e in examples if e not in used_prompts]
        
        # Chọn examples từ các topics khác nhau
        selected = []
        topic_examples = {}
        
        for item in self.sample_transcripts:
            topic = item.get('topic', 'general')
            text = item.get('text', '')
            if topic in topics and text in filtered:
                if topic not in topic_examples:
                    topic_examples[topic] = []
                topic_examples[topic].append(text)
        
        # Lấy 1-2 examples từ mỗi topic
        for topic in topics:
            if topic in topic_examples:
                selected.extend(random.sample(topic_examples[topic], min(2, len(topic_examples[topic]))))
        
        # Nếu chưa đủ, thêm random
        if len(selected) < 8:
            remaining = [e for e in filtered if e not in selected]
            selected.extend(random.sample(remaining, min(8 - len(selected), len(remaining))))
        
        return selected[:8]
    
    def _extract_vocab_patterns(self, topics: List[str]) -> Dict[str, Any]:
        """Extract vocabulary patterns từ topics"""
        vocab = set()
        word_counts = []
        
        for topic in topics:
            if topic in self.topic_patterns:
                vocab.update(self.topic_patterns[topic]['vocabulary'])
                word_counts.extend(self.topic_patterns[topic]['word_counts'])
        
        avg_words = sum(word_counts) / len(word_counts) if word_counts else 0
        
        return {
            'vocabulary': list(vocab)[:30],  # Top 30 words
            'avg_word_count': int(avg_words),
            'topics': topics
        }
    
    def _create_system_prompt(self, level: int, topics: List[str], vocab_patterns: Dict) -> str:
        """Tạo system prompt thông minh cho AI"""
        level_requirements = {
            1: {
                'words': '5-15 words',
                'complexity': 'simple sentences',
                'vocab': 'basic vocabulary (greetings, daily activities, family, colors, numbers)',
                'focus': 'simple descriptions, basic facts'
            },
            2: {
                'words': '15-30 words',
                'complexity': 'medium sentences',
                'vocab': 'common vocabulary (hobbies, travel, food, work, education)',
                'focus': 'personal experiences, opinions, explanations'
            },
            3: {
                'words': '30-60 words',
                'complexity': 'complex sentences',
                'vocab': 'advanced vocabulary (technology, environment, society, philosophy, science)',
                'focus': 'abstract concepts, analysis, detailed explanations'
            }
        }
        
        req = level_requirements.get(level, level_requirements[1])
        
        prompt = f"""You are an expert English learning AI specialized in creating diverse speaking practice prompts.

YOUR ROLE:
- Generate unique, engaging speaking practice sentences for English learners
- Ensure maximum diversity - never repeat similar prompts
- Adapt to different topics and contexts intelligently
- Learn from examples and create variations

LEVEL {level} REQUIREMENTS:
- Sentence length: {req['words']}
- Complexity: {req['complexity']}
- Vocabulary: {req['vocab']}
- Focus: {req['focus']}

AVAILABLE TOPICS: {', '.join(topics)}

VOCABULARY PATTERNS (use these words naturally):
{', '.join(vocab_patterns['vocabulary'][:20])}

CRITICAL RULES:
1. ALWAYS create something NEW and DIFFERENT
2. Vary sentence structures (declarative, compound, complex)
3. Use diverse vocabulary - avoid repetition
4. Make it natural and conversational
5. Ensure it's appropriate for English learners at level {level}
6. Choose topics that haven't been used recently
7. Be creative but keep it educational

Return ONLY valid JSON:
{{"prompt": "the sentence", "topic": "one of the available topics", "word_count": number}}"""
        
        return prompt
    
    def _create_few_shot_examples(self, examples: List[str], topics: List[str]) -> List[Dict[str, str]]:
        """Tạo few-shot examples để AI học"""
        few_shot = []
        
        for example in examples[:5]:  # Top 5 examples
            # Tìm topic của example
            topic = 'general'
            for item in self.sample_transcripts:
                if item.get('text') == example:
                    topic = item.get('topic', 'general')
                    break
            
            few_shot.append({
                'topic': topic,
                'example': example,
                'word_count': len(example.split())
            })
        
        return few_shot
    
    def generate_prompt_request(self, level: int, used_topics: List[str] = None, used_prompts: List[str] = None) -> Dict[str, Any]:
        """
        Tạo request hoàn chỉnh để gửi cho OpenRouter AI
        Trả về messages array và config
        """
        training_data = self.generate_training_prompt(level, used_topics, used_prompts)
        
        # Tạo messages cho OpenRouter
        messages = [
            {
                'role': 'system',
                'content': training_data['system_prompt']
            }
        ]
        
        # Thêm few-shot examples
        if training_data['few_shot_examples']:
            examples_text = "Learn from these examples:\n"
            for i, ex in enumerate(training_data['few_shot_examples'], 1):
                examples_text += f"{i}. [{ex['topic']}] {ex['example']} ({ex['word_count']} words)\n"
            
            messages.append({
                'role': 'user',
                'content': examples_text
            })
        
        # Thêm instruction
        instruction = f"""Now generate a NEW and UNIQUE speaking practice sentence for level {level}.

Requirements:
- Must be DIFFERENT from all previous prompts
- Choose a topic from: {', '.join(training_data['selected_topics'])}
- Avoid topics already used: {', '.join(used_topics) if used_topics else 'none'}
- Use vocabulary patterns naturally
- Make it engaging and educational

Generate now:"""
        
        messages.append({
            'role': 'user',
            'content': instruction
        })
        
        return {
            'messages': messages,
            'config': {
                'model': 'openai/gpt-4o-mini',
                'temperature': 0.95,  # High creativity
                'max_tokens': 250
            },
            'training_data': training_data
        }


def main():
    """Main function để test hoặc generate prompts"""
    trainer = PromptGeneratorTrainer()
    trainer.load_training_data()
    trainer.analyze_patterns()
    
    # Test generate prompt
    if len(sys.argv) > 1:
        level = int(sys.argv[1])
        used_topics = sys.argv[2].split(',') if len(sys.argv) > 2 and sys.argv[2] else []
        used_prompts = sys.argv[3].split('|') if len(sys.argv) > 3 and sys.argv[3] else []
        
        request = trainer.generate_prompt_request(level, used_topics, used_prompts)
        print(json.dumps(request, indent=2, ensure_ascii=False))
    else:
        # Demo
        print("🎓 Prompt Generator Trainer")
        print("=" * 50)
        
        for level in [1, 2, 3]:
            print(f"\n📚 Level {level} Training Data:")
            request = trainer.generate_prompt_request(level)
            print(f"Topics: {', '.join(request['training_data']['selected_topics'])}")
            print(f"Examples: {len(request['training_data']['few_shot_examples'])}")
            print(f"Vocabulary: {len(request['training_data']['vocab_patterns']['vocabulary'])} words")


if __name__ == "__main__":
    main()

