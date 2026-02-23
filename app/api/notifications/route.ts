/**
 * GET /api/notifications — список уведомлений текущего пользователя (для раздела в профиле).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Notification } from "@/types/bench";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }

  const { data: rows, error } = await supabase
    .from("notifications")
    .select("id, user_id, type, bench_id, from_user_id, comment_id, created_at, read_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("notifications GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const benchIds = [...new Set((rows ?? []).map((r) => r.bench_id))];
  const fromIds = [...new Set((rows ?? []).map((r) => r.from_user_id).filter(Boolean))] as string[];

  let benchTitles: Record<string, string> = {};
  let fromNames: Record<string, string | null> = {};

  if (benchIds.length) {
    const { data: benches } = await supabase
      .from("benches")
      .select("id, title")
      .in("id", benchIds);
    for (const b of benches ?? []) {
      benchTitles[b.id] = b.title;
    }
  }
  if (fromIds.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", fromIds);
    for (const p of profiles ?? []) {
      fromNames[p.user_id] = p.full_name ?? null;
    }
  }

  const notifications: Notification[] = (rows ?? []).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    type: r.type as "comment" | "review",
    bench_id: r.bench_id,
    from_user_id: r.from_user_id ?? null,
    comment_id: r.comment_id ?? null,
    created_at: r.created_at,
    read_at: r.read_at ?? null,
    bench_title: benchTitles[r.bench_id] ?? null,
    from_user_name: r.from_user_id ? (fromNames[r.from_user_id] ?? null) : null,
  }));

  return NextResponse.json(notifications);
}
