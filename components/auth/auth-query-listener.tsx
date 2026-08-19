"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useAuthModal } from "@/lib/auth-modal-context";

// There's no /login page — proxy.ts redirects signed-out visitors to
// "/?auth=login&next=..." instead. This reads that query string once,
// opens the matching modal, then strips it from the URL. Separate
// component because useSearchParams requires a Suspense boundary.
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
