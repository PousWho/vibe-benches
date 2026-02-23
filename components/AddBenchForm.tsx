"use client";

/**
 * =============================================================================
 * КОМПОНЕНТ: Форма добавления новой лавочки (AddBenchForm)
 * =============================================================================
 *
 * ЧТО ЭТОТ ФАЙЛ ДЕЛАЕТ:
 * Это форма, которая появляется после клика по карте. В ней пользователь вводит:
 * - название лавочки
 * - описание
 * - категорию (горная местность, лес, город, пляж, другое)
 * - четыре рейтинга по 5 звёздам (доступность, людность, вид, вайб)
 * После нажатия «Сохранить» данные отправляются на сервер (POST /api/benches),
 * лавочка сохраняется в базе, и родительский компонент обновляет карту.
 *
 * ПОЧЕМУ ОТДЕЛЬНЫЙ ФАЙЛ:
 * Так проще читать код и добавлять новые поля. Всю логику формы мы держим здесь,
 * а в MapView только показываем форму и передаём координаты и колбэки.
 * =============================================================================
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { Bench, BenchCategory, BenchRatings, CreateBenchBody } from "@/types/bench";
import {
  BENCH_CATEGORY_KEYS,
  BENCH_CATEGORY_LABELS,
} from "@/types/bench";

// -----------------------------------------------------------------------------
// Типы пропсов (props) — что родитель передаёт в этот компонент
// -----------------------------------------------------------------------------
// В React компонент получает данные извне через объект "props".
// Мы описываем его форму здесь, чтобы TypeScript проверял, что мы передаём
// правильные данные (координаты, колбэки при успехе и отмене).

type AddBenchFormProps = {
  /** Долгота (longitude) — координата по горизонтали на карте */
  lng: number;
  /** Широта (latitude) — координата по вертикали на карте */
  lat: number;
  /** Вызывается после успешного сохранения. Передаём новую лавочку — родитель добавит её на карту */
  onSuccess: (bench: Bench) => void;
  /** Вызывается при нажатии «Отмена» — родитель просто закроет форму */
  onCancel: () => void;
};

// Рейтинги по умолчанию (все по 3 звезды), чтобы форма не была пустой
const DEFAULT_RATINGS: BenchRatings = {
  accessibility: 3,
  crowd: 3,
  view: 3,
  vibe: 3,
};

/** Кнопка-звезда: pointer, увеличение при hover, анимация при клике */
function StarButton({
  filled,
  onClick,
  disabled,
  title,
}: {
  filled: boolean;
  onClick: () => void;
  disabled: boolean;
  title: string;
}) {
  const [animating, setAnimating] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);
  const handleClick = () => {
    if (disabled) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setAnimating(true);
    onClick();
    timeoutRef.current = setTimeout(() => {
      setAnimating(false);
      timeoutRef.current = null;
    }, 220);
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      title={title}
      className="flex flex-1 cursor-pointer items-center justify-center transition-transform duration-150 ease-out hover:scale-110 focus:outline-none disabled:cursor-not-allowed disabled:hover:scale-100"
      style={{
        color: filled ? "#0d9488" : "#9ca3af",
        fontSize: "1.75rem",
        lineHeight: 1,
        animation: animating ? "star-pop 0.22s ease-out" : undefined,
      }}
    >
      ★
    </button>
  );
}

/**
 * Компонент формы. React вызывает эту функцию каждый раз, когда нужно
 * нарисовать форму на экране (например когда открыли модалку).
 */
