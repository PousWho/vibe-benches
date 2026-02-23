import MapView from "@/components/MapView";

/**
 * Главная страница — сразу карта. При заходе на сайт пользователь видит карту.
 * ?benchId=xxx — открыть модалку лавочки (из уведомлений в профиле).
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ benchId?: string }>;
}) {
  const { benchId } = await searchParams;
  return (
    <main className="h-[calc(100vh-3.5rem)] w-full">
      <MapView initialBenchId={benchId ?? null} />
    </main>
  );
}
