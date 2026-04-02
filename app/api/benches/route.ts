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
 * - POST /api/benches  → создать новую лавочку (нужна авторизация; в БД пишем user_id владельца).
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
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { benchPhotoPublicUrl } from "@/lib/bench-photo-url";
import { effectiveImageContentType, isAllowedBenchPhotoFile } from "@/lib/image-file-utils";
import type { Bench, BenchCategory, BenchPhoto, CreateBenchBody } from "@/types/bench";
import { BENCH_CATEGORY_KEYS } from "@/types/bench";

const MAX_BENCH_PHOTOS = 6;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** Расстояние между двумя точками в км (формула Haversine) */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * GET /api/benches
 * Параметры (query): minCommunityRating (1–5), maxDistanceKm, lat, lng (для фильтра «радиус от меня»).
 * Возвращает лавочки с полем community_rating (средний рейтинг по отзывам).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const minCommunityRating = searchParams.get("minCommunityRating");
    const maxDistanceKm = searchParams.get("maxDistanceKm");
    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");

    const minRating =
      minCommunityRating != null && minCommunityRating !== ""
        ? Math.max(0, Math.min(5, Number(minCommunityRating)))
        : null;
    const maxDist =
      maxDistanceKm != null && maxDistanceKm !== ""
        ? Math.max(0, Number(maxDistanceKm))
        : null;
    const userLat =
      latParam != null && latParam !== "" ? Number(latParam) : null;
    const userLng =
      lngParam != null && lngParam !== "" ? Number(lngParam) : null;

    const { data: benchesData, error: benchesError } = await supabase
      .from("benches")
      .select("*")
      .order("created_at", { ascending: false });

    if (benchesError) {
      console.error("Supabase benches error:", benchesError);
      return NextResponse.json(
        { error: benchesError.message },
        { status: 500 }
      );
    }

    let avgByBench: Record<string, number> = {};
    try {
      const { data: reviewsData } = await supabase
        .from("bench_reviews")
        .select("bench_id, rating");
      if (reviewsData?.length) {
        const sumCount: Record<string, { sum: number; count: number }> = {};
        for (const r of reviewsData) {
          if (!sumCount[r.bench_id]) {
            sumCount[r.bench_id] = { sum: 0, count: 0 };
          }
          sumCount[r.bench_id].sum += Number(r.rating);
          sumCount[r.bench_id].count += 1;
        }
        for (const [bid, v] of Object.entries(sumCount)) {
          avgByBench[bid] = Math.round((v.sum / v.count) * 10) / 10;
        }
      }
    } catch {
      // Таблица bench_reviews может отсутствовать до применения миграции 006
    }

    let photosByBench: Record<string, BenchPhoto[]> = {};
    try {
      const ids = (benchesData ?? []).map((r) => r.id);
      if (ids.length) {
        const { data: photoRows } = await supabase
          .from("bench_photos")
          .select("bench_id, storage_path, sort_order")
          .in("bench_id", ids)
          .order("sort_order", { ascending: true });
        for (const p of photoRows ?? []) {
          const bid = p.bench_id as string;
          if (!photosByBench[bid]) photosByBench[bid] = [];
          photosByBench[bid].push({
            url: benchPhotoPublicUrl(p.storage_path as string),
            sort_order: Number(p.sort_order) || 0,
          });
        }
      }
    } catch {
      // Таблица bench_photos до миграции 011
    }

    let benches: Bench[] = (benchesData ?? []).map((row) => {
      const community_rating = avgByBench[row.id] ?? null;
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        lat: row.lat,
        lng: row.lng,
        category: (BENCH_CATEGORY_KEYS.includes(row.category as BenchCategory)
          ? row.category
          : "other") as BenchCategory,
        ratings: {
          accessibility: row.accessibility,
          crowd: row.crowd,
          view: row.view,
          vibe: row.vibe,
        },
        created_at: row.created_at,
        user_id: row.user_id ?? null,
        created_by_name: row.created_by_name ?? null,
        community_rating: community_rating ?? undefined,
        photos: photosByBench[row.id],
      };
    });

    if (minRating != null) {
      benches = benches.filter(
        (b) => (b.community_rating ?? 0) >= minRating!
      );
    }
    if (
      maxDist != null &&
      userLat != null &&
      userLng != null &&
      !Number.isNaN(userLat) &&
      !Number.isNaN(userLng)
    ) {
      benches = benches.filter(
        (b) =>
          haversineKm(userLat, userLng, b.lat, b.lng) <= maxDist!
      );
    }

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
 * Создаёт лавочку. Требуется авторизация: пользователь берётся из cookies (Supabase Auth).
 * В таблицу записывается user_id владельца; RLS в БД разрешает INSERT только с своим user_id.
 */
