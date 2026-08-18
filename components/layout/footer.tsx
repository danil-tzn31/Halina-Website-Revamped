export function Footer() {
  return (
    <footer className="mx-auto flex w-full max-w-[1180px] flex-col justify-between gap-2 border-t border-line px-6 py-10 text-[12px] tracking-wide text-ink-soft sm:flex-row sm:px-10">
      <span>Halina — a portfolio rebuild, not a commercial product</span>
      <span>&copy; {new Date().getFullYear()} Halina Travel</span>
    </footer>
  );
}
