import { DefaultSession } from "next-auth";

// Auth.js's default Session["user"] type only has name/email/image. We
// stash the database user id (and, as of the admin dashboard, isAdmin) on
// the JWT and session in lib/auth.ts, so TypeScript needs to know those
// fields exist — otherwise every `session.user.id`/`session.user.isAdmin`
// access is a type error.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isAdmin: boolean;
    } & DefaultSession["user"];
  }

  // The object authorize() returns in lib/auth.ts — augmented the same way
  // as Session.user above, since it's what `user` is typed as inside the
  // jwt() callback.
  interface User {
    isAdmin?: boolean;
  }
}

// Separate module: the JWT itself (what `token` is typed as inside the
// jwt()/session() callbacks) lives in "next-auth/jwt", not "next-auth".
declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    isAdmin?: boolean;
  }
}
