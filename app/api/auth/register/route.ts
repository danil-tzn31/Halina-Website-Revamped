import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Replaces the old register_process.php: passwords are hashed instead of
// stored as plaintext, the query is a Prisma call instead of concatenated
// SQL, and input is validated with Zod before it touches the database.
export async function POST(request: Request) {
  // Capped per IP since email/username don't exist yet at this point.
  // 5/hour is generous for a real signup, tight enough to block bulk
  // account creation.
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
