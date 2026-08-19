import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

// Replaces the old site's copy-pasted `if (!$_SESSION['logged_in'])` check
// at the top of bookings.php — one place, runs before the page renders.
//
// Login is a modal with no dedicated /login page, so a signed-out visitor
// hitting /account/* gets sent to the homepage with
// ?auth=login&next=<original path> — AuthQueryListener picks that up and
// opens the modal automatically.
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
