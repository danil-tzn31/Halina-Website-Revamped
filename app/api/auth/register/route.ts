import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// This is the direct replacement for the old register_process.php — same
// job (create a user), but every problem in the original is fixed here:
// passwords are hashed (never stored as plaintext), the query is a Prisma
// call (not a string-concatenated SQL statement), and input is validated
// with Zod before touching the database at all.
export async function POST(request: Request) {
  // Capped per IP rather than per email/username — those don't exist yet
  // at this point (that's what this route is about to create), so IP is
  // the only thing available to key on. 5 accounts per hour from one place
  // is generous for a real visitor signing up themselves, but blocks a
  // script from spinning up accounts in bulk. See lib/rate-limit.ts for
  // this limiter's real-world caveats (in-memory, single-instance).
  const ipLimit = checkRateLimit(`register:ip:${getClientIp(request)}`, {
    max: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "Too many accounts created from this connection. Try again later." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const { firstName, lastName, username, email, phone, password } =
    parsed.data;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  if (existing) {
    const field = existing.email === email ? "email" : "username";
    return NextResponse.json(
      { error: `That ${field} is already registered.` },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      username,
      email,
      phone,
      passwordHash,
    },
  });

  return NextResponse.json({ id: user.id, email: user.email });
}
