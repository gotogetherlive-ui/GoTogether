-- Add positive GoTogether feedback with a required 1-5 rating.

ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS rating SMALLINT;

ALTER TABLE feedbacks DROP CONSTRAINT IF EXISTS feedbacks_category_check;
ALTER TABLE feedbacks
  ADD CONSTRAINT feedbacks_category_check
  CHECK (category IN ('technical', 'trip', 'gotogether', 'love'));

ALTER TABLE feedbacks DROP CONSTRAINT IF EXISTS feedbacks_love_rating_check;
ALTER TABLE feedbacks
  ADD CONSTRAINT feedbacks_love_rating_check
  CHECK (
    (category = 'love' AND rating BETWEEN 1 AND 5)
    OR (category <> 'love' AND rating IS NULL)
  );

CREATE INDEX IF NOT EXISTS idx_feedbacks_love_rating
  ON feedbacks (rating, created_at DESC)
  WHERE category = 'love';
