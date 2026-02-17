/**
 * Типы для лавочек.
 * Используются и на фронте (карта), и в API (бэкенд).
 */

export type BenchRatings = {
  accessibility: number; // 🚶 как легко добраться (1–5)
  crowd: number;        // 👥 людность (1–5)
  view: number;        // 🌄 вид (1–5)
  vibe: number;        // ✨ вайб (1–5)
};

/** Ключи категорий — хранятся в БД и в API */
export const BENCH_CATEGORY_KEYS = [
  "mountain",
  "forest",
  "city",
  "beach",
  "other",
] as const;

export type BenchCategory = (typeof BENCH_CATEGORY_KEYS)[number];

/** Подписи категорий для UI (русский) */
export const BENCH_CATEGORY_LABELS: Record<BenchCategory, string> = {
  mountain: "Горная местность",
  forest: "Лесная местность",
  city: "Город",
  beach: "Пляж",
  other: "Другое",
};

/** Лавочка в формате для карты и API-ответов */
export type Bench = {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  category: BenchCategory;
  ratings: BenchRatings;
  created_at?: string;
};

/** Тело запроса POST — когда создаём новую лавочку (без id и created_at) */
export type CreateBenchBody = {
  title: string;
  description: string;
  lat: number;
  lng: number;
  category: BenchCategory;
  ratings: BenchRatings;
};
