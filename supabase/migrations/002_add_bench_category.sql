-- Добавляем категорию к лавочкам.
-- Выполни в Supabase SQL Editor, если таблица benches уже создана без колонки category.

ALTER TABLE public.benches
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other'
  CHECK (category IN ('mountain', 'forest', 'city', 'beach', 'other'));

COMMENT ON COLUMN public.benches.category IS 'Категория: mountain, forest, city, beach, other';
