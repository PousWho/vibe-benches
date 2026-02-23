-- Комментарии к лавочкам. Отдельно от отзывов (отзыв = оценка, комментарий = текст).
-- Выполни после 006.

CREATE TABLE IF NOT EXISTS public.bench_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bench_id UUID NOT NULL REFERENCES public.benches (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bench_comments_bench_id ON public.bench_comments (bench_id);

ALTER TABLE public.bench_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bench_comments_select"
  ON public.bench_comments FOR SELECT
  USING (true);

CREATE POLICY "bench_comments_insert"
  ON public.bench_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bench_comments_update"
  ON public.bench_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bench_comments_delete"
  ON public.bench_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.bench_comments IS 'Комментарии к лавочкам (текст)';
