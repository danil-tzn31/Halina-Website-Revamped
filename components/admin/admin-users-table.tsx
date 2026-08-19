import { formatDateLabel } from "@/lib/flights/format";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  bookingCount: number;
};

// Read-only by design — no edit/delete actions, just a view of who's
// registered. Plain Server Component since nothing here is interactive.
export function AdminUsersTable({ users }: { users: AdminUserRow[] }) {
  if (users.length === 0) {
    return <p className="text-[14px] text-ink-soft">No registered users yet.</p>;
  }

  return (
    <div className="overflow-x-auto border border-line">
      <table className="w-full min-w-[560px] border-collapse text-left text-[13.5px]">
        <thead>
          <tr className="border-b border-line bg-paper-raised text-[11.5px] uppercase tracking-wide text-ink-soft">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Joined</th>
            <th className="px-4 py-3 font-medium">Bookings</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-line last:border-b-0">
              <td className="px-4 py-3 text-ink">{user.name}</td>
              <td className="px-4 py-3 text-ink-soft">{user.email}</td>
              <td className="px-4 py-3 whitespace-nowrap text-ink-soft">
                {formatDateLabel(user.createdAt)}
              </td>
              <td className="px-4 py-3 text-ink-soft">{user.bookingCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
