/**
 * Клиент Supabase для браузера (компоненты с "use client").
 * Сессия в cookies через логику @supabase/ssr (createStorageFromOptions).
 *
 * Важно: используем flowType **implicit**, а не PKCE из createBrowserClient.
 * PKCE для сброса пароля требует code_verifier в cookies того же контекста, где
 * нажали «Отправить ссылку». Встроенные браузеры почты (Gmail, Outlook и т.д.)
 * дают другой контекст → обмен `?code=` падает с **access_denied**.
 * Implicit-ссылки несут токены в hash — открытие из письма работает надёжнее.
 */
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { createStorageFromOptions } from "@supabase/ssr/dist/module/cookies.js";

/** Как в @supabase/ssr/utils (внутренний путь не резолвится в Turbopack). */
function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

let browserClient: SupabaseClient | null = null;

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

export function createClient(): SupabaseClient {
  if (isBrowser() && browserClient) {
    return browserClient;
  }

  const { storage } = createStorageFromOptions({ cookieEncoding: "base64url" }, false);

  const client = createSupabaseClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    global: {
      headers: {
        "X-Client-Info": "supabase-ssr/custom-implicit",
      },
    },
    auth: {
      flowType: "implicit",
      autoRefreshToken: isBrowser(),
      detectSessionInUrl: isBrowser(),
      persistSession: true,
      storage,
    },
  });

  if (isBrowser()) {
    browserClient = client;
  }

  return client;
}
