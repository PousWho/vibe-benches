-- Отзывы на пользователей: другие пользователи ставят оценку 1–5.
-- Один отзыв от одного пользователя на одного пользователя. Для профиля и репутации.
-- Выполни после 004 (profiles).

CREATE TABLE IF NOT EXISTS public.user_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewed_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_self_review CHECK (reviewed_user_id != author_user_id),
  UNIQUE (reviewed_user_id, author_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_reviews_reviewed ON public.user_reviews (reviewed_user_id);
CREATE INDEX IF NOT EXISTS idx_user_reviews_author ON public.user_reviews (author_user_id);

ALTER TABLE public.user_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_reviews_select"
  ON public.user_reviews FOR SELECT
  USING (true);

CREATE POLICY "user_reviews_insert"
  ON public.user_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_user_id);

CREATE POLICY "user_reviews_update"
  ON public.user_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_user_id)
  WITH CHECK (auth.uid() = author_user_id);

CREATE POLICY "user_reviews_delete"
  ON public.user_reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = author_user_id);

COMMENT ON TABLE public.user_reviews IS 'Отзывы (оценки 1–5) на пользователей';
