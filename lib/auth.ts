import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { checkRateLimit, clearRateLimit, getClientIp } from "@/lib/rate-limit";

// Thrown instead of returning `null` when someone (or something) has made
// too many login attempts too quickly. Extending Auth.js's own
// CredentialsSignin (rather than a plain Error) is what makes this show up
// to the client as a real, distinguishable sign-in error — Auth.js reports
// the `code` below back through `signIn()`'s result, which
// components/auth/login-form.tsx checks specifically so it can show "too
// many attempts, try again shortly" instead of the generic "incorrect
// email or password" it shows for every other failure.
class RateLimitedSignin extends CredentialsSignin {
  code = "rate-limited";
}

// Auth.js (NextAuth v5) config. Credentials + JWT sessions — no OAuth, so
// no database adapter is needed; we read/write the User table ourselves via
// Prisma inside `authorize`. This is the direct replacement for the old
// site's login_process.php, minus the SQL string-concatenation and the
// plaintext password comparison.
//
// Note: `prisma` is imported *inside* authorize() below (a dynamic
// `await import(...)`) rather than at the top of this file. Reason: every
// route that touches auth — including GET /api/auth/session, which
// SessionProvider calls on every single page load and never needs the
// database for — goes through this file. A static top-level
// `import { prisma } from "@/lib/prisma"` means if the Prisma Client
// fails to initialize for *any* reason (wrong DATABASE_URL, engine not
// generated yet, etc.), it takes the *entire* auth module down with it —
// including the session check nobody was even trying to use the database
// for. That's exactly what was causing the "ClientFetchError: The string
// did not match the expected pattern" error: /api/auth/session was
// crashing with a 500 HTML error page instead of returning JSON, and the
// browser's `res.json()` call on that HTML choked (Safari's specific
// wording for "this wasn't valid JSON"; Chrome would say "Unexpected
// token '<'" for the same thing). Deferring the import to inside
// authorize() means a broken Prisma setup only breaks the actual login
// attempt, not every page load.
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    // There's no dedicated /login page in this app (login is a modal), so
    // if Auth.js ever needs to redirect to a sign-in page (e.g. a protected
    // route accessed while signed out), send it to the homepage instead.
    // proxy.ts appends ?auth=login&next=... so the homepage knows to open
    // the modal automatically.
    signIn: "/",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        // Two separate limits, because they stop two different shapes of
        // abuse. The email-keyed one is tight (5 tries / 15 minutes) and
        // stops someone brute-forcing one specific known account. The
        // IP-keyed one is looser (20 tries / 15 minutes) and catches what
        // the email limit alone would miss: someone cycling through many
        // *different* email addresses from the same place, where each
        // email gets its own fresh bucket. Either one tripping blocks the
        // attempt, and this check runs before touching the database at
        // all, so a blocked attempt costs nothing but a Map lookup.
        const emailKey = `login:email:${email.toLowerCase()}`;
        const ipKey = `login:ip:${getClientIp(request)}`;
        const emailLimit = checkRateLimit(emailKey, { max: 5, windowMs: 15 * 60 * 1000 });
        const ipLimit = checkRateLimit(ipKey, { max: 20, windowMs: 15 * 60 * 1000 });
        if (!emailLimit.allowed || !ipLimit.allowed) {
          throw new RateLimitedSignin();
        }

        const { prisma } = await import("@/lib/prisma");
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const validPassword = await bcrypt.compare(
          password,
          user.passwordHash
        );
        if (!validPassword) return null;

        // A correct password proves this really is the account owner —
        // clear their email-specific bucket so a few earlier typos don't
        // eat into their next login attempt later today. The IP bucket is
        // left alone on purpose: it's tracking overall activity from one
        // place, not tied to whether any single login happened to succeed.
        clearRateLimit(emailKey);

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`.trim(),
          isAdmin: user.isAdmin,
        };
      },
    }),
  ],
  callbacks: {
    // Carry the user id (and, as of the admin dashboard, the isAdmin flag)
    // onto the JWT, then onto the session, so server components/route
    // handlers can read session.user.id/isAdmin directly instead of looking
    // the user up by email every time. Both only get set here when `user`
    // is present, which Auth.js only passes in on the initial sign-in call
    // to authorize() above — meaning a session created before you flip
    // isAdmin on in the database keeps carrying the old `false` until you
    // sign out and back in. That's expected, not a bug: a JWT session is a
    // signed snapshot taken at login time, not a live database read on
    // every request, so it can't "notice" a database change on its own.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = user.isAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
});
