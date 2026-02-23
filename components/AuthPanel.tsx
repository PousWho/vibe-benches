"use client";

/**
 * Панель авторизации: вход, регистрация (имя, страна, дата рождения), выход.
 * Сессия в cookies (@supabase/ssr). При регистрации создаётся запись в public.profiles.
 */
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import { useToast } from "@/contexts/ToastContext";

type AuthMode = "login" | "register" | "forgot";

type AuthPanelProps = {
  userEmail?: string | null;
  onSignOut: () => void;
  onClose?: () => void;
  asModal?: boolean;
};

const inputClass =
  "rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 w-full";

export default function AuthPanel({
  userEmail,
  onSignOut,
  onClose,
  asModal = false,
}: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const { showToast } = useToast();

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage({ type: "ok", text: "Вход выполнен" });
        showToast("Вход выполнен", "success");
        onClose?.();
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback`,
        });
        if (error) throw error;
        setMessage({
          type: "ok",
          text: "Проверьте почту — ссылка для сброса пароля отправлена",
        });
        showToast("Проверьте почту — ссылка для сброса пароля отправлена", "success");
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          const { error: profileError } = await supabase.from("profiles").insert({
            user_id: data.user.id,
            full_name: fullName.trim() || null,
            country: country.trim() || null,
            date_of_birth: dateOfBirth.trim() || null,
          });
          if (profileError) console.error("Profile insert:", profileError);
        }
        setMessage({
          type: "ok",
          text: "Проверьте почту — ссылка для подтверждения отправлена",
        });
        showToast("Проверьте почту — ссылка для подтверждения отправлена", "success");
      }
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : "Ошибка";
      setMessage({ type: "error", text });
      showToast(text, "error");
    } finally {
      setLoading(false);
    }
  };

  if (userEmail) {
    return (
      <div className="rounded-xl bg-white/95 p-4 shadow-lg dark:bg-zinc-800/95">
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
          Вы вошли как <strong className="text-zinc-900 dark:text-zinc-100">{userEmail}</strong>
        </p>
        <button
          type="button"
          onClick={() => supabase.auth.signOut().then(onSignOut)}
          className="w-full rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          Выйти
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="mt-2 w-full rounded-lg py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400"
          >
            Закрыть
          </button>
        )}
      </div>
    );
  }

  const form = (
    <div className="rounded-xl bg-white p-5 shadow-lg dark:bg-zinc-800">
      <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {mode === "login" ? "Вход" : mode === "forgot" ? "Восстановление пароля" : "Регистрация"}
      </h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {mode === "register" && (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Имя *</span>
              <input
                type="text"
                placeholder="Как к вам обращаться"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Страна (необязательно)</span>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={inputClass}
              >
                <option value="">— не выбрано —</option>
                {COUNTRY_OPTIONS.map(({ code, name }) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Дата рождения</span>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className={inputClass}
              />
            </label>
          </>
        )}
        <label className="flex flex-col gap-1">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputClass}
          />
        </label>
        {mode !== "forgot" && (
          <label className="flex flex-col gap-1">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Пароль</span>
            <input
              type="password"
              placeholder={mode === "register" ? "минимум 6 символов" : ""}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={mode !== "forgot"}
              minLength={mode === "register" ? 6 : undefined}
              className={inputClass}
            />
          </label>
        )}
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
          {loading
            ? "..."
            : mode === "login"
              ? "Войти"
              : mode === "forgot"
                ? "Отправить ссылку для сброса"
                : "Зарегистрироваться"}
        </button>
      </form>
      {mode === "forgot" ? (
        <button
          type="button"
          onClick={() => setMode("login")}
          className="mt-3 w-full text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400"
        >
          Назад к входу
        </button>
      ) : (
        <div className="mt-3 flex flex-col gap-1">
          {mode === "login" && (
            <button
              type="button"
              onClick={() => setMode("forgot")}
              className="w-full text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400"
            >
              Забыли пароль?
            </button>
          )}
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="w-full text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400"
          >
            {mode === "login" ? "Нет аккаунта? Регистрация" : "Есть аккаунт? Войти"}
          </button>
        </div>
      )}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400"
        >
          Закрыть
        </button>
      )}
    </div>
  );

  if (asModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-sm">{form}</div>
      </div>
    );
  }

  return form;
}
