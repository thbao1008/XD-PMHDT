-- Migration: Cập nhật tất cả điểm từ thang 10 sang thang 100
-- Chạy migration này để cập nhật các điểm cũ trong database

BEGIN;

-- 1. Cập nhật speaking_practice_rounds: score và analysis.speaking_score
UPDATE speaking_practice_rounds
SET 
  score = CASE 
    WHEN score > 0 AND score <= 10 THEN score * 10 
    ELSE score 
  END,
  analysis = CASE 
    WHEN analysis IS NOT NULL AND analysis::text != 'null' THEN
      (
        SELECT jsonb_build_object(
          'feedback', COALESCE(analysis::jsonb->>'feedback', ''),
          'errors', COALESCE(analysis::jsonb->'errors', '[]'::jsonb),
          'grammar_errors', COALESCE(analysis::jsonb->'grammar_errors', '[]'::jsonb),
          'corrected_text', COALESCE(analysis::jsonb->>'corrected_text', ''),
          'speaking_score', CASE 
            WHEN (analysis::jsonb->>'speaking_score')::numeric > 0 AND (analysis::jsonb->>'speaking_score')::numeric <= 10 
            THEN ((analysis::jsonb->>'speaking_score')::numeric * 10)
            WHEN (analysis::jsonb->>'speaking_score')::numeric IS NULL AND score > 0 AND score <= 10
            THEN score * 10
            ELSE COALESCE((analysis::jsonb->>'speaking_score')::numeric, score)
          END,
          'vocabulary_score', CASE 
            WHEN (analysis::jsonb->>'vocabulary_score')::numeric > 0 AND (analysis::jsonb->>'vocabulary_score')::numeric <= 10 
            THEN ((analysis::jsonb->>'vocabulary_score')::numeric * 10)
            ELSE COALESCE((analysis::jsonb->>'vocabulary_score')::numeric, 0)
          END,
          'speech_rate', COALESCE((analysis::jsonb->>'speech_rate')::numeric, 0),
          'missing_words', COALESCE(analysis::jsonb->'missing_words', '[]'::jsonb),
          'strengths', COALESCE(analysis::jsonb->'strengths', '[]'::jsonb),
          'improvements', COALESCE(analysis::jsonb->'improvements', '[]'::jsonb)
        )
      )::text
    ELSE analysis
  END
WHERE (score > 0 AND score <= 10) OR (analysis IS NOT NULL AND analysis::text != 'null' AND (analysis::jsonb->>'speaking_score')::numeric > 0 AND (analysis::jsonb->>'speaking_score')::numeric <= 10);

-- 2. Cập nhật practice_history: total_score và average_score
UPDATE practice_history
SET 
  total_score = CASE 
    WHEN total_score > 0 AND total_score <= 10 THEN total_score * 10 
    ELSE total_score 
  END,
  average_score = CASE 
    WHEN average_score > 0 AND average_score <= 10 THEN average_score * 10 
    ELSE average_score 
  END
WHERE (total_score > 0 AND total_score <= 10) OR (average_score > 0 AND average_score <= 10);

-- 3. Cập nhật quick_evaluations: score
UPDATE quick_evaluations
SET score = CASE 
  WHEN score > 0 AND score <= 10 THEN score * 10 
  ELSE score 
END
WHERE score > 0 AND score <= 10;

-- 4. Cập nhật learner_progress: total_score và average_score
UPDATE learner_progress
SET 
  total_score = CASE 
    WHEN total_score > 0 AND total_score <= 10 THEN total_score * 10 
    ELSE total_score 
  END,
  average_score = CASE 
    WHEN average_score > 0 AND average_score <= 10 THEN average_score * 10 
    ELSE average_score 
  END
WHERE (total_score > 0 AND total_score <= 10) OR (average_score > 0 AND average_score <= 10);

-- 5. Cập nhật ai_reports: overall_score, pronunciation_score, fluency_score
-- (Chỉ update nếu điểm <= 10, giả định là thang 10 cũ)
UPDATE ai_reports
SET 
  overall_score = CASE 
    WHEN overall_score > 0 AND overall_score <= 10 THEN overall_score * 10 
    ELSE overall_score 
  END,
  pronunciation_score = CASE 
    WHEN pronunciation_score > 0 AND pronunciation_score <= 10 THEN pronunciation_score * 10 
    ELSE pronunciation_score 
  END,
  fluency_score = CASE 
    WHEN fluency_score > 0 AND fluency_score <= 10 THEN fluency_score * 10 
    ELSE fluency_score 
  END
WHERE (overall_score > 0 AND overall_score <= 10) OR (pronunciation_score > 0 AND pronunciation_score <= 10) OR (fluency_score > 0 AND fluency_score <= 10);

-- 6. Cập nhật feedbacks: final_score, pronunciation_score, fluency_score
-- LƯU Ý: Feedbacks có thể đã được nhân 10 khi lưu (nếu được tạo sau khi có logic nhân 10)
-- Chỉ update những điểm <= 10 (giả định là thang 10 cũ, chưa được nhân)
UPDATE feedbacks
SET 
  final_score = CASE 
    WHEN final_score > 0 AND final_score <= 10 THEN final_score * 10 
    ELSE final_score 
  END,
  pronunciation_score = CASE 
    WHEN pronunciation_score > 0 AND pronunciation_score <= 10 THEN pronunciation_score * 10 
    ELSE pronunciation_score 
  END,
  fluency_score = CASE 
    WHEN fluency_score > 0 AND fluency_score <= 10 THEN fluency_score * 10 
    ELSE fluency_score 
  END
WHERE (final_score > 0 AND final_score <= 10) OR (pronunciation_score > 0 AND pronunciation_score <= 10) OR (fluency_score > 0 AND fluency_score <= 10);

COMMIT;

-- Kiểm tra kết quả
SELECT 
  'speaking_practice_rounds' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN score <= 10 THEN 1 END) as rows_with_old_scale
FROM speaking_practice_rounds
UNION ALL
SELECT 
  'practice_history',
  COUNT(*),
  COUNT(CASE WHEN average_score <= 10 THEN 1 END)
FROM practice_history
UNION ALL
SELECT 
  'quick_evaluations',
  COUNT(*),
  COUNT(CASE WHEN score <= 10 THEN 1 END)
FROM quick_evaluations
UNION ALL
SELECT 
  'ai_reports',
  COUNT(*),
  COUNT(CASE WHEN overall_score <= 10 THEN 1 END)
FROM ai_reports
UNION ALL
SELECT 
  'feedbacks',
  COUNT(*),
  COUNT(CASE WHEN final_score <= 10 THEN 1 END)
FROM feedbacks;

