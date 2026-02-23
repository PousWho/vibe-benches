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
  /** id пользователя, добавившего лавочку (для ссылки на профиль) */
  user_id?: string | null;
  /** Имя из профиля на момент создания (для попапа) */
  created_by_name?: string | null;
  /** Средний рейтинг по отзывам (оценка сообщества), null если отзывов нет */
  community_rating?: number | null;
};

/** Комментарий к лавочке (или ответ на комментарий) */
export type BenchComment = {
  id: string;
  bench_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author_name?: string | null;
  parent_id?: string | null;
  replies?: BenchComment[];
};

/** Уведомление в профиле */
export type Notification = {
  id: string;
  user_id: string;
  type: "comment" | "review";
  bench_id: string;
  from_user_id: string | null;
  comment_id: string | null;
  created_at: string;
  read_at: string | null;
  bench_title?: string | null;
  from_user_name?: string | null;
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
