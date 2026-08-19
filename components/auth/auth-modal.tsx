"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuthModal } from "@/lib/auth-modal-context";
import { LoginForm } from "@/components/auth/login-form";
import { SignupForm } from "@/components/auth/signup-form";

// Single modal for both login and signup — replaces the old site's
// separate login.php/register.php pages. One Dialog, state owned by
// lib/auth-modal-context.tsx, with a toggle to switch between forms.
export function AuthModal() {
  const { isOpen, mode, redirectTo, closeModal, setMode } = useAuthModal();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "login" ? "Log in" : "Create your account"}
          </DialogTitle>
          <DialogDescription>
            {mode === "login"
              ? "Log in to view your bookings and pick up where you left off."
              : "Takes under a minute — just enough to keep your bookings in one place."}
          </DialogDescription>
        </DialogHeader>

        {mode === "login" ? (
          <LoginForm redirectTo={redirectTo} onSuccess={closeModal} />
        ) : (
          <SignupForm redirectTo={redirectTo} onSuccess={closeModal} />
        )}

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="text-center text-[13px] text-ink-soft underline-offset-4 hover:text-ink hover:underline"
        >
          {mode === "login"
            ? "New to Halina? Create an account"
            : "Already have an account? Log in"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
