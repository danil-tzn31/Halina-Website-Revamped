"use client";

import { Suspense } from "react";
import { SessionProvider } from "next-auth/react";

import { AuthModalProvider } from "@/lib/auth-modal-context";
import { CurrencyProvider } from "@/lib/currency/currency-context";
import { AuthModal } from "@/components/auth/auth-modal";
import { AuthQueryListener } from "@/components/auth/auth-query-listener";

// Everything that needs to be a Client Component (Context providers can't
// be Server Components) lives here, kept separate from layout.tsx so the
// rest of the app can stay server-rendered by default.
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthModalProvider>
        <CurrencyProvider>
          <Suspense fallback={null}>
            <AuthQueryListener />
          </Suspense>
          {children}
          <AuthModal />
        </CurrencyProvider>
      </AuthModalProvider>
    </SessionProvider>
  );
}
