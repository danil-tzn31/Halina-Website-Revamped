import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { checkRateLimit, clearRateLimit, getClientIp } from "@/lib/rate-limit";

// Thrown instead of returning `null` when someone (or something) has made
// too many login attempts too quickly. Extending Auth.js's own
// CredentialsSignin (rather than a plain Error) surfaces a distinguishable
// `code` through `signIn()`'s result, which the login form checks to show
// "too many attempts" instead of the generic invalid-credentials message.
class RateLimitedSignin extends CredentialsSignin {
  code = "rate-limited";
}

// Auth.js (NextAuth v5) config. Credentials + JWT sessions — no OAuth, so
// no database adapter is needed; we read/write the User table ourselves via
// Prisma inside `authorize`. Direct replacement for the old PHP site's
// login_process.php, minus the SQL string-concatenation and plaintext
// password comparison.
//
// `prisma` is imported *inside* authorize() (a dynamic import) rather than
// at the top of the file. Every auth route, including the session check
// that SessionProvider calls on every page load, goes through this file —
// a static top-level import would take the whole module down if Prisma
// fails to initialize (bad DATABASE_URL, engine not generated, etc.),
// crashing session checks that never touch the database. Deferring the
// import means a broken Prisma setup only breaks an actual login attempt.
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    // Login is a modal, not a page — send Auth.js's sign-in redirect to the
    // homepage instead. proxy.ts appends ?auth=login&next=... so the
    // homepage knows to open the modal automatically.
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

        // Two separate limits: email-keyed (5/15min) stops brute-forcing one
        // account; IP-keyed (20/15min) catches someone cycling through many
        // different emails from the same place. Either tripping blocks the
        // attempt, checked before touching the database.
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

        // Clear the email bucket on success so earlier typos don't eat into
        // a later attempt. The IP bucket is left alone — it tracks overall
        // activity from one place, not whether a login succeeded.
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
    // Carry user id and isAdmin onto the JWT, then the session, so server
    // components/route handlers can read session.user.id/isAdmin directly
    // instead of looking the user up by email each time. `user` is only
    // present on the initial sign-in, so a session created before isAdmin
    // is flipped on in the database keeps the old value until the user
    // signs out and back in — a JWT session is a snapshot from login time,
    // not a live database read, so it can't pick up the change on its own.
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
