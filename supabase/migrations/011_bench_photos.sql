-- Фото лавочек: метаданные в БД, файлы в Storage bucket bench-photos.
-- Выполни в Supabase SQL Editor после предыдущих миграций.

-- ---------------------------------------------------------------------------
-- Таблица ссылок на объекты в Storage (путь внутри bucket)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bench_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bench_id UUID NOT NULL REFERENCES public.benches (id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bench_id, storage_path)
);

CREATE INDEX IF NOT EXISTS idx_bench_photos_bench_id ON public.bench_photos (bench_id);

ALTER TABLE public.bench_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bench_photos_select_all"
  ON public.bench_photos FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "bench_photos_insert_owner"
  ON public.bench_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.benches b
      WHERE b.id = bench_photos.bench_id AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "bench_photos_delete_owner"
  ON public.bench_photos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.benches b
      WHERE b.id = bench_photos.bench_id AND b.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.bench_photos IS 'Пути к файлам в storage bucket bench-photos';

-- ---------------------------------------------------------------------------
-- Storage: публичный bucket (чтение картинок картой без JWT)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bench-photos',
  'bench-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Любой может скачивать объекты из bucket (публичные URL)
DROP POLICY IF EXISTS "bench_photos_storage_select" ON storage.objects;
CREATE POLICY "bench_photos_storage_select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'bench-photos');

-- Загрузка только в папку {bench_id}/... для лавочек текущего пользователя
DROP POLICY IF EXISTS "bench_photos_storage_insert" ON storage.objects;
CREATE POLICY "bench_photos_storage_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bench-photos'
    AND EXISTS (
      SELECT 1 FROM public.benches b
      WHERE b.id = ((storage.foldername(name))[1])::uuid
        AND b.user_id = auth.uid()
    )
  );

-- Удаление файлов владельцем лавочки
DROP POLICY IF EXISTS "bench_photos_storage_delete" ON storage.objects;
CREATE POLICY "bench_photos_storage_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bench-photos'
    AND EXISTS (
      SELECT 1 FROM public.benches b
      WHERE b.id = ((storage.foldername(name))[1])::uuid
        AND b.user_id = auth.uid()
    )
  );
