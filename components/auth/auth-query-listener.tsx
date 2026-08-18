"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useAuthModal } from "@/lib/auth-modal-context";

// Since there's no /login page, proxy.ts sends signed-out visitors hitting
// a protected route to "/?auth=login&next=/account/bookings" instead. This
// component's whole job is reading that query string once and opening the
// modal to match — then cleaning the URL so it doesn't linger after a
// refresh or a share. Needs to be a separate component (rather than inline
// in the page) because useSearchParams requires a Suspense boundary.
export function AuthQueryListener() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { openModal } = useAuthModal();

  useEffect(() => {
    const auth = searchParams.get("auth");
    if (auth === "login" || auth === "signup") {
      openModal(auth, searchParams.get("next") ?? undefined);
      router.replace(pathname);
    }
    // Only run when the query string actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return null;
}
