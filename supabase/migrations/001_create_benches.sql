-- Таблица лавочек для Vibe Benches.
-- Выполни этот скрипт в Supabase: Dashboard → SQL Editor → New query → вставь код → Run.

-- Таблица
CREATE TABLE IF NOT EXISTS public.benches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('mountain', 'forest', 'city', 'beach', 'other')),
  accessibility SMALLINT NOT NULL DEFAULT 0 CHECK (accessibility >= 0 AND accessibility <= 5),
  crowd SMALLINT NOT NULL DEFAULT 0 CHECK (crowd >= 0 AND crowd <= 5),
  view SMALLINT NOT NULL DEFAULT 0 CHECK (view >= 0 AND view <= 5),
  vibe SMALLINT NOT NULL DEFAULT 0 CHECK (vibe >= 0 AND vibe <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индекс по дате (для сортировки "сначала новые")
CREATE INDEX IF NOT EXISTS idx_benches_created_at ON public.benches (created_at DESC);

-- Row Level Security (RLS): кто может читать/писать.
-- Включили RLS, чтобы потом легко добавить "только свои лавочки" по user_id.
ALTER TABLE public.benches ENABLE ROW LEVEL SECURITY;

-- Политика: все могут читать все лавочки (в т.ч. анонимы).
CREATE POLICY "benches_select_all"
  ON public.benches FOR SELECT
  USING (true);

-- Политика: все могут создавать лавочку (пока без авторизации).
CREATE POLICY "benches_insert_all"
  ON public.benches FOR INSERT
  WITH CHECK (true);

-- (Позже добавим user_id и политики на UPDATE/DELETE для владельца.)

COMMENT ON TABLE public.benches IS 'Лавочки с вайбовым видом для карты Vibe Benches';
