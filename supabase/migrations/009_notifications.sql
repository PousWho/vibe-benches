-- Уведомления для пользователя: новый комментарий или отзыв на его лавочку.
-- Пока только внутри приложения (раздел «Уведомления» в профиле). Отправка на почту не используется.

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('comment', 'review')),
  bench_id UUID NOT NULL REFERENCES public.benches (id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  comment_id UUID REFERENCES public.bench_comments (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Вставка только с сервера (service role) или через RPC. Для простоты разрешим вставку из API:
-- любой авторизованный может создать уведомление для другого пользователя (получатель = владелец лавочки).
CREATE POLICY "notifications_insert"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMENT ON TABLE public.notifications IS 'Уведомления: комментарий/отзыв на лавочку пользователя';
