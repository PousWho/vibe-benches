-- Привязка лавочек к пользователям (Этап 3 — авторизация).
-- Выполни в Supabase SQL Editor после включения Auth в проекте.

-- Колонка владельца: ссылка на auth.users (Supabase хранит пользователей там).
ALTER TABLE public.benches
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_benches_user_id ON public.benches (user_id);

COMMENT ON COLUMN public.benches.user_id IS 'Кто создал лавочку; NULL = аноним (старые записи).';

-- Удаляем старую политику «все могут вставлять» и добавляем по ролям.
DROP POLICY IF EXISTS "benches_insert_all" ON public.benches;

-- Вставлять лавочку может только авторизованный пользователь, и user_id должен совпадать с auth.uid().
CREATE POLICY "benches_insert_authenticated"
  ON public.benches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Обновлять и удалять может только владелец.
CREATE POLICY "benches_update_owner"
  ON public.benches FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "benches_delete_owner"
  ON public.benches FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Читать по-прежнему могут все (в т.ч. анонимы).
-- Политика "benches_select_all" уже есть.
