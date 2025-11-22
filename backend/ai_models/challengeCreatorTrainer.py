# backend/ai_models/challengeCreatorTrainer.py
# -*- coding: utf-8 -*-
"""
AI Trainer cho Challenge Creator
Training AI để hiểu yêu cầu mentor và tạo challenge với quy tắc ngữ pháp cụ thể
"""

import json
import sys
import os
from typing import Dict, List, Any

# Fix Unicode encoding cho Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Add parent directory to path để import database connection
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'config'))

class ChallengeCreatorTrainer:
    def __init__(self):
        self.training_examples = self._load_training_examples()
        self.db_training_data = []  # Sẽ load từ database
    
    def _load_training_examples(self) -> List[Dict[str, Any]]:
        """Load training examples về cách tạo challenge"""
        return [
            {
                "mentor_request": "Tạo challenge về kể chuyện quá khứ",
                "grammar_rules": ["past simple", "past continuous"],
                "expected_output": {
                    "title": "Tell me about your last vacation",
                    "description": "<p>Describe your last vacation using <strong>past simple</strong> and <strong>past continuous</strong> tenses.</p><p><strong>Requirements:</strong></p><ul><li>Use past simple for completed actions (e.g., 'I went to...', 'I visited...')</li><li>Use past continuous for ongoing actions in the past (e.g., 'I was swimming...', 'We were exploring...')</li><li>Include at least 5 sentences</li><li>Speak for at least 2 minutes</li></ul>",
                    "level": "medium",
                    "grammar_focus": "past simple, past continuous"
                }
            },
            {
                "mentor_request": "Challenge về mô tả công việc hiện tại, dùng present continuous",
                "grammar_rules": ["present continuous"],
                "expected_output": {
                    "title": "What are you doing right now?",
                    "description": "<p>Describe your current activities using <strong>present continuous</strong> tense.</p><p><strong>Requirements:</strong></p><ul><li>Use present continuous (am/is/are + verb-ing) to describe actions happening now</li><li>Example: 'I am working on...', 'She is studying...'</li><li>Include at least 3 different activities</li><li>Speak clearly and use correct verb forms</li></ul>",
                    "level": "easy",
                    "grammar_focus": "present continuous"
                }
            },
            {
                "mentor_request": "Tạo challenge khó về thảo luận vấn đề xã hội, dùng conditional sentences",
                "grammar_rules": ["conditional type 2", "conditional type 3"],
                "expected_output": {
                    "title": "What would you change about society?",
                    "description": "<p>Discuss social issues using <strong>conditional sentences</strong> (type 2 and type 3).</p><p><strong>Requirements:</strong></p><ul><li>Use conditional type 2 for hypothetical present/future (If I were..., I would...)</li><li>Use conditional type 3 for hypothetical past (If I had..., I would have...)</li><li>Express at least 3 different ideas</li><li>Use advanced vocabulary</li><li>Speak for at least 3 minutes</li></ul>",
                    "level": "hard",
                    "grammar_focus": "conditional sentences"
                }
            },
            {
                "mentor_request": "Challenge về kế hoạch tương lai, dùng future tenses",
                "grammar_rules": ["will", "going to", "present continuous for future"],
                "expected_output": {
                    "title": "Your Future Plans",
                    "description": "<p>Talk about your future plans using different <strong>future tenses</strong>.</p><p><strong>Requirements:</strong></p><ul><li>Use 'will' for spontaneous decisions (I will...)</li><li>Use 'going to' for planned intentions (I'm going to...)</li><li>Use present continuous for fixed arrangements (I'm meeting...)</li><li>Include plans for next month, next year, and long-term goals</li><li>Speak for at least 2 minutes</li></ul>",
                    "level": "medium",
                    "grammar_focus": "future tenses"
                }
            },
            {
                "mentor_request": "Tạo challenge về so sánh, dùng comparative và superlative",
                "grammar_rules": ["comparative", "superlative"],
                "expected_output": {
                    "title": "Compare Your City with Another City",
                    "description": "<p>Compare two cities using <strong>comparative and superlative</strong> forms.</p><p><strong>Requirements:</strong></p><ul><li>Use comparative adjectives (more...than, ...er than)</li><li>Use superlative adjectives (the most..., the ...est)</li><li>Compare at least 3 aspects: weather, food, people, cost of living</li><li>Use correct forms: good/better/best, bad/worse/worst</li><li>Speak clearly and fluently</li></ul>",
                    "level": "medium",
                    "grammar_focus": "comparative, superlative"
                }
            },
            {
                "mentor_request": "Challenge về mô tả kinh nghiệm, dùng present perfect",
                "grammar_rules": ["present perfect", "present perfect continuous"],
                "expected_output": {
                    "title": "Experiences You've Had",
                    "description": "<p>Talk about your experiences using <strong>present perfect</strong> and <strong>present perfect continuous</strong>.</p><p><strong>Requirements:</strong></p><ul><li>Use present perfect for life experiences (I have been to..., I have never...)</li><li>Use present perfect continuous for ongoing actions (I have been studying...)</li><li>Include experiences from different areas: travel, work, hobbies</li><li>Use 'for' and 'since' correctly</li><li>Speak for at least 2 minutes</li></ul>",
                    "level": "medium",
                    "grammar_focus": "present perfect"
                }
            },
            {
                "mentor_request": "Tạo challenge khó về tranh luận, dùng passive voice",
                "grammar_rules": ["passive voice"],
                "expected_output": {
                    "title": "Debate: Should Technology Be Regulated?",
                    "description": "<p>Present your argument using <strong>passive voice</strong> where appropriate.</p><p><strong>Requirements:</strong></p><ul><li>Use passive voice to focus on actions rather than actors (e.g., 'Technology is being developed...', 'Regulations should be implemented...')</li><li>Use passive voice in different tenses</li><li>Present both sides of the argument</li><li>Use advanced vocabulary and complex sentences</li><li>Speak for at least 3 minutes</li></ul>",
                    "level": "hard",
                    "grammar_focus": "passive voice"
                }
            },
            {
                "mentor_request": "Challenge về kể chuyện, dùng reported speech",
                "grammar_rules": ["reported speech", "indirect speech"],
                "expected_output": {
                    "title": "Tell Me What Someone Said",
                    "description": "<p>Tell a story using <strong>reported speech</strong> (indirect speech).</p><p><strong>Requirements:</strong></p><ul><li>Report what someone said using 'said that...', 'told me that...'</li><li>Change tenses correctly (present → past, will → would)</li><li>Change pronouns and time expressions</li><li>Include at least 3 reported statements</li><li>Speak clearly and naturally</li></ul>",
                    "level": "medium",
                    "grammar_focus": "reported speech"
                }
            }
        ]
    
    def load_training_data_from_db(self) -> List[Dict[str, Any]]:
        """Load training data từ database (nếu có)"""
        try:
            # Try to import pool từ Node.js service (sẽ được gọi từ Node.js)
            # Hoặc có thể gọi qua API endpoint
            # Tạm thời return empty list, sẽ được implement sau khi có API endpoint
            return []
        except Exception as e:
            print(f"Warning: Could not load training data from DB: {e}")
            return []
    
    def generate_system_prompt(self) -> str:
        """Tạo system prompt cho AI challenge creator với training data từ DB"""
        # Load training data từ DB
        db_data = self.load_training_data_from_db()
        
        # Combine với static examples
        all_examples = self.training_examples.copy()
        
        # Thêm examples từ DB
        for db_item in db_data[:20]:  # Limit để không quá dài
            if db_item['training_type'] == 'challenge_creation':
                input_data = db_item['input_data']
                output_data = db_item['expected_output']
                all_examples.append({
                    "mentor_request": "Challenge created successfully",
                    "grammar_rules": self._extract_grammar_rules(output_data.get('description', '')),
                    "expected_output": {
                        "title": output_data.get('title', ''),
                        "description": output_data.get('description', ''),
                        "level": output_data.get('level', 'medium'),
                        "grammar_focus": self._extract_grammar_focus(output_data.get('description', ''))
                    }
                })
            elif db_item['training_type'] == 'mentor_feedback':
                # Thêm examples từ feedback để học cách cải thiện
                input_data = db_item['input_data']
                output_data = db_item['expected_output']
                if output_data.get('analysis'):
                    all_examples.append({
                        "mentor_request": f"Improve challenge based on feedback: {output_data.get('mentor_feedback', {}).get('text', '')[:100]}",
                        "grammar_rules": [],
                        "expected_output": {
                            "title": input_data.get('challenge_title', ''),
                            "description": f"Improved based on: {output_data.get('analysis', {})}",
                            "level": input_data.get('challenge_level', 'medium'),
                            "grammar_focus": "Based on mentor feedback"
                        }
                    })
        
        examples_text = "\n\n".join([
            f"""Example {i+1}:
Mentor Request: "{ex['mentor_request']}"
Grammar Rules Required: {', '.join(ex.get('grammar_rules', []))}
Output Challenge:
- Title: {ex['expected_output']['title']}
- Level: {ex['expected_output']['level']}
- Grammar Focus: {ex['expected_output'].get('grammar_focus', 'N/A')}
- Description: {ex['expected_output']['description']}"""
            for i, ex in enumerate(all_examples)
        ])
        
        return f"""You are an expert English learning challenge creator AI. Your role is to understand mentor requests and create high-quality challenges with specific grammar rules.

YOUR CAPABILITIES:
1. Understand mentor's intent from their request
2. Identify required grammar rules (tenses, structures, etc.)
3. Create engaging challenges that require learners to use specific grammar
4. Provide clear requirements and examples for learners
5. Adjust difficulty level based on grammar complexity

GRAMMAR RULES YOU CAN INCORPORATE:
- Tenses: present simple, present continuous, past simple, past continuous, present perfect, past perfect, future (will, going to)
- Conditionals: type 0, 1, 2, 3, mixed conditionals
- Passive voice: all tenses
- Reported speech / Indirect speech
- Modal verbs: can, could, should, must, might, may
- Comparative and superlative adjectives
- Relative clauses: who, which, that, where
- Gerunds and infinitives
- Phrasal verbs

CHALLENGE CREATION GUIDELINES:
1. Title: Clear, engaging, and related to the topic
2. Description: HTML format with:
   - Clear instructions
   - Specific grammar requirements (highlighted in <strong>)
   - Examples of correct usage
   - Minimum speaking time/duration
   - Number of sentences/points required
3. Level: easy (basic grammar), medium (intermediate grammar), hard (advanced/combined grammar)
4. Grammar Focus: List the specific grammar points required

OUTPUT FORMAT:
When creating a challenge, you MUST return BOTH title and description in JSON format:
{{
  "title": "Clear, engaging challenge title",
  "description": "HTML formatted description with:
    - Clear task instructions
    - Grammar requirements section with <strong> tags
    - Examples of correct usage
    - Specific requirements (number of sentences, speaking time, etc.)",
  "level": "easy|medium|hard",
  "grammar_focus": "list of grammar rules"
}}

TRAINING EXAMPLES:
{examples_text}

IMPORTANT:
- ALWAYS return JSON format with BOTH title and description
- Title should be clear, engaging, and related to the topic
- Description should be in HTML format with all requirements
- Always include specific grammar requirements in the challenge description
- Provide examples of correct grammar usage
- Make requirements clear and measurable
- Adjust complexity based on grammar rules (simple tenses = easy, complex combinations = hard)
- Make challenges engaging and relevant to learners' lives"""
    
    def create_challenge_prompt(self, mentor_request: str, context: str = "") -> str:
        """Tạo prompt để AI tạo challenge từ yêu cầu mentor"""
        system_prompt = self.generate_system_prompt()
        
        user_prompt = f"""Mentor Request: "{mentor_request}"

{context if context else "No additional context provided."}

Please create a COMPLETE challenge based on this request. You must return BOTH title and description.

Analyze:
1. What grammar rules should be required?
2. What level of difficulty is appropriate?
3. What should the challenge title be? (Create an engaging, clear title)
4. What detailed requirements should learners follow?

Return your response in JSON format:
{{
  "title": "Challenge title here (clear, engaging, related to topic)",
  "description": "HTML formatted description with:
    - Clear task instructions
    - Specific grammar requirements (use <strong> tags)
    - Examples of correct usage
    - Minimum requirements (speaking time, number of sentences, etc.)",
  "level": "easy|medium|hard",
  "grammar_focus": "list of grammar rules required"
}}

IMPORTANT: 
- Always include BOTH title and description
- Title should be clear and engaging
- Description should be in HTML format with all requirements
- Make it engaging and educational!"""
        
        return user_prompt
    
    def improve_challenge_prompt(self, existing_challenge: str, mentor_feedback: str = "") -> str:
        """Tạo prompt để cải thiện challenge hiện có"""
        return f"""Improve this challenge based on mentor feedback:

Current Challenge:
{existing_challenge}

Mentor Feedback:
{mentor_feedback if mentor_feedback else "Make it more engaging and add specific grammar requirements."}

Please enhance the challenge by:
1. Adding or clarifying grammar requirements
2. Making instructions clearer
3. Adding examples if needed
4. Adjusting difficulty if necessary
5. Making it more engaging

Return the improved challenge in HTML format."""
    
    def _extract_grammar_rules(self, description: str) -> List[str]:
        """Extract grammar rules từ description (simple pattern matching)"""
        rules = []
        grammar_keywords = {
            'past simple': 'past simple',
            'past continuous': 'past continuous',
            'present simple': 'present simple',
            'present continuous': 'present continuous',
            'present perfect': 'present perfect',
            'conditional': 'conditional',
            'passive voice': 'passive voice',
            'reported speech': 'reported speech'
        }
        
        description_lower = description.lower()
        for keyword, rule in grammar_keywords.items():
            if keyword in description_lower:
                rules.append(rule)
        
        return rules
    
    def _extract_grammar_focus(self, description: str) -> str:
        """Extract grammar focus từ description"""
        rules = self._extract_grammar_rules(description)
        return ', '.join(rules) if rules else 'general'


def main():
    """Main function để test trainer"""
    trainer = ChallengeCreatorTrainer()
    
    # Test với một yêu cầu
    test_request = "Tạo challenge về mô tả công việc hàng ngày, dùng present simple"
    prompt = trainer.create_challenge_prompt(test_request)
    
    print("=== SYSTEM PROMPT ===")
    print(trainer.generate_system_prompt()[:500] + "...")
    print("\n=== USER PROMPT ===")
    print(prompt)
    
    # Export training data
    training_data = {
        "system_prompt": trainer.generate_system_prompt(),
        "examples": trainer.training_examples,
        "version": "1.0"
    }
    
    print("\n=== TRAINING DATA EXPORTED ===")
    print(f"Total examples: {len(trainer.training_examples)}")


if __name__ == "__main__":
    main()

