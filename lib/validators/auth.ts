import { z } from "zod";

// Shared between the client form (react-hook-form + @hookform/resolvers)
// and the server route handler — the same rules are enforced on both
// sides, so a user gets instant feedback in the UI, but the server never
// trusts the client and re-validates independently.
export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

// The actual password rules, defined once as small testable functions
// rather than baked directly into a regex inside the Zod schema below.
// components/auth/signup-form.tsx imports this same array to render a live
// checklist under the password field ("✓ One uppercase letter" ticking on
// as you type) — reusing the exact same `test` functions the server
// enforces means the checklist can never quietly drift out of sync with
// what's actually required, the same reasoning behind this project's other
// shared-logic modules (lib/flights/sort.ts, lib/date-utils.ts). Chosen
// deliberately as a "medium" strength bar — length plus a mix of letter
// cases and a number — rather than also demanding a special character:
// it's a meaningful step up from the old plain 8-character minimum without
// being the kind of password rule that makes people annoyed enough to
// write it on a sticky note, which doesn't actually make a demo app safer.
export const passwordRequirements = [
  {
    key: "length",
    label: "At least 8 characters",
    test: (value: string) => value.length >= 8,
  },
  {
    key: "uppercase",
    label: "One uppercase letter",
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    key: "lowercase",
    label: "One lowercase letter",
    test: (value: string) => /[a-z]/.test(value),
  },
  {
    key: "number",
    label: "One number",
    test: (value: string) => /[0-9]/.test(value),
  },
] as const;

function meetsPasswordRequirements(value: string): boolean {
  return passwordRequirements.every((requirement) => requirement.test(value));
}

export const registerSchema = z
  .object({
    firstName: z.string().min(1, "Enter your first name."),
    lastName: z.string().min(1, "Enter your last name."),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters.")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores."
      ),
    email: z.string().email("Enter a valid email address."),
    phone: z.string().optional(),
    // The message here is intentionally generic — the signup form never
    // actually shows it, since the live checklist below the field already
    // explains exactly which requirement is missing. This one only
    // surfaces if someone bypasses the UI entirely and calls
    // /api/auth/register directly with a weak password.
    password: z
      .string()
      .refine(meetsPasswordRequirements, "Password doesn't meet the requirements below."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
