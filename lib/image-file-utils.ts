/**
 * На части браузеров (особенно Windows) у File.type при выборе с диска бывает пустая строка
 * или application/octet-stream — тогда ориентируемся на расширение имени.
 */

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function guessImageMimeFromName(name: string): string {
  const m = name.toLowerCase().match(/\.(jpe?g|png|gif|webp)$/);
  if (!m) return "";
  const ext = m[1];
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  return "";
}

export function isAllowedBenchPhotoFile(
  f: Pick<File, "type" | "name" | "size">,
  maxBytes: number
): boolean {
  if (f.size <= 0 || f.size > maxBytes) return false;
  const t = (f.type || "").toLowerCase();
  if (ALLOWED_MIME.has(t)) return true;
  if (t === "" || t === "application/octet-stream") {
    const g = guessImageMimeFromName(f.name);
    return ALLOWED_MIME.has(g);
  }
  return false;
}

/** Для загрузки в Storage: корректный Content-Type даже при пустом file.type */
export function effectiveImageContentType(f: Pick<File, "type" | "name">): string {
  const t = (f.type || "").toLowerCase();
  if (ALLOWED_MIME.has(t)) return t === "image/jpg" ? "image/jpeg" : t;
  const g = guessImageMimeFromName(f.name);
  if (g) return g;
  return "image/jpeg";
}
