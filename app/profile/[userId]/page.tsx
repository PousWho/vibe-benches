"use client";

/**
 * Публичная страница профиля пользователя по user_id (из ссылки в попапе лавочки).
 * Только чтение: имя, страна, дата рождения, количество добавленных лавочек.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { COUNTRY_OPTIONS } from "@/lib/countries";

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  country: string | null;
  date_of_birth: string | null;
  created_at: string;
  updated_at: string;
};

export default function ProfileUserIdPage() {
  const params = useParams();
  const userId = typeof params.userId === "string" ? params.userId : null;
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [benchesCount, setBenchesCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    const supabase = createClient();
    Promise.all([
      supabase
        .from("profiles")
        .select("user_id, full_name, country, date_of_birth, created_at, updated_at")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("benches")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
    ]).then(([profileRes, benchesRes]) => {
      if (profileRes.error) {
        setLoading(false);
        return;
      }
      if (!profileRes.data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setProfile(profileRes.data);
      setBenchesCount(benchesRes.count ?? 0);
      setLoading(false);
    });
  }, [userId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-zinc-500">Загрузка…</p>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <h1 className="mb-4 text-2xl font-semibold text-zinc-800 dark:text-zinc-100">
          Профиль не найден
        </h1>
        <p className="mb-6 text-zinc-600 dark:text-zinc-400">
          Такого пользователя нет или профиль скрыт.
        </p>
        <Link
          href="/"
          className="inline-block rounded-xl bg-green-600 px-6 py-3 font-medium text-white hover:bg-green-700"
        >
          На карту
        </Link>
      </div>
    );
  }

  const countryName =
    profile.country &&
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
        Профиль пользователя
      </h1>
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/50">
        <dl className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Имя
            </dt>
            <dd className="mt-0.5 text-zinc-900 dark:text-zinc-100">
              {profile.full_name || "—"}
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
              {formatDate(profile.date_of_birth ?? null) || "—"}
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
        <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-700">
          <Link
            href="/"
            className="text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
          >
            ← На карту
          </Link>
        </div>
      </div>
    </div>
  );
}
