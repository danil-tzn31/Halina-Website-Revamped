"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  registerSchema,
  passwordRequirements,
  type RegisterInput,
} from "@/lib/validators/auth";

export function SignupForm({
  redirectTo,
  onSuccess,
}: {
  redirectTo: string | null;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  // Read the password field's live value purely to drive the checklist
  // below — this doesn't replace the real validation, which still happens
  // through registerSchema (client-side via zodResolver above, and again
  // server-side in /api/auth/register, since a client can always be
  // bypassed). `useWatch` rather than the `watch()` method returned by
  // useForm — both do the same job, but `watch()` is a plain function the
  // React Compiler can't safely memoize around (it flagged exactly this),
  // while `useWatch` is a real hook built to subscribe to one field's
  // changes cleanly. Defaults to "" before the user's typed anything, so
  // every requirement starts unmet rather than the checklist rendering
  // blank.
  const passwordValue = useWatch({ control, name: "password" }) ?? "";

  async function onSubmit(data: RegisterInput) {
    setServerError(null);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setServerError(body?.error ?? "Something went wrong. Try again.");
      return;
    }

    // Registration succeeded — log them straight in rather than making them
    // re-enter their credentials in the login tab.
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      // Account was created but auto-login failed for some reason — not
      // fatal, they can just log in manually.
      setServerError("Account created — log in to continue.");
      return;
    }

    onSuccess();
    router.refresh();
    if (redirectTo) router.push(redirectTo);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-first-name">First name</Label>
          <Input id="signup-first-name" {...register("firstName")} />
          {errors.firstName && (
            <p className="text-xs text-destructive">
              {errors.firstName.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-last-name">Last name</Label>
          <Input id="signup-last-name" {...register("lastName")} />
          {errors.lastName && (
            <p className="text-xs text-destructive">
              {errors.lastName.message}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="signup-username">Username</Label>
        <Input id="signup-username" {...register("username")} />
        {errors.username && (
          <p className="text-xs text-destructive">
            {errors.username.message}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="signup-email">Email</Label>
        <Input id="signup-email" type="email" {...register("email")} />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="signup-phone">Phone (optional)</Label>
        <Input id="signup-phone" type="tel" {...register("phone")} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-password">Password</Label>
          <Input
            id="signup-password"
            type="password"
            {...register("password")}
          />
          {/* The checklist below is the only feedback shown for this field
              on purpose — registerSchema's actual error message for a weak
              password is deliberately generic ("doesn't meet the
              requirements below") specifically because this list already
              says exactly what's missing, in real time, without waiting
              for a submit attempt. */}
          <ul className="mt-0.5 flex flex-col gap-0.5">
            {passwordRequirements.map((requirement) => {
              const met = requirement.test(passwordValue);
              return (
                <li
                  key={requirement.key}
                  className={cn(
                    "flex items-center gap-1.5 text-[11px] transition-colors",
                    met ? "text-teal" : "text-ink-soft"
                  )}
                >
                  <Check
                    className={cn("h-3 w-3 shrink-0", met ? "opacity-100" : "opacity-25")}
                    strokeWidth={2.5}
                  />
                  {requirement.label}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-confirm-password">Confirm</Label>
          <Input
            id="signup-confirm-password"
            type="password"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>
      </div>
      {serverError && (
        <p className="text-xs text-destructive">{serverError}</p>
      )}
      <Button type="submit" disabled={isSubmitting} className="mt-2">
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
