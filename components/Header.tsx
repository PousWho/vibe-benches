"use client";

/**
 * Хедер: название, кнопка «Войти» (или иконка профиля при авторизации).
 * «Войти» открывает общую модалку авторизации из AuthContext.
 */
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function Header() {
  const { user, setShowAuthModal } = useAuth();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/90 px-4 backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/90">
      <Link
        href="/"
        className="text-lg font-semibold text-zinc-800 dark:text-zinc-100"
      >
        Vibe Benches
      </Link>
      <div className="flex items-center gap-2">
        {user ? (
          <Link
            href="/profile"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-300 hover:text-zinc-900 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600 dark:hover:text-white"
            title="Профиль"
            aria-label="Профиль"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setShowAuthModal(true)}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Войти
          </button>
        )}
      </div>
    </header>
  );
}
