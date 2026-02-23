/**
 * Клиент Supabase для браузера (компоненты с "use client").
 * Использует @supabase/ssr: сессия авторизации хранится в cookies и доступна на сервере.
 * Импортируй только в клиентских компонентах.
 */
import { createBrowserClient } from "@supabase/ssr";

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

export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}
