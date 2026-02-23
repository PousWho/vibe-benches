"use client";

/**
 * Глобальные тост-уведомления: успех/ошибка действий (добавление лавочки, удаление, сохранение профиля и т.д.).
 */
import { createContext, useCallback, useContext, useState } from "react";

type ToastType = "success" | "error";

type Toast = {
  id: number;
  text: string;
  type: ToastType;
};

type ToastContextValue = {
  showToast: (text: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;
const TOAST_DURATION_MS = 4000;

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast used outside ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((text: string, type: ToastType = "success") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="pointer-events-none fixed left-1/2 right-0 top-16 z-[100] flex max-w-sm -translate-x-1/2 flex-col gap-2 px-4 sm:left-1/2"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-xl border px-4 py-3 shadow-lg pointer-events-auto ${
              t.type === "error"
                ? "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/40 dark:text-red-200"
                : "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/40 dark:text-green-200"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
