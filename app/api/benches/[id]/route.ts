/**
 * DELETE /api/benches/[id]
 * Удаляет лавочку. Разрешено только автору (user_id = auth.uid()).
 * RLS в Supabase дополнительно проверяет владельца.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id обязателен" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  }

  const { data: deleted, error } = await supabase
    .from("benches")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    console.error("Delete bench error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!deleted?.length) {
    return NextResponse.json(
      { error: "Лавочка не найдена или вы не её автор" },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true });
}
