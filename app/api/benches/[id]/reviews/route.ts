/**
 * Отзыв на лавочку (оценка 1–5). Один отзыв на пользователя на лавочку (upsert).
 * GET — свой отзыв для этой лавочки (если есть).
 * POST — поставить/обновить отзыв (body: { rating: 1–5 }).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: benchId } = await params;
  if (!benchId) {
    return NextResponse.json({ error: "id лавочки обязателен" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ myReview: null });
  }

  const { data, error } = await supabase
    .from("bench_reviews")
    .select("rating, created_at")
    .eq("bench_id", benchId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("bench_reviews GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    myReview: data ? { rating: data.rating, created_at: data.created_at } : null,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: benchId } = await params;
  if (!benchId) {
    return NextResponse.json({ error: "id лавочки обязателен" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }

  let body: { rating?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 });
  }

  const rating =
    typeof body.rating === "number"
      ? Math.max(1, Math.min(5, Math.round(body.rating)))
      : null;
  if (rating == null) {
    return NextResponse.json({ error: "Нужно поле rating (1–5)" }, { status: 400 });
  }

  const { error: upsertError } = await supabase
    .from("bench_reviews")
    .upsert(
      { bench_id: benchId, user_id: user.id, rating },
      { onConflict: "bench_id,user_id" }
    );

  if (upsertError) {
    console.error("bench_reviews upsert error:", upsertError);
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  const { data: benchRow } = await supabase
    .from("benches")
    .select("user_id")
    .eq("id", benchId)
    .single();
  const benchOwnerId = benchRow?.user_id ?? null;
  if (benchOwnerId && benchOwnerId !== user.id) {
    await supabase.from("notifications").insert({
      user_id: benchOwnerId,
      type: "review",
      bench_id: benchId,
      from_user_id: user.id,
      comment_id: null,
    });
  }

  return NextResponse.json({ ok: true, rating });
}
