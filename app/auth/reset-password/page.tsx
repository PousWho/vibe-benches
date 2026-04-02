"use client";

/**
 * Форма нового пароля после перехода по ссылке из письма.
 * PKCE: middleware обменивает ?code на сессию и редиректит сюда.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 w-full";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session?.user);
      setReady(true);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setMessage({ type: "error", text: "Пароли не совпадают" });
      return;
    }
    if (password.length < 6) {
      setMessage({ type: "error", text: "Пароль не менее 6 символов" });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage({ type: "ok", text: "Пароль изменён. Можно войти с новым паролем." });
      setDone(true);
      setTimeout(() => router.push("/"), 2000);
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Ошибка при смене пароля",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="mx-auto max-w-sm px-4 py-12 text-center text-zinc-500">Загрузка…</div>
    );
  }

  if (!hasSession) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <h1 className="mb-4 text-xl font-semibold text-zinc-800 dark:text-zinc-100">
          Сброс пароля
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Сессия сброса не найдена. Запросите новую ссылку («Забыли пароль») и откройте письмо в{" "}
          <strong>том же браузере</strong>, где отправляли запрос — иначе защита PKCE не сработает.
        </p>
        <Link href="/" className="mt-6 inline-block text-green-600 hover:underline">
          На главную
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-4 text-xl font-semibold text-zinc-800 dark:text-zinc-100">
        Новый пароль
      </h1>
      {done ? (
        <p className="text-green-600 dark:text-green-400">{message?.text}</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Новый пароль</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className={inputClass}
              autoComplete="new-password"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Повторите пароль</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              className={inputClass}
              autoComplete="new-password"
            />
          </label>
          {message && (
            <p
              className={`text-sm ${message.type === "error" ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}
            >
              {message.text}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-green-600 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "..." : "Сохранить пароль"}
          </button>
        </form>
      )}
      <Link href="/" className="mt-4 block text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400">
        На главную
      </Link>
    </div>
  );
}
