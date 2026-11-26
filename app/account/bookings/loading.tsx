import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Skeleton } from "@/components/ui/skeleton";

// Shown while My Bookings waits on the database, shaped like the real
// page (heading, then a grid of booking cards) so the switch isn't jarring.
export default function BookingsLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="solid" />
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-6 pb-16 pt-[104px] sm:px-10">
        <h1 className="text-3xl font-light tracking-tight text-ink">My Bookings</h1>
        <Skeleton className="mt-8 h-6 w-48" />
        <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading your bookings">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i} className="border border-line bg-paper-raised p-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-5 w-14" />
              </div>
              <Skeleton className="mt-4 h-5 w-32" />
              <Skeleton className="mt-2 h-3.5 w-40" />
              <Skeleton className="mt-8 h-6 w-24" />
            </li>
          ))}
        </ul>
      </main>
      <Footer />
    </div>
  );
}
