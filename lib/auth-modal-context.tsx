"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

// Login/signup are a modal, not pages (that was the point — fewer routes).
// This context is how any component (the navbar's "Log in" button, or a
// protected-page redirect) can ask that modal to open, from anywhere in
// the tree, without prop-drilling.
type AuthMode = "login" | "signup";

interface AuthModalContextValue {
  isOpen: boolean;
  mode: AuthMode;
  redirectTo: string | null;
  openModal: (mode?: AuthMode, redirectTo?: string) => void;
  closeModal: () => void;
  setMode: (mode: AuthMode) => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setModeState] = useState<AuthMode>("login");
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  function openModal(nextMode: AuthMode = "login", redirect?: string) {
    setModeState(nextMode);
    setRedirectTo(redirect ?? null);
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
  }

  return (
    <AuthModalContext.Provider
      value={{
        isOpen,
        mode,
        redirectTo,
        openModal,
        closeModal,
        setMode: setModeState,
      }}
    >
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) {
    throw new Error("useAuthModal must be used within <AuthModalProvider>");
  }
  return ctx;
}
