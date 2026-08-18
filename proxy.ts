import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

// Next.js 16 renamed middleware.js -> proxy.js (same mechanism, new file
// name — see AGENTS.md/HOW-IT-WORKS.md). This is the replacement for the
// old site's copy-pasted `if (!$_SESSION['logged_in'])` check at the top
// of bookings.php: one place, runs before the page renders.
//
// Because login is a modal and there's no /login page to redirect to, a
// signed-out visitor hitting /account/* gets sent to the homepage with
// ?auth=login&next=<where they were going> — AuthQueryListener picks that
// up and opens the modal automatically.
export default auth((req) => {
  const isProtected = req.nextUrl.pathname.startsWith("/account");

  if (isProtected && !req.auth) {
    const url = new URL("/", req.nextUrl);
    url.searchParams.set("auth", "login");
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: ["/account/:path*"],
};
