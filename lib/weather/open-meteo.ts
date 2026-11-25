// Live weather for destination pages, from Open-Meteo: free, no API key,
// no monthly quota. Like the other providers, a failure returns null and
// the page simply leaves the forecast out rather than breaking.
const API_URL = "https://api.open-meteo.com/v1/forecast";

export type WeatherDay = {
  date: string; // YYYY-MM-DD, Philippine time
  max: number;
  min: number;
  code: number;
  rainChance: number | null;
};

export type Forecast = {
  current: { temp: number; code: number };
  days: WeatherDay[];
};

type RawResponse = {
  current?: { temperature_2m?: number; weather_code?: number };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: (number | null)[];
  };
};

export async function getForecast(lat: number, lng: number): Promise<Forecast | null> {
  const query = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current: "temperature_2m,weather_code",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "Asia/Manila",
    forecast_days: "7",
  });

  try {
    const res = await fetch(`${API_URL}?${query}`, {
      // Weather doesn't change minute to minute, and a 30-minute cache
      // means 38 pages never hammer a free service.
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json: RawResponse = await res.json();

    const d = json.daily;
    const temp = json.current?.temperature_2m;
    const code = json.current?.weather_code;
    if (typeof temp !== "number" || typeof code !== "number" || !d?.time) return null;

    const days: WeatherDay[] = d.time.map((date, i) => ({
      date,
      max: d.temperature_2m_max?.[i] ?? NaN,
      min: d.temperature_2m_min?.[i] ?? NaN,
      code: d.weather_code?.[i] ?? 0,
      rainChance: d.precipitation_probability_max?.[i] ?? null,
    }));

    return {
      current: { temp, code },
      days: days.filter((day) => Number.isFinite(day.max) && Number.isFinite(day.min)),
    };
  } catch (error) {
    console.error("[weather] forecast unavailable:", error);
    return null;
  }
}

// Open-Meteo uses the WMO weather codes. Grouped into the handful of
// conditions worth telling a traveller about.
export type WeatherKind = "clear" | "partly" | "cloudy" | "fog" | "drizzle" | "rain" | "storm";

export function describeWeather(code: number): { kind: WeatherKind; label: string } {
  if (code === 0) return { kind: "clear", label: "Clear" };
  if (code <= 2) return { kind: "partly", label: "Partly cloudy" };
  if (code === 3) return { kind: "cloudy", label: "Cloudy" };
  if (code === 45 || code === 48) return { kind: "fog", label: "Foggy" };
  if (code >= 51 && code <= 57) return { kind: "drizzle", label: "Drizzle" };
  if (code >= 95) return { kind: "storm", label: "Thunderstorms" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    return { kind: "rain", label: code === 80 ? "Showers" : "Rain" };
  }
  return { kind: "cloudy", label: "Cloudy" };
}
