import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Sun,
  type LucideIcon,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { describeWeather, getForecast, type WeatherKind } from "@/lib/weather/open-meteo";

const ICONS: Record<WeatherKind, LucideIcon> = {
  clear: Sun,
  partly: CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  storm: CloudLightning,
};

// "2026-11-26" → "Thu". Built from the parts so it can't slip a day
// depending on the server's timezone.
function weekday(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}

// Server Component: fetched on the server and cached for 30 minutes (see
// lib/weather/open-meteo.ts), so no extra request from the visitor's browser.
// Rendered inside a <Suspense> on the destination page, so a slow weather
// service never holds up the rest of the page.
export async function DestinationWeather({ lat, lng }: { lat: number; lng: number }) {
  const forecast = await getForecast(lat, lng);

  if (!forecast) {
    return <p className="text-[13.5px] text-ink-soft">Forecast unavailable right now.</p>;
  }

  const now = describeWeather(forecast.current.code);
  const NowIcon = ICONS[now.kind];

  return (
    <div>
      <p className="flex items-center gap-2 text-ink">
        <NowIcon className="h-5 w-5 text-ink-soft" strokeWidth={1.5} aria-hidden />
        <span className="text-[20px] font-light">{Math.round(forecast.current.temp)}°C</span>
        <span className="text-[13.5px] text-ink-soft">{now.label}</span>
      </p>

      <ul className="mt-4 grid grid-cols-7 gap-1 text-center">
        {forecast.days.map((day, i) => {
          const kind = describeWeather(day.code);
          const Icon = ICONS[kind.kind];
          return (
            <li key={day.date} title={`${kind.label}${day.rainChance != null ? `, ${day.rainChance}% chance of rain` : ""}`}>
              <p className="text-[11px] uppercase tracking-wide text-ink-soft">{i === 0 ? "Today" : weekday(day.date)}</p>
              <Icon className="mx-auto mt-1.5 h-4 w-4 text-ink-soft" strokeWidth={1.5} aria-label={kind.label} />
              <p className="mt-1.5 text-[12.5px] text-ink">{Math.round(day.max)}°</p>
              <p className="text-[11.5px] text-ink-soft">{Math.round(day.min)}°</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function DestinationWeatherSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="h-6 w-32" />
      <Skeleton className="mt-4 h-[70px] w-full" />
    </div>
  );
}