export async function POST(request: Request) {
  try {
    const supabaseAuth = await createServerSupabase();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Нужна авторизация. Войдите в аккаунт, чтобы добавить лавочку." },
        { status: 401 }
      );
    }

    let title: string;
    let description: string;
    let lat: number;
    let lng: number;
    let category: string | undefined;
    let ratings: CreateBenchBody["ratings"];
    let photoFiles: File[] = [];

    const ct = request.headers.get("content-type") ?? "";
    if (ct.includes("multipart/form-data")) {
      const form = await request.formData();
      const raw = form.get("data");
      if (typeof raw !== "string") {
        return NextResponse.json({ error: "Нужно поле data (JSON с полями лавочки)" }, { status: 400 });
      }
      let parsed: CreateBenchBody;
      try {
        parsed = JSON.parse(raw) as CreateBenchBody;
      } catch {
        return NextResponse.json({ error: "Поле data — невалидный JSON" }, { status: 400 });
      }
      title = parsed.title;
      description = parsed.description;
      lat = parsed.lat;
      lng = parsed.lng;
      category = parsed.category;
      ratings = parsed.ratings;
      const entries = form.getAll("photos");
      photoFiles = entries.filter((v): v is File => v instanceof File && v.size > 0);
    } else {
      const body = (await request.json()) as CreateBenchBody;
      title = body.title;
      description = body.description;
      lat = body.lat;
      lng = body.lng;
      category = body.category;
      ratings = body.ratings;
    }

    if (!title?.trim() || description == null || lat == null || lng == null || !ratings) {
      return NextResponse.json(
        { error: "Нужны: title, description, lat, lng, ratings" },
        { status: 400 }
      );
    }

    if (photoFiles.length > MAX_BENCH_PHOTOS) {
      return NextResponse.json(
        { error: `Не больше ${MAX_BENCH_PHOTOS} фотографий` },
        { status: 400 }
      );
    }
    for (const f of photoFiles) {
      if (!isAllowedBenchPhotoFile(f, MAX_PHOTO_BYTES)) {
        return NextResponse.json(
          { error: "Допустимы только JPEG, PNG, WebP, GIF до 5 МБ каждый" },
          { status: 400 }
        );
      }
    }

    const safeCategory =
      category && BENCH_CATEGORY_KEYS.includes(category as BenchCategory)
        ? (category as BenchCategory)
        : "other";

    let createdByName: string | null = null;
    const { data: profileRow } = await supabaseAuth
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profileRow?.full_name) createdByName = profileRow.full_name;

    const { data, error } = await supabaseAuth
      .from("benches")
      .insert({
        user_id: user.id,
        created_by_name: createdByName,
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
      .select(
        "id, title, description, lat, lng, category, accessibility, crowd, view, vibe, created_at, user_id, created_by_name"
      )
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const benchPhotos: BenchPhoto[] = [];
    const uploadedPaths: string[] = [];

    if (photoFiles.length > 0) {
      try {
        for (let i = 0; i < photoFiles.length; i++) {
          const file = photoFiles[i];
          const ext = file.name.split(".").pop()?.toLowerCase();
          const safeExt = ext && /^[a-z0-9]{2,5}$/.test(ext) ? ext : "jpg";
          const objectPath = `${data.id}/${globalThis.crypto.randomUUID()}.${safeExt}`;
          const buf = Buffer.from(await file.arrayBuffer());
          const { error: upErr } = await supabaseAuth.storage
            .from("bench-photos")
            .upload(objectPath, buf, {
              contentType: effectiveImageContentType(file),
              upsert: false,
            });
          if (upErr) throw new Error(upErr.message);
          uploadedPaths.push(objectPath);

          const { error: insErr } = await supabaseAuth.from("bench_photos").insert({
            bench_id: data.id,
            storage_path: objectPath,
            sort_order: i,
          });
          if (insErr) throw new Error(insErr.message);

          benchPhotos.push({
            url: benchPhotoPublicUrl(objectPath),
            sort_order: i,
          });
        }
      } catch (uploadErr) {
        if (uploadedPaths.length) {
          await supabaseAuth.storage.from("bench-photos").remove(uploadedPaths);
        }
        await supabaseAuth.from("benches").delete().eq("id", data.id);
        console.error("Bench photo upload error:", uploadErr);
        return NextResponse.json(
          {
            error:
              uploadErr instanceof Error
                ? uploadErr.message
                : "Не удалось загрузить фото. Выполни миграцию 011 в Supabase (bucket bench-photos).",
          },
          { status: 500 }
        );
      }
    }

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
      user_id: data.user_id ?? null,
      created_by_name: data.created_by_name ?? null,
      photos: benchPhotos.length ? benchPhotos : undefined,
    };

    return NextResponse.json(bench, { status: 201 });
  } catch (err) {
    console.error("POST /api/benches error:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
