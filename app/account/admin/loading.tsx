import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Skeleton } from "@/components/ui/skeleton";

// Shown while the admin dashboard loads every booking and user.
export default function AdminLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="solid" />
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-6 pb-16 pt-[104px] sm:px-10">
        <h1 className="text-3xl font-light tracking-tight text-ink">Admin</h1>
        <div className="mt-10 flex flex-col gap-2" aria-label="Loading bookings">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
