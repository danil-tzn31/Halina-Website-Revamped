import { Skeleton } from "@/components/ui/skeleton";
import { getClimate, MONTH_LABELS } from "@/lib/weather/climate";

// A tiny rainfall chart: one bar per month, height = average rain, with the
// drier months filled in. Worded as "usually drier", not "best time to go":
// it's a five-year average, and a good month depends on more than rain.
// Same Suspense setup as DestinationWeather, so a slow archive request
// never holds up the page.
export async function DestinationClimate({ lat, lng }: { lat: number; lng: number }) {
  const climate = await getClimate(lat, lng);

  if (!climate) {
    return <p className="text-[13.5px] text-ink-soft">Season info unavailable right now.</p>;
  }

  const wettest = Math.max(...climate.rainfall, 1);

  return (
    <div>
      <p className="text-[14.5px] text-ink">
        {climate.wetAllYear ? (
          <>
            Rainy most of the year <span className="text-ink-soft">· driest {climate.summary}</span>
          </>
        ) : (
          climate.summary
        )}
      </p>
      <ul className="mt-3 grid grid-cols-12 gap-1" aria-label="Average rainfall by month">
        {climate.rainfall.map((mm, m) => (
          <li
            key={MONTH_LABELS[m]}
            className="flex flex-col items-center"
            title={`${MONTH_LABELS[m]}: about ${mm} mm of rain${climate.best[m] ? (climate.wetAllYear ? " · one of the driest" : " · usually one of the drier months") : ""}`}
          >
            <div className="flex h-10 w-full items-end">
              <div
                className={climate.best[m] ? "w-full bg-ink" : "w-full bg-ink/15"}
                style={{ height: `${Math.max(8, Math.round((mm / wettest) * 100))}%` }}
              />
            </div>
            <span className="mt-1 text-[10px] text-ink-soft">{MONTH_LABELS[m][0]}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11.5px] text-ink-soft">Taller bars mean more rain. Based on past rainfall (2021–2025), not a forecast.</p>
    </div>
  );
}

export function DestinationClimateSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="h-5 w-24" />
      <Skeleton className="mt-3 h-[52px] w-full" />
    </div>
  );
}
