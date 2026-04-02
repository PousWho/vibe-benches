"use client";

/**
 * Контекст авторизации: текущий пользователь и открытие модалки входа/регистрации.
 * Хедер и карта используют один и тот же state — кнопка «Войти» в хедере открывает ту же модалку.
 */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import AuthPanel from "@/components/AuthPanel";

type AuthContextValue = {
  user: User | null;
  setUser: (u: User | null) => void;
  showAuthModal: boolean;
  setShowAuthModal: (v: boolean) => void;
  /** Подсказка над модалкой (например «Войдите, чтобы добавить лавочку») */
  authPrompt: string | null;
  setAuthPrompt: (v: string | null) => void;
  /** Завершить сессию Supabase и закрыть модалку входа */
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth used outside AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authPrompt, setAuthPrompt] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const closeModal = () => {
    setShowAuthModal(false);
    setAuthPrompt(null);
  };

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setShowAuthModal(false);
    setAuthPrompt(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        showAuthModal,
        setShowAuthModal,
        authPrompt,
        setAuthPrompt,
        signOut,
      }}
    >
      {children}
      {showAuthModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Вход и регистрация"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {authPrompt && (
              <p className="mb-3 text-center text-sm text-white">{authPrompt}</p>
            )}
            <AuthPanel userEmail={user?.email ?? null} onClose={closeModal} />
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}
