/**
 * =============================================================================
 * API ROUTE: /api/benches (GET и POST)
 * =============================================================================
 *
 * ЧТО ЭТОТ ФАЙЛ ДЕЛАЕТ:
 * В Next.js папка app/api/... задаёт «маршруты API» — URL, на которые приходят
 * запросы не за страницей HTML, а за данными (JSON). Этот файл обрабатывает
 * запросы к адресу /api/benches:
 *
 * - GET  /api/benches  → вернуть все лавочки из базы (для загрузки карты).
 * - POST /api/benches  → создать новую лавочку (тело запроса: название, описание, координаты, категория, рейтинги).
 *
 * КАК NEXT НАХОДИТ ЭТОТ КОД:
 * Файл должен называться route.ts и экспортировать функции GET и/или POST.
 * Next при запросе к /api/benches вызывает соответствующую функцию и отдаёт
 * то, что она вернула (NextResponse.json(...)), как ответ клиенту.
 *
 * ОТКУДА ДАННЫЕ:
 * Мы не храним лавочки в переменных — они в базе Supabase. Клиент supabase
 * (из lib/supabase.ts) умеет .from("benches").select() и .insert(). То есть
 * этот файл — «прослойка» между фронтом и базой: проверяем данные, пишем в БД,
 * преобразуем ответ БД в удобный для фронта формат (например ratings — объект).
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { Bench, BenchCategory, CreateBenchBody } from "@/types/bench";
import { BENCH_CATEGORY_KEYS } from "@/types/bench";

/**
 * GET /api/benches
 * Вызывается когда фронт делает fetch("/api/benches") без указания method (по умолчанию GET).
 * Задача: прочитать из таблицы benches все строки и вернуть их в формате массива Bench[].
 */
export async function GET() {
  try {
    // Запрос к Supabase: таблица "benches", все столбцы (*), сортировка по дате создания (новые первые)
    const { data, error } = await supabase
      .from("benches")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // В БД рейтинги хранятся в отдельных столбцах (accessibility, crowd, view, vibe).
    // Фронт ожидает объект ratings: { accessibility, crowd, view, vibe }.
    // Здесь собираем этот объект и проверяем category (если пришло что-то неизвестное — подставляем "other").
    const benches: Bench[] = (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      lat: row.lat,
      lng: row.lng,
      category: (BENCH_CATEGORY_KEYS.includes(row.category as BenchCategory) ? row.category : "other") as BenchCategory,
      ratings: {
        accessibility: row.accessibility,
        crowd: row.crowd,
        view: row.view,
        vibe: row.vibe,
      },
      created_at: row.created_at,
    }));

    return NextResponse.json(benches);
  } catch (err) {
    console.error("GET /api/benches error:", err);
    return NextResponse.json(
      { error: "Ошибка сервера" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/benches
 * Вызывается когда фронт делает fetch("/api/benches", { method: "POST", body: JSON.stringify({...}) }).
 * Задача: принять данные новой лавочки, проверить их, вставить строку в таблицу benches, вернуть созданную лавочку.
 */
export async function POST(request: Request) {
  try {
    // request.json() — асинхронно читает тело запроса и парсит его как JSON.
    // Тело должно совпадать с типом CreateBenchBody (title, description, lat, lng, category, ratings).
    const body: CreateBenchBody = await request.json();

    const { title, description, lat, lng, category, ratings } = body;

    // Проверка обязательных полей. Если чего-то нет — возвращаем 400 и не трогаем базу.
    if (!title?.trim() || description == null || lat == null || lng == null || !ratings) {
      return NextResponse.json(
        { error: "Нужны: title, description, lat, lng, ratings" },
        { status: 400 }
      );
    }

    // Категория должна быть одной из разрешённых. Иначе подставляем "other" (безопасно для БД).
    const safeCategory = category && BENCH_CATEGORY_KEYS.includes(category as BenchCategory)
      ? (category as BenchCategory)
      : "other";

    // Вставка одной строки в таблицу benches.
    // insert(...) — какие столбцы и значения записать.
    // select(...).single() — «после вставки верни одну созданную строку» (с id и created_at, которые сгенерировала БД).
    const { data, error } = await supabase
      .from("benches")
      .insert({
        title: title.trim(),
        description: String(description),
        lat: Number(lat),
        lng: Number(lng),
        category: safeCategory,
        accessibility: Number(ratings.accessibility) || 0,
        crowd: Number(ratings.crowd) || 0,
        view: Number(ratings.view) || 0,
        vibe: Number(ratings.vibe) || 0,
      })
      .select("id, title, description, lat, lng, category, accessibility, crowd, view, vibe, created_at")
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Собираем объект в формате Bench для ответа клиенту (ratings — объект, как в GET).
    const bench: Bench = {
      id: data.id,
      title: data.title,
      description: data.description,
      lat: data.lat,
      lng: data.lng,
      category: data.category as BenchCategory,
      ratings: {
        accessibility: data.accessibility,
        crowd: data.crowd,
        view: data.view,
        vibe: data.vibe,
      },
      created_at: data.created_at,
    };

    // 201 Created — стандартный код ответа «ресурс создан». В теле отдаём созданную лавочку.
    return NextResponse.json(bench, { status: 201 });
  } catch (err) {
    console.error("POST /api/benches error:", err);
    return NextResponse.json(
      { error: "Ошибка сервера" },
      { status: 500 }
    );
  }
}