export default function AddBenchForm({ lng, lat, onSuccess, onCancel }: AddBenchFormProps) {
  // -------------------------------------------------------------------------
  // STATE (состояние) — «память» компонента
  // -------------------------------------------------------------------------
  // useState даёт нам переменную и функцию для её изменения. Когда мы вызываем
  // setЧто-то(новоеЗначение), React перерисовывает компонент с новыми данными.
  // Без state форма не «запомнила» бы то, что пользователь ввёл в поля.

  /** Текст в поле «Название» */
  const [title, setTitle] = useState("");
  /** Текст в поле «Описание» */
  const [description, setDescription] = useState("");
  /** Выбранная категория (ключ: mountain, forest, city, beach, other) */
  const [category, setCategory] = useState<BenchCategory>("other");
  /** Четыре рейтинга 1–5. Объект, чтобы не плодить 4 отдельных state */
  const [ratings, setRatings] = useState<BenchRatings>(DEFAULT_RATINGS);
  /** Идёт ли отправка на сервер (пока true — кнопку «Сохранить» блокируем, показываем «Сохранение…») */
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** Текст ошибки с сервера (например «Нужны: title, description…») — показываем под формой */
  const [submitError, setSubmitError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Обновление одного рейтинга по ключу (accessibility, crowd, view, vibe)
  // -------------------------------------------------------------------------
  // setRatings не умеет обновить одно поле объекта. Нужно создать новый объект:
  // «старые рейтинги, но поле [key] = value». useCallback запоминает функцию,
  // чтобы не создавать её заново при каждой перерисовке (мелкая оптимизация).
  const setRating = useCallback((key: keyof BenchRatings, value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
  }, []);

  /**
   * Обработчик отправки формы.
   * Вызывается когда пользователь нажимает «Сохранить».
   * 1) Блокируем повторные нажатия (isSubmitting).
   * 2) Собираем тело запроса в формате CreateBenchBody.
   * 3) Отправляем POST /api/benches.
   * 4) При успехе вызываем onSuccess(новая лавочка) и родитель добавит маркер.
   * 5) При ошибке показываем текст в submitError.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Важно: отменяем стандартное поведение браузера (перезагрузка страницы)

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setSubmitError("Введите название");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const body: CreateBenchBody = {
      title: trimmedTitle,
      description: description.trim(),
      lat,
      lng,
      category,
      ratings,
    };

    try {
      const res = await fetch("/api/benches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body), // объект превращаем в строку JSON для сети
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error ?? `Ошибка ${res.status}`);
        return;
      }

      // Успех: сервер вернул созданную лавочку (с id и created_at)
      onSuccess(data as Bench);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Ошибка сети");
    } finally {
      setIsSubmitting(false); // в любом случае снимаем блокировку кнопки
    }
  };

  // -------------------------------------------------------------------------
  // Рендер: что пользователь видит на экране
  // -------------------------------------------------------------------------
  // return возвращает «дерево» элементов (JSX). Значения в фигурных скобках {}
  // — это JavaScript (переменные, выражения). className задаёт стили (Tailwind).

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      {/* Полупрозрачный фон на весь экран; по клику можно было бы закрывать — пока только кнопка Отмена */}

      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h2 className="mb-4 text-xl font-semibold text-zinc-800 dark:text-zinc-100">
          Новая лавочка
        </h2>
        <p className="mb-4 text-sm text-zinc-500">
          Координаты: {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>

        {/* form — семантический контейнер. onSubmit срабатывает по Enter и по кнопке submit */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* ---------- Название ---------- */}
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Название *
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Лавка с видом на закат"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              disabled={isSubmitting}
              autoFocus
            />
          </label>

          {/* ---------- Описание ---------- */}
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Описание
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опишите место и вайб"
              rows={3}
              className="resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              disabled={isSubmitting}
            />
          </label>

          {/* ---------- Категория (выпадающий список) ---------- */}
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Категория
            </span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as BenchCategory)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              disabled={isSubmitting}
            >
              {BENCH_CATEGORY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {BENCH_CATEGORY_LABELS[key]}
                </option>
              ))}
            </select>
          </label>

          {/* ---------- Рейтинги 1–5: подпись сверху, звёзды во всю ширину под ней ---------- */}
          <div className="flex flex-col gap-4">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Оценки (1–5)
            </span>
            {(
              [
                { key: "accessibility" as const, label: "🚶 Доступность" },
                { key: "crowd" as const, label: "👥 Людность" },
                { key: "view" as const, label: "🌄 Вид" },
                { key: "vibe" as const, label: "✨ Вайб" },
              ] as const
            ).map(({ key, label }) => (
              <div key={key} className="flex w-full flex-col gap-1.5">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">{label}</span>
                <div
                  className="flex w-full items-center justify-between gap-1"
                  role="group"
                  aria-label={`Оценка: ${ratings[key]} из 5`}
                >
                  {([1, 2, 3, 4, 5] as const).map((n) => (
                    <StarButton
                      key={n}
                      filled={n <= ratings[key]}
                      onClick={() => setRating(key, n)}
                      disabled={isSubmitting}
                      title={`${n} из 5`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ---------- Ошибка с сервера ---------- */}
          {submitError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {submitError}
            </p>
          )}

          {/* ---------- Кнопки ---------- */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-xl border border-zinc-300 py-2.5 font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              disabled={isSubmitting}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-green-600 py-2.5 font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
