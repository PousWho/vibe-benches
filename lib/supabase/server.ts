/**
 * Клиент Supabase для сервера (API routes, Server Components) с доступом к сессии.
 * Читает cookies — по ним восстанавливается пользователь (auth.getUser()).
 * Используй в POST /api/benches и везде, где нужно знать текущего пользователя.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL не задан");
  return url;
}

function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY не задан");
  return key;
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // В Route Handler set может быть недоступен в некоторых контекстах — игнорируем.
        }
      },
    },
  });
}
