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
// rather than baked into a regex inside the Zod schema below.
// signup-form.tsx imports this same array to render a live checklist
// under the password field, so it can't drift out of sync with what the
// server enforces. Medium strength bar — length plus mixed case and a
// number — without requiring a special character.
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
    // Generic message on purpose — the live checklist below the field
    // already explains which requirement is missing. Only surfaces if
    // /api/auth/register is called directly, bypassing the UI.
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
