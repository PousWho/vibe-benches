"use client";

/**
 * Модалка просмотра лавочки: оценка сообщества, описание, рейтинги, отзыв (свой), комментарии и ответы.
 */
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import type { Bench, BenchComment } from "@/types/bench";
import { BENCH_CATEGORY_LABELS } from "@/types/bench";
import { useToast } from "@/contexts/ToastContext";

/** Собирает плоский список в дерево по parent_id */
function buildCommentTree(flat: BenchComment[]): BenchComment[] {
  const byId = new Map<string, BenchComment & { replies: BenchComment[] }>();
  for (const c of flat) {
    byId.set(c.id, { ...c, replies: [] });
  }
  const roots: (BenchComment & { replies: BenchComment[] })[] = [];
  for (const c of flat) {
    const node = byId.get(c.id)!;
    if (c.parent_id) {
      const parent = byId.get(c.parent_id);
      if (parent) parent.replies.push(node);
      else roots.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function authorDisplayName(c: BenchComment): string {
  const name = (c.author_name ?? "").trim();
  return name || "Пользователь";
}

/** Все ответы под комментарием в один плоский список (в порядке дерева) */
function flattenReplies(nodes: (BenchComment & { replies?: BenchComment[] })[]): BenchComment[] {
  return nodes.flatMap((n) => [n, ...flattenReplies(n.replies ?? [])]);
}

const INITIAL_REPLIES_VISIBLE = 3;

/** Один комментарий верхнего уровня: карточка, кнопка «Ответы (N)», при развороте — плоский список ответов с одним отступом */
function TopLevelComment({
  comment,
  currentUserId,
  authorDisplayName: getAuthorName,
  replyToId,
  replyText,
  setReplyToId,
  setReplyText,
  expandedReplies,
  setExpandedReplies,
  visibleReplyCount,
  setVisibleReplyCount,
  onReply,
  commentLoading,
}: {
  comment: BenchComment & { replies?: BenchComment[] };
  currentUserId: string | null;
  authorDisplayName: (c: BenchComment) => string;
  replyToId: string | null;
  replyText: string;
  setReplyToId: (id: string | null) => void;
  setReplyText: (t: string) => void;
  expandedReplies: Set<string>;
  setExpandedReplies: React.Dispatch<React.SetStateAction<Set<string>>>;
  visibleReplyCount: Record<string, number>;
  setVisibleReplyCount: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  onReply: (parentId: string, text: string) => void;
  commentLoading: boolean;
}) {
  const allReplies = useMemo(
    () => flattenReplies(comment.replies ?? []),
    [comment.replies]
  );
  const totalReplies = allReplies.length;
  const isExpanded = expandedReplies.has(comment.id);
  const visibleCount = visibleReplyCount[comment.id] ?? INITIAL_REPLIES_VISIBLE;
  const shownReplies = allReplies.slice(0, visibleCount);
  const hasMore = totalReplies > visibleCount;

  const handleToggleReplies = () => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (isExpanded) {
        next.delete(comment.id);
      } else {
        next.add(comment.id);
        setVisibleReplyCount((v) => ({ ...v, [comment.id]: Math.min(INITIAL_REPLIES_VISIBLE, totalReplies) }));
      }
      return next;
    });
  };

  const handleShowMore = () => {
    setVisibleReplyCount((v) => ({ ...v, [comment.id]: totalReplies }));
  };

  return (
    <li>
      <div className="rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800/50">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">
          {getAuthorName(comment)}
        </span>
        <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
          {new Date(comment.created_at).toLocaleString("ru-RU", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <p className="mt-1 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
          {comment.body}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {currentUserId && (
            <button
              type="button"
              onClick={() => {
                setReplyToId(replyToId === comment.id ? null : comment.id);
                setReplyText("");
              }}
              className="cursor-pointer text-xs font-medium text-green-600 hover:underline dark:text-green-400"
            >
              {replyToId === comment.id ? "Отмена" : "Ответить"}
            </button>
          )}
          {totalReplies > 0 && (
            <button
              type="button"
              onClick={handleToggleReplies}
              className="cursor-pointer text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
            >
              Ответы ({totalReplies})
            </button>
          )}
        </div>
      </div>
      {replyToId === comment.id && currentUserId && (
        <div className="mt-2 ml-0 flex flex-col gap-1">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Ответ..."
            rows={2}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            disabled={commentLoading}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onReply(comment.id, replyText)}
              disabled={commentLoading || !replyText.trim()}
              className="cursor-pointer rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {commentLoading ? "…" : "Отправить"}
            </button>
            <button
              type="button"
              onClick={() => { setReplyToId(null); setReplyText(""); }}
              className="cursor-pointer text-xs text-zinc-500 hover:underline"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
      {isExpanded && totalReplies > 0 && (
        <div className="ml-4 mt-2 border-l-2 border-zinc-200 pl-3 dark:border-zinc-600">
          <ul className="flex flex-col gap-2">
            {shownReplies.map((r) => (
              <li key={r.id} className="rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800/50">
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {getAuthorName(r)}
                </span>
                <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {new Date(r.created_at).toLocaleString("ru-RU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <p className="mt-1 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                  {r.body}
                </p>
                {currentUserId && (
                  <button
                    type="button"
                    onClick={() => {
                      setReplyToId(replyToId === r.id ? null : r.id);
                      setReplyText("");
                    }}
                    className="mt-1.5 cursor-pointer text-xs font-medium text-green-600 hover:underline dark:text-green-400"
                  >
                    {replyToId === r.id ? "Отмена" : "Ответить"}
                  </button>
                )}
                {replyToId === r.id && currentUserId && (
                  <div className="mt-2 flex flex-col gap-1">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Ответ..."
                      rows={2}
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                      disabled={commentLoading}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onReply(r.id, replyText)}
                        disabled={commentLoading || !replyText.trim()}
                        className="cursor-pointer rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {commentLoading ? "…" : "Отправить"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setReplyToId(null); setReplyText(""); }}
                        className="cursor-pointer text-xs text-zinc-500 hover:underline"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {hasMore && (
            <button
              type="button"
              onClick={handleShowMore}
              className="mt-2 cursor-pointer text-xs font-medium text-green-600 hover:underline dark:text-green-400"
            >
              Показать больше
            </button>
          )}
        </div>
      )}
    </li>
  );
}

const STAR_FILLED = "#0d9488";
const STAR_EMPTY = "#9ca3af";

function StarsRow({ value }: { value: number }) {
  const v = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <div className="flex w-full items-center justify-between gap-1">
      {([1, 2, 3, 4, 5] as const).map((n) => (
        <span
          key={n}
          className="flex flex-1 justify-center text-[1.75rem] leading-none"
          style={{ color: n <= v ? STAR_FILLED : STAR_EMPTY }}
          aria-hidden
        >
          ★
        </span>
      ))}
    </div>
  );
}

type BenchDetailModalProps = {
  bench: Bench;
  currentUserId: string | null;
  onClose: () => void;
  onDeleted: (benchId: string) => void;
  /** После отправки отзыва — родитель обновляет список и bench (community_rating) */
  onReviewSubmitted?: () => void;
};

export default function BenchDetailModal({
  bench,
  currentUserId,
  onClose,
  onDeleted,
  onReviewSubmitted,
}: BenchDetailModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [myReviewRating, setMyReviewRating] = useState<number | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [comments, setComments] = useState<BenchComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [visibleReplyCount, setVisibleReplyCount] = useState<Record<string, number>>({});
  const { showToast } = useToast();
  const categoryLabel = BENCH_CATEGORY_LABELS[bench.category] ?? "Другое";
  const isOwnBench = Boolean(currentUserId && bench.user_id && bench.user_id === currentUserId);

  useEffect(() => {
    fetch(`/api/benches/${encodeURIComponent(bench.id)}/reviews`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setMyReviewRating(data?.myReview?.rating ?? null))
      .catch(() => {});
  }, [bench.id]);

  useEffect(() => {
    fetch(`/api/benches/${encodeURIComponent(bench.id)}/comments`)
      .then((r) => r.json())
      .then((data) => setComments(Array.isArray(data) ? data : []))
      .catch(() => setComments([]));
  }, [bench.id]);

  const submitReview = (rating: number) => {
    if (!currentUserId || reviewLoading) return;
    setReviewLoading(true);
    fetch(`/api/benches/${encodeURIComponent(bench.id)}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ rating }),
    })
      .then((r) => {
        if (r.ok) {
          setMyReviewRating(rating);
          showToast("Отзыв сохранён", "success");
          onReviewSubmitted?.();
        } else return r.json().then((b) => Promise.reject(b?.error ?? "Ошибка"));
      })
      .catch((err) => showToast(String(err), "error"))
      .finally(() => setReviewLoading(false));
  };

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || commentLoading || !currentUserId) return;
    setCommentLoading(true);
    fetch(`/api/benches/${encodeURIComponent(bench.id)}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ body: text }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((b) => Promise.reject(b?.error ?? "Ошибка"));
        return r.json();
      })
      .then((newComment) => {
        setComments((prev) => [...prev, newComment]);
        setCommentText("");
        showToast("Комментарий добавлен", "success");
      })
      .catch((err) => showToast(String(err), "error"))
      .finally(() => setCommentLoading(false));
  };

  const submitReply = (parentId: string, text: string) => {
    if (!text.trim() || commentLoading || !currentUserId) return;
    setCommentLoading(true);
    fetch(`/api/benches/${encodeURIComponent(bench.id)}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ body: text.trim(), parent_id: parentId }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((b) => Promise.reject(b?.error ?? "Ошибка"));
        return r.json();
      })
      .then((newComment) => {
        setComments((prev) => [...prev, newComment]);
        setReplyToId(null);
        setReplyText("");
        showToast("Ответ добавлен", "success");
      })
      .catch((err) => showToast(String(err), "error"))
      .finally(() => setCommentLoading(false));
  };

  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);
  const totalCommentsCount = comments.length;

  const handleDelete = () => {
    if (isDeleting || !isOwnBench) return;
    setIsDeleting(true);
    fetch(`/api/benches/${encodeURIComponent(bench.id)}`, {
      method: "DELETE",
      credentials: "include",
    })
      .then((res) => {
        if (res.ok) {
          onDeleted(bench.id);
          onClose();
          showToast("Лавочка удалена", "success");
        } else {
          res.json().then((body) => showToast(body?.error ?? "Ошибка удаления", "error"));
        }
      })
      .catch(() => showToast("Ошибка сети", "error"))
      .finally(() => setIsDeleting(false));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bench-modal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка: заголовок + кнопка закрыть */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-700 sm:px-5 sm:py-4">
          <h2
            id="bench-modal-title"
            className="min-w-0 flex-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100 sm:text-xl"
          >
            {bench.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 cursor-pointer rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
            aria-label="Закрыть"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Прокручиваемый контент */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
          {/* Оценка сообщества — сверху карточки */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {bench.community_rating != null ? (
              <>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Оценка сообщества:
                </span>
                <div className="flex w-32 items-center justify-between gap-1">
                  <StarsRow value={bench.community_rating} />
                </div>
                <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                  {bench.community_rating.toFixed(1)}
                </span>
              </>
            ) : (
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                Пока нет оценок сообщества
              </span>
            )}
          </div>

          {/* Свой отзыв (оценка 1–5) */}
          {currentUserId && (
            <div className="mb-4">
              <p className="mb-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {myReviewRating != null ? "Ваш отзыв (можно изменить):" : "Оставить отзыв:"}
              </p>
              <div className="flex w-full items-center justify-between gap-1">
                {([1, 2, 3, 4, 5] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => submitReview(n)}
                    disabled={reviewLoading}
                    className="flex flex-1 cursor-pointer justify-center text-[1.75rem] leading-none transition-transform hover:scale-110 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ color: n <= (myReviewRating ?? 0) ? STAR_FILLED : STAR_EMPTY }}
                    title={`${n} из 5`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">{categoryLabel}</p>
          {bench.description ? (
            <p className="mb-4 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
              {bench.description}
            </p>
          ) : (
            <p className="mb-4 text-zinc-500 dark:text-zinc-400">Без описания</p>
          )}

          <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Оценки</p>
          <div className="flex flex-col gap-4">
            <div className="flex w-full flex-col gap-1.5">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">🚶 Доступность</span>
              <StarsRow value={bench.ratings.accessibility} />
            </div>
            <div className="flex w-full flex-col gap-1.5">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">👥 Людность</span>
              <StarsRow value={bench.ratings.crowd} />
            </div>
            <div className="flex w-full flex-col gap-1.5">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">🌄 Вид</span>
              <StarsRow value={bench.ratings.view} />
            </div>
            <div className="flex w-full flex-col gap-1.5">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">✨ Вайб</span>
              <StarsRow value={bench.ratings.vibe} />
            </div>
          </div>

          {(bench.user_id || bench.created_by_name) && (
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
              Добавил:{" "}
              {bench.user_id ? (
                <Link
                  href={`/profile/${encodeURIComponent(bench.user_id)}`}
                  className="font-medium text-green-600 hover:underline dark:text-green-400"
                  onClick={onClose}
                >
                  {(bench.created_by_name ?? "").trim() || "Профиль"}
                </Link>
              ) : (
                <span>{(bench.created_by_name ?? "").trim() || "—"}</span>
              )}
            </p>
          )}

          {/* Сначала форма «Написать комментарий», ниже — список комментариев */}
          <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-700">
            <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Комментарии ({totalCommentsCount})
            </p>
            {currentUserId ? (
              <form onSubmit={submitComment} className="mb-4 flex flex-col gap-2">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Написать комментарий..."
                  rows={2}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  disabled={commentLoading}
                />
                <button
                  type="submit"
                  disabled={commentLoading || !commentText.trim()}
                  className="cursor-pointer self-end rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {commentLoading ? "Отправка…" : "Отправить"}
                </button>
              </form>
            ) : (
              <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                Войдите, чтобы оставить комментарий.
              </p>
            )}
            <ul className="flex max-h-[40vh] flex-col gap-2 overflow-y-auto pr-1">
              {commentTree.map((c) => (
                <TopLevelComment
                  key={c.id}
                  comment={c}
                  currentUserId={currentUserId}
                  authorDisplayName={authorDisplayName}
                  replyToId={replyToId}
                  replyText={replyText}
                  setReplyToId={setReplyToId}
                  setReplyText={setReplyText}
                  expandedReplies={expandedReplies}
                  setExpandedReplies={setExpandedReplies}
                  visibleReplyCount={visibleReplyCount}
                  setVisibleReplyCount={setVisibleReplyCount}
                  onReply={(parentId, text) => submitReply(parentId, text)}
                  commentLoading={commentLoading}
                />
              ))}
            </ul>
          </div>
        </div>

        {/* Низ: кнопки */}
        <div className="shrink-0 border-t border-zinc-200 px-4 py-3 dark:border-zinc-700 sm:px-5 sm:py-4">
          {isOwnBench && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="mb-3 w-full cursor-pointer rounded-xl bg-red-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? "Удаление…" : "Удалить лавочку"}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full cursor-pointer rounded-xl border border-zinc-300 py-2.5 font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
