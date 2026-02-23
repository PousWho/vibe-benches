-- Отзывы на лавочки: пользователь ставит оценку 1–5. Один отзыв на пользователя на лавочку.
-- Средний рейтинг по отзывам = «оценка сообщества» на карточке лавочки.
-- Выполни после 005. Требуется public.benches и auth.

CREATE TABLE IF NOT EXISTS public.bench_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bench_id UUID NOT NULL REFERENCES public.benches (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bench_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_bench_reviews_bench_id ON public.bench_reviews (bench_id);
CREATE INDEX IF NOT EXISTS idx_bench_reviews_user_id ON public.bench_reviews (user_id);

ALTER TABLE public.bench_reviews ENABLE ROW LEVEL SECURITY;

-- Читать отзывы могут все (для среднего рейтинга и списка).
CREATE POLICY "bench_reviews_select"
  ON public.bench_reviews FOR SELECT
  USING (true);

-- Писать/обновлять только свой отзыв (один на лавочку).
CREATE POLICY "bench_reviews_insert"
  ON public.bench_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bench_reviews_update"
  ON public.bench_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bench_reviews_delete"
  ON public.bench_reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.bench_reviews IS 'Отзывы (оценки 1–5) на лавочки; среднее = оценка сообщества';
