-- Ответы на комментарии: parent_id указывает на родительский комментарий.

ALTER TABLE public.bench_comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.bench_comments (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_bench_comments_parent_id ON public.bench_comments (parent_id);

COMMENT ON COLUMN public.bench_comments.parent_id IS 'Если задан — это ответ на комментарий parent_id';
