/**
 * Публичный URL файла в bucket bench-photos (после миграции 011).
 */
export function benchPhotoPublicUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  if (!base) return "";
  const encoded = storagePath
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `${base}/storage/v1/object/public/bench-photos/${encoded}`;
}
