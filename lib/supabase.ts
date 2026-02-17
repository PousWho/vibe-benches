import { createClient } from "@supabase/supabase-js";

/**
 * Клиент Supabase для серверного кода (API routes, Server Components).
 * Использует переменные окружения — они доступны только на сервере,
 * поэтому этот файл не должен импортироваться в "use client" компонентах.
 */
function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL не задан в .env.local");
  return url;
}

function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY не задан в .env.local");
  return key;
}

export const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());
