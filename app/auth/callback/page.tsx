"use client";

/**
 * После ссылки из письма (implicit): hash с токенами → клиент поднимает сессию → редирект на /auth/reset-password.
 * PKCE (?code=): middleware обменивает код → /auth/reset-password.
 * Ошибки обмена PKCE: ?error= → показ текста.
 */
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const [implicitChecked, setImplicitChecked] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        router.replace("/auth/reset-password");
      }
    });

    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      const looksLikeRecovery =
        hash.includes("type=recovery") ||
        hash.includes("type%3Drecovery") ||
        (hash.includes("access_token") && hash.toLowerCase().includes("recovery"));

      if (looksLikeRecovery) {
        void supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            router.replace("/auth/reset-password");
          }
          setImplicitChecked(true);
        });
      } else {
        setImplicitChecked(true);
      }
    } else {
      setImplicitChecked(true);
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  if (errorParam) {
    const humanHint =
      errorParam === "access_denied"
        ? "Частая причина — ссылку открыли во встроенном браузере почты (Gmail, Outlook и т.д.), а не в Chrome/Safari. Нажмите «Открыть в браузере» или скопируйте ссылку. После обновления приложения запросите новую ссылку «Забыли пароль»."
        : "Запросите новую ссылку для сброса пароля. Если использовали PKCE-ссылку с ?code=, открывайте её в том же браузере, где нажимали «Отправить ссылку».";

    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <p className="font-medium text-red-600 dark:text-red-400">{errorParam}</p>
        {errorDescription && (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{errorDescription}</p>
        )}
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">{humanHint}</p>
        <Link href="/" className="mt-4 inline-block text-green-600 hover:underline">
          На главную
        </Link>
      </div>
    );
  }

  if (!implicitChecked) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center text-zinc-500">Загрузка…</div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 text-center">
      <p className="text-zinc-600 dark:text-zinc-400">
        Перейдите по ссылке из письма для сброса пароля или вернитесь на главную.
      </p>
      <Link href="/" className="mt-4 inline-block text-green-600 hover:underline">
        На главную
      </Link>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-12 text-center text-zinc-500">Загрузка…</div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
