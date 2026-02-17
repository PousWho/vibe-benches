import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-100 font-sans dark:bg-zinc-900">
      <h1 className="text-2xl font-semibold text-zinc-800 dark:text-zinc-100">
        Vibe Benches
      </h1>
      <p className="max-w-md text-center text-zinc-600 dark:text-zinc-400">
        Лавочки с вайбовым видом на карте
      </p>
      <Link
        href="/map"
        className="rounded-xl bg-green-600 px-6 py-3 font-medium text-white transition-colors hover:bg-green-700"
      >
        Открыть карту
      </Link>
    </div>
  );
}
