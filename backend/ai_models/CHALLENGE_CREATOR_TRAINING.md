# Challenge Creator AI Training

## Tổng quan

Hệ thống training AI để tạo challenge với khả năng:
1. Hiểu yêu cầu của mentor
2. Tạo challenge với quy tắc ngữ pháp cụ thể
3. Đưa ra yêu cầu rõ ràng cho learner

## Cấu trúc

### 1. Python Trainer (`challengeCreatorTrainer.py`)

File này chứa:
- **Training examples**: Các ví dụ về cách tạo challenge với quy tắc ngữ pháp cụ thể
- **System prompt generator**: Tạo system prompt cho AI
- **Challenge creation prompts**: Tạo prompt để AI tạo challenge từ yêu cầu mentor

#### Training Examples

Mỗi example bao gồm:
- `mentor_request`: Yêu cầu của mentor
- `grammar_rules`: Các quy tắc ngữ pháp cần áp dụng
- `expected_output`: Challenge mong đợi với:
  - `title`: Tiêu đề challenge
  - `description`: Mô tả chi tiết (HTML format)
  - `level`: Độ khó (easy/medium/hard)
  - `grammar_focus`: Các điểm ngữ pháp tập trung

#### Grammar Rules Hỗ trợ

- **Tenses**: present simple, present continuous, past simple, past continuous, present perfect, past perfect, future
- **Conditionals**: type 0, 1, 2, 3, mixed conditionals
- **Passive voice**: Tất cả các thì
- **Reported speech**: Indirect speech
- **Modal verbs**: can, could, should, must, might, may
- **Comparative/Superlative**: So sánh hơn và nhất
- **Relative clauses**: who, which, that, where
- **Gerunds/Infinitives**: Động từ dạng -ing và to + verb
- **Phrasal verbs**: Cụm động từ

### 2. Backend Service (`mentorAiService.js`)

#### `chatWithAI(message, context)`

Hàm này:
1. Load system prompt từ Python trainer (với fallback)
2. Phân tích yêu cầu mentor
3. Tạo challenge description với:
   - Quy tắc ngữ pháp cụ thể (highlighted với `<strong>`)
   - Ví dụ cách sử dụng đúng
   - Yêu cầu rõ ràng (thời gian nói, số câu, etc.)

#### `editChallengeAI(content, mentorFeedback)`

Hàm này:
1. Cải thiện challenge hiện có
2. Thêm/clarify quy tắc ngữ pháp nếu thiếu
3. Làm rõ instructions
4. Thêm examples nếu cần

## Cách sử dụng

### 1. Mentor gửi yêu cầu qua AI Chat

Ví dụ:
- "Tạo challenge về kể chuyện quá khứ"
- "Challenge về mô tả công việc hiện tại, dùng present continuous"
- "Tạo challenge khó về thảo luận vấn đề xã hội, dùng conditional sentences"

### 2. AI phân tích và tạo challenge

AI sẽ:
1. Nhận diện quy tắc ngữ pháp từ yêu cầu
2. Tạo title phù hợp
3. Tạo description với:
   - Instructions rõ ràng
   - Grammar requirements (highlighted)
   - Examples
   - Minimum requirements

### 3. Output Format

Challenge description sẽ có format HTML:
```html
<p>Describe your last vacation using <strong>past simple</strong> and <strong>past continuous</strong> tenses.</p>
<p><strong>Requirements:</strong></p>
<ul>
  <li>Use past simple for completed actions (e.g., 'I went to...', 'I visited...')</li>
  <li>Use past continuous for ongoing actions in the past (e.g., 'I was swimming...')</li>
  <li>Include at least 5 sentences</li>
  <li>Speak for at least 2 minutes</li>
</ul>
```

## Training Data

Training examples được lưu trong `challengeCreatorTrainer.py` và bao gồm:

1. Past tenses (past simple, past continuous)
2. Present continuous
3. Conditionals (type 2, 3)
4. Future tenses (will, going to, present continuous for future)
5. Comparative/Superlative
6. Present perfect
7. Passive voice
8. Reported speech

## Cách thêm Training Examples mới

Thêm vào `_load_training_examples()` trong `challengeCreatorTrainer.py`:

```python
{
    "mentor_request": "Yêu cầu của mentor",
    "grammar_rules": ["rule1", "rule2"],
    "expected_output": {
        "title": "Challenge Title",
        "description": "<p>HTML description...</p>",
        "level": "easy|medium|hard",
        "grammar_focus": "grammar points"
    }
}
```

## Testing

Chạy Python trainer để test:
```bash
cd backend/ai_models
python challengeCreatorTrainer.py
```

## Integration

Hệ thống được tích hợp vào:
- `ChallengeCreator.jsx`: Frontend component
- `mentorAiService.js`: Backend service
- `mentorController.js`: API endpoints

API endpoints:
- `POST /api/mentors/challenges/ai-chat`: Chat với AI để tạo challenge
- `PUT /api/mentors/challenges/:id/ai`: Cải thiện challenge bằng AI
- `POST /api/mentors/challenges/ai-improve`: Cải thiện draft challenge

