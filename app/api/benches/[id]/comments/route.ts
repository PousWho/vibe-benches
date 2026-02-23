/**
 * Комментарии к лавочке (и ответы на комментарии).
 * GET — список с parent_id и именами авторов.
 * POST — добавить комментарий или ответ (body: { body: string, parent_id?: string }).
 * При создании комментария/ответа создаётся уведомление для владельца лавочки и автора родительского комментария.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { BenchComment } from "@/types/bench";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: benchId } = await params;
  if (!benchId) {
    return NextResponse.json({ error: "id лавочки обязателен" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bench_comments")
    .select("id, bench_id, user_id, body, created_at, parent_id")
    .eq("bench_id", benchId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("bench_comments GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = [...new Set((data ?? []).map((c) => c.user_id))];
  let names: Record<string, string | null> = {};
  if (userIds.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);
    for (const p of profiles ?? []) {
      names[p.user_id] = p.full_name ?? null;
    }
  }

  const comments: BenchComment[] = (data ?? []).map((c) => ({
    id: c.id,
    bench_id: c.bench_id,
    user_id: c.user_id,
    body: c.body,
    created_at: c.created_at,
    author_name: names[c.user_id] ?? null,
    parent_id: c.parent_id ?? null,
  }));

  return NextResponse.json(comments);
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

  let body: { body?: string; parent_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 });
  }

  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Нужно поле body (текст комментария)" }, { status: 400 });
  }

  const parentId =
    typeof body.parent_id === "string" && body.parent_id.trim()
      ? body.parent_id.trim()
      : null;

  const { data: inserted, error } = await supabase
    .from("bench_comments")
    .insert({
      bench_id: benchId,
      user_id: user.id,
      body: text,
      parent_id: parentId,
    })
    .select("id, bench_id, user_id, body, created_at, parent_id")
    .single();

  if (error) {
    console.error("bench_comments insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const comment: BenchComment = {
    id: inserted.id,
    bench_id: inserted.bench_id,
    user_id: inserted.user_id,
    body: inserted.body,
    created_at: inserted.created_at,
    author_name: profile?.full_name ?? null,
    parent_id: inserted.parent_id ?? null,
  };

  // Уведомления: владельцу лавочки (если не сам написал) и автору родительского комментария при ответе
  const { data: benchRow } = await supabase
    .from("benches")
    .select("user_id")
    .eq("id", benchId)
    .single();

  const benchOwnerId = benchRow?.user_id ?? null;
  if (benchOwnerId && benchOwnerId !== user.id) {
    await supabase.from("notifications").insert({
      user_id: benchOwnerId,
      type: "comment",
      bench_id: benchId,
      from_user_id: user.id,
      comment_id: inserted.id,
    });
  }

  if (parentId) {
    const { data: parentRow } = await supabase
      .from("bench_comments")
      .select("user_id")
      .eq("id", parentId)
      .single();
    const parentAuthorId = parentRow?.user_id ?? null;
    if (parentAuthorId && parentAuthorId !== user.id && parentAuthorId !== benchOwnerId) {
      await supabase.from("notifications").insert({
        user_id: parentAuthorId,
        type: "comment",
        bench_id: benchId,
        from_user_id: user.id,
        comment_id: inserted.id,
      });
    }
  }

  return NextResponse.json(comment, { status: 201 });
}
