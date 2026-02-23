"use client";

/**
 * Страница профиля: данные текущего пользователя, счётчик лавочек, редактирование
 * (имя, страна, дата рождения). Почту и пароль не редактируем.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import { useToast } from "@/contexts/ToastContext";
import type { User } from "@supabase/supabase-js";
import type { Notification } from "@/types/bench";

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  country: string | null;
  date_of_birth: string | null;
  created_at: string;
  updated_at: string;
};

const inputClass =
  "rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 w-full";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [benchesCount, setBenchesCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editDateOfBirth, setEditDateOfBirth] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u ?? null);
      if (!u) {
        setLoading(false);
        return;
      }
      supabase
        .from("profiles")
        .select("user_id, full_name, country, date_of_birth, created_at, updated_at")
        .eq("user_id", u.id)
        .maybeSingle()
        .then(({ data }) => {
          setProfile(data ?? null);
          if (data) {
            setEditName(data.full_name ?? "");
            setEditCountry(data.country ?? "");
            setEditDateOfBirth(data.date_of_birth ?? "");
          }
        });

      // Один запрос COUNT в БД по user_id (без загрузки строк). Имя не участвует.
      supabase
        .from("benches")
        .select("*", { count: "exact", head: true })
        .eq("user_id", u.id)
        .then(({ count }) => {
          setBenchesCount(count ?? 0);
        });

      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    setNotificationsLoading(true);
    fetch("/api/notifications", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setNotifications(Array.isArray(data) ? data : []))
      .catch(() => setNotifications([]))
      .finally(() => setNotificationsLoading(false));
  }, [user?.id]);

  const markNotificationRead = (id: string) => {
    fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
      method: "PATCH",
      credentials: "include",
    }).then(() => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
    });
  };

  const startEdit = () => {
    setEditName(profile?.full_name ?? "");
    setEditCountry(profile?.country ?? "");
    setEditDateOfBirth(profile?.date_of_birth ?? "");
    setEditing(true);
    setSaveError(null);
  };

  const cancelEdit = () => {
    setEditing(false);
    setSaveError(null);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaveLoading(true);
    setSaveError(null);
    const supabase = createClient();
    // upsert: создаёт строку профиля, если её ещё нет (иначе только обновляет)
    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          full_name: editName.trim() || null,
          country: editCountry.trim() || null,
          date_of_birth: editDateOfBirth.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (error) {
      setSaveError(error.message);
      setSaveLoading(false);
      return;
    }
    setProfile({
      ...(profile ?? ({} as ProfileRow)),
      full_name: editName.trim() || null,
      country: editCountry.trim() || null,
      date_of_birth: editDateOfBirth.trim() || null,
    });
    setEditing(false);
    setSaveLoading(false);
    showToast("Профиль сохранён", "success");
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-zinc-500">Загрузка…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <h1 className="mb-4 text-2xl font-semibold text-zinc-800 dark:text-zinc-100">
          Профиль
        </h1>
        <p className="mb-6 text-zinc-600 dark:text-zinc-400">
          Войдите в аккаунт, чтобы видеть свой профиль.
        </p>
        <Link
          href="/"
          className="inline-block rounded-xl bg-green-600 px-6 py-3 font-medium text-white hover:bg-green-700"
        >
          На главную
        </Link>
      </div>
    );
  }

  const countryName =
    profile?.country &&
    COUNTRY_OPTIONS.find((c) => c.code === profile.country)?.name;

  const formatDate = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-800 dark:text-zinc-100">
        Профиль
      </h1>
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/50">
        {!editing ? (
          <>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Email
                </dt>
                <dd className="mt-0.5 text-zinc-900 dark:text-zinc-100">
                  {user.email}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Имя
                </dt>
                <dd className="mt-0.5 text-zinc-900 dark:text-zinc-100">
                  {profile?.full_name || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Страна
                </dt>
                <dd className="mt-0.5 text-zinc-900 dark:text-zinc-100">
                  {countryName || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Дата рождения
                </dt>
                <dd className="mt-0.5 text-zinc-900 dark:text-zinc-100">
                  {formatDate(profile?.date_of_birth ?? null) || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Добавлено лавочек
                </dt>
                <dd className="mt-0.5 text-zinc-900 dark:text-zinc-100">
                  {benchesCount}
                </dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-col gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
              <button
                type="button"
                onClick={startEdit}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Редактировать профиль
              </button>
              <Link
                href="/"
                className="text-center text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
              >
                ← На карту
              </Link>
            </div>
          </>
        ) : (
          <form onSubmit={saveProfile} className="space-y-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Почту и пароль изменить здесь нельзя.
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Имя
              </label>
              <input
                type="text"
                className={inputClass}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Как к вам обращаться"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Страна
              </label>
              <select
                className={inputClass}
                value={editCountry}
                onChange={(e) => setEditCountry(e.target.value)}
              >
                <option value="">Не указана</option>
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Дата рождения
              </label>
              <input
                type="date"
                className={inputClass}
                value={editDateOfBirth}
                onChange={(e) => setEditDateOfBirth(e.target.value)}
              />
            </div>
            {saveError && (
              <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saveLoading}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saveLoading ? "Сохранение…" : "Сохранить"}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Отмена
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Уведомления: комментарии и отзывы к лавочкам пользователя */}
      {user && (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/50">
          <h2 className="mb-3 text-lg font-semibold text-zinc-800 dark:text-zinc-100">
            Уведомления
          </h2>
          {notificationsLoading ? (
            <p className="text-sm text-zinc-500">Загрузка…</p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Пока нет уведомлений
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    n.read_at
                      ? "border-zinc-200 bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-800/30"
                      : "border-green-200 bg-green-50/50 dark:border-green-900/30 dark:bg-green-900/10"
                  }`}
                >
                  <Link
                    href={`/?benchId=${encodeURIComponent(n.bench_id)}`}
                    onClick={() => markNotificationRead(n.id)}
                    className="block hover:opacity-90"
                  >
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      {n.type === "comment"
                        ? "Новый комментарий"
                        : "Новый отзыв"}
                    </span>
                    {n.from_user_name && (
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {" "}
                        от {n.from_user_name}
                      </span>
                    )}
                    {n.bench_title && (
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {" "}
                        к лавочке «{n.bench_title}»
                      </span>
                    )}
                    <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(n.created_at).toLocaleString("ru-RU", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
