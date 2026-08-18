import { handlers } from "@/lib/auth";

// Auth.js's catch-all route — handles /api/auth/signin, /api/auth/callback,
// /api/auth/session, etc. under the hood. You call `signIn()`/`signOut()`
// from next-auth/react; you never call this URL directly.
export const { GET, POST } = handlers;
