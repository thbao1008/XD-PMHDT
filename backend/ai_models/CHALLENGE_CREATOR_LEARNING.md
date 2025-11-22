# Challenge Creator AI Learning System

## Tổng quan

Hệ thống học cho Challenge Creator AI để cải thiện khả năng tạo challenge dựa trên:
1. **Challenges mà mentor tạo thành công**
2. **Submissions của learner** (cách learner trả lời challenge)
3. **Feedback của mentor** về bài làm của learner

## Cấu trúc

### 1. Database Schema

Bảng `challenge_creator_training` lưu training data:
- `training_type`: Loại training ('challenge_creation', 'learner_submission', 'mentor_feedback')
- `input_data`: Dữ liệu đầu vào (JSONB)
- `expected_output`: Kết quả mong đợi (JSONB)

### 2. Learning Service (`challengeLearningService.js`)

#### `learnFromChallengeCreation(challengeId, mentorId)`
- Lưu challenge được tạo thành công
- Input: Challenge info (title, description, level, type)
- Output: Challenge structure để AI học pattern

#### `learnFromLearnerSubmission(submissionId, challengeId, learnerId)`
- Lưu submission của learner
- Input: Challenge info + submission info
- Output: Cách learner hiểu và trả lời challenge

#### `learnFromMentorFeedback(submissionId, challengeId, learnerId, mentorId, scores, feedbackText, feedbackAudioUrl)`
- Lưu feedback của mentor
- Input: Challenge + Submission + Feedback
- Output: Phân tích về:
  - Challenge clarity (rõ ràng không?)
  - Learner understanding (learner có hiểu không?)
  - Grammar requirements met (đáp ứng yêu cầu ngữ pháp không?)
  - Difficulty appropriate (độ khó phù hợp không?)

### 3. Integration Points

#### Khi mentor tạo challenge thành công
```javascript
// mentorService.js - createChallengeWithoutTopic()
await challengeLearningService.learnFromChallengeCreation(challenge.id, mentorId);
```

#### Khi learner submit challenge
```javascript
// learnerService.js - createSubmission()
await challengeLearningService.learnFromLearnerSubmission(
  submission.id,
  challengeId,
  learnerId
);
```

#### Khi mentor chấm và feedback
```javascript
// mentorService.js - saveMentorReview()
await challengeLearningService.learnFromMentorFeedback(
  submissionId,
  challenge_id,
  learner_id,
  mentorId,
  scores,
  feedbackText,
  audioUrl
);
```

### 4. Python Trainer Integration

Python trainer (`challengeCreatorTrainer.py`) tự động load training data từ database:

```python
def load_training_data_from_db(self):
    # Load từ challenge_creator_training table
    # Combine với static examples
    # Sử dụng để generate system prompt tốt hơn
```

## Learning Flow

### 1. Challenge Creation Learning

```
Mentor tạo challenge
    ↓
Challenge được lưu vào DB
    ↓
learnFromChallengeCreation() được gọi
    ↓
Training data được lưu vào challenge_creator_training
    ↓
Python trainer load data này
    ↓
AI học pattern của challenge tốt
```

### 2. Submission Learning

```
Learner submit challenge
    ↓
Submission được lưu vào DB
    ↓
learnFromLearnerSubmission() được gọi
    ↓
Training data được lưu (challenge + submission)
    ↓
AI học cách learner hiểu challenge
```

### 3. Feedback Learning

```
Mentor chấm và feedback
    ↓
Feedback được lưu vào DB
    ↓
learnFromMentorFeedback() được gọi
    ↓
AI phân tích:
  - Challenge có rõ ràng không?
  - Learner có hiểu không?
  - Grammar requirements có phù hợp không?
  - Difficulty có đúng không?
    ↓
Training data được lưu với analysis
    ↓
AI học cách cải thiện challenge
```

## Training Data Structure

### Challenge Creation
```json
{
  "input_data": {
    "mentor_id": 1,
    "request_context": "challenge_created_successfully"
  },
  "expected_output": {
    "challenge_id": 123,
    "title": "Tell me about your vacation",
    "description": "<p>Describe using past simple...</p>",
    "level": "medium",
    "type": "speaking"
  }
}
```

### Learner Submission
```json
{
  "input_data": {
    "challenge_id": 123,
    "challenge_title": "Tell me about your vacation",
    "challenge_description": "...",
    "challenge_level": "medium"
  },
  "expected_output": {
    "submission_id": 456,
    "learner_id": 789,
    "transcript": "I went to...",
    "audio_url": "..."
  }
}
```

### Mentor Feedback
```json
{
  "input_data": {
    "challenge_id": 123,
    "challenge_title": "...",
    "challenge_description": "...",
    "learner_submission": {
      "transcript": "...",
      "audio_url": "..."
    }
  },
  "expected_output": {
    "mentor_feedback": {
      "text": "Good job but...",
      "audio_url": "..."
    },
    "scores": {
      "final_score": 7.5,
      "pronunciation_score": 8,
      "fluency_score": 7
    },
    "analysis": {
      "challenge_clarity": true,
      "learner_understanding": true,
      "grammar_requirements_met": false,
      "difficulty_appropriate": true
    }
  }
}
```

## Benefits

1. **Continuous Learning**: AI học liên tục từ mỗi challenge, submission, và feedback
2. **Pattern Recognition**: Nhận diện pattern của challenge tốt và không tốt
3. **Improvement Suggestions**: Tự động đề xuất cải thiện dựa trên feedback
4. **Personalization**: Hiểu cách learner phản ứng với các loại challenge khác nhau

## Setup

1. Tạo database table:
```sql
-- Chạy file: backend/db/challenge_creator_training_schema.sql
```

2. Hệ thống tự động học khi:
   - Mentor tạo challenge
   - Learner submit challenge
   - Mentor chấm và feedback

3. Python trainer tự động load training data khi generate prompt

## Monitoring

Xem training data:
```sql
SELECT training_type, COUNT(*) as count
FROM challenge_creator_training
GROUP BY training_type;

SELECT * FROM challenge_creator_training
ORDER BY created_at DESC
LIMIT 10;
```

