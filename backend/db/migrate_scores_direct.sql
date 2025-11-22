-- Migration trực tiếp: Cập nhật điểm từ thang 10 sang thang 100
-- Chỉ update những điểm > 0 và <= 10

-- 1. speaking_practice_rounds
UPDATE speaking_practice_rounds
SET score = score * 10
WHERE score > 0 AND score <= 10;

-- 2. practice_history
UPDATE practice_history
SET 
  total_score = total_score * 10,
  average_score = average_score * 10
WHERE (total_score > 0 AND total_score <= 10) OR (average_score > 0 AND average_score <= 10);

-- 3. quick_evaluations
UPDATE quick_evaluations
SET score = score * 10
WHERE score > 0 AND score <= 10;

-- 4. learner_progress
UPDATE learner_progress
SET 
  total_score = total_score * 10,
  average_score = average_score * 10
WHERE (total_score > 0 AND total_score <= 10) OR (average_score > 0 AND average_score <= 10);

-- 5. ai_reports
UPDATE ai_reports
SET 
  overall_score = overall_score * 10,
  pronunciation_score = pronunciation_score * 10,
  fluency_score = fluency_score * 10
WHERE (overall_score > 0 AND overall_score <= 10) 
   OR (pronunciation_score > 0 AND pronunciation_score <= 10)
   OR (fluency_score > 0 AND fluency_score <= 10);

-- 6. feedbacks
UPDATE feedbacks
SET 
  final_score = final_score * 10,
  pronunciation_score = pronunciation_score * 10,
  fluency_score = fluency_score * 10
WHERE (final_score > 0 AND final_score <= 10) 
   OR (pronunciation_score > 0 AND pronunciation_score <= 10)
   OR (fluency_score > 0 AND fluency_score <= 10);

