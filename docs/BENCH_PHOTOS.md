# Фотографии лавочек

## Где хранятся файлы

- **Файлы** — в **Supabase Storage**, публичный bucket **`bench-photos`** (создаётся миграцией `011_bench_photos.sql`).
- **Порядок и привязка к лавочке** — таблица **`bench_photos`** (`bench_id`, `storage_path`, `sort_order`).
- Публичный URL:  
  `{NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/bench-photos/{storage_path}`  
  Путь вида `{bench_id}/{uuid}.jpg`.

## Что сделать в Supabase

1. В **SQL Editor** выполни скрипт **`supabase/migrations/011_bench_photos.sql`** (если ещё не выполнял).

## Лимиты в приложении

- До **6** фото на одну лавочку при создании.
- Каждый файл до **5 МБ**, типы: JPEG, PNG, WebP, GIF (и в bucket задан такой лимит).

## Нужно ли платить Supabase за хранение

- На **бесплатном плане** Supabase обычно есть **лимит места под файлы** (Storage), отдельно от базы. Мелкий проект с фотографиями часто укладывается в free tier, пока не раздуешь объём.
- Если лимит превысишь — либо **апгрейд плана**, либо **очистка старых фото**, либо вынос медиа на **S3 / Cloudflare R2** и хранение только URL в БД.
- Актуальные цифры смотри на [странице цен Supabase](https://supabase.com/pricing) (раздел Storage / included quota).

Платить **обязательно** не нужно: достаточно free tier, пока хватает квоты.
