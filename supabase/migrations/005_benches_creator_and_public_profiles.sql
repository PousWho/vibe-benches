-- Имя автора лавочки (для попапа) и публичное чтение профилей (для страницы /profile/[userId]).
-- Выполни в Supabase SQL Editor.
-- Важно: сначала должна быть применена миграция 004_create_profiles.sql (таблица public.profiles).

-- В попапе показываем, кто добавил лавочку; ссылка ведёт на его профиль.
ALTER TABLE public.benches
  ADD COLUMN IF NOT EXISTS created_by_name TEXT;

COMMENT ON COLUMN public.benches.created_by_name IS 'Имя из profiles на момент создания (для отображения в попапе без джойна).';

-- Профили можно читать всем (для страницы «профиль пользователя» по ссылке из попапа).
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  USING (true);
