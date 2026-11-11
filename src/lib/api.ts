/**
 * Couche d'accès aux données météo.
 * Toutes les données proviennent de sources publiques réelles :
 *  - Open-Meteo (prévisions, modèles, ensembles, archives, qualité de l'air, géocodage)
 *  - RainViewer (radar de précipitations observé)
 *  - EUMETSAT / NASA GIBS (imagerie satellite) — consommées directement en tuiles par la carte
 *  - Nominatim / OpenStreetMap (géocodage inverse)
 *  - Wikipédia (photo d'illustration de la ville)
 */

export interface Place {
  id: string;
  name: string;
  lat: number;
  lon: number;
  country?: string;
  admin?: string;
}

async function getJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    let reason = "";
    try {
      const body = await res.json();
      reason = body?.reason ?? "";
    } catch {
      /* ignore */
    }
    throw new Error(`Requête impossible (${res.status}) ${reason}`.trim());
  }
  return res.json() as Promise<T>;
}

const r4 = (n: number) => Math.round(n * 1e4) / 1e4;

/* ------------------------------------------------------------------ */
/* Prévisions principales                                               */
/* ------------------------------------------------------------------ */

export const CURRENT_VARS = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "is_day",
  "precipitation",
  "weather_code",
  "cloud_cover",
  "pressure_msl",
  "surface_pressure",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "visibility",
  "uv_index",
  "dew_point_2m",
] as const;

export const HOURLY_VARS = [
  "temperature_2m",
  "apparent_temperature",
  "dew_point_2m",
  "relative_humidity_2m",
  "precipitation",
  "precipitation_probability",
  "rain",
  "showers",
  "snowfall",
  "snow_depth",
  "weather_code",
  "pressure_msl",
  "cloud_cover",
  "cloud_cover_low",
  "cloud_cover_mid",
  "cloud_cover_high",
  "visibility",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "uv_index",
  "cape",
  "lifted_index",
  "freezing_level_height",
  "shortwave_radiation",
  "sunshine_duration",
  "is_day",
] as const;

export const DAILY_VARS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "apparent_temperature_max",
  "apparent_temperature_min",
  "sunrise",
  "sunset",
  "daylight_duration",
  "sunshine_duration",
  "uv_index_max",
  "precipitation_sum",
  "rain_sum",
  "snowfall_sum",
  "precipitation_hours",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "wind_direction_10m_dominant",
  "shortwave_radiation_sum",
] as const;

export type HourlyKey = (typeof HOURLY_VARS)[number];
export type DailyKey = (typeof DAILY_VARS)[number];
export type CurrentKey = (typeof CURRENT_VARS)[number];

export interface Forecast {
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
  utc_offset_seconds: number;
  current: Record<CurrentKey, number> & { time: string };
  hourly: Record<HourlyKey, (number | null)[]> & { time: string[] };
  daily: Record<Exclude<DailyKey, "sunrise" | "sunset">, (number | null)[]> & {
    time: string[];
    sunrise: string[];
    sunset: string[];
  };
  minutely_15?: { time: string[]; precipitation: (number | null)[] };
}

export function fetchForecast(lat: number, lon: number): Promise<Forecast> {
  const u = new URL("https://api.open-meteo.com/v1/forecast");
  u.searchParams.set("latitude", String(r4(lat)));
  u.searchParams.set("longitude", String(r4(lon)));
  u.searchParams.set("current", CURRENT_VARS.join(","));
  u.searchParams.set("hourly", HOURLY_VARS.join(","));
  u.searchParams.set("daily", DAILY_VARS.join(","));
  u.searchParams.set("minutely_15", "precipitation");
  u.searchParams.set("forecast_minutely_15", "32");
  u.searchParams.set("past_minutely_15", "4");
  u.searchParams.set("forecast_days", "16");
  u.searchParams.set("past_days", "1");
  u.searchParams.set("timezone", "auto");
  return getJSON<Forecast>(u.toString());
}

/* ------------------------------------------------------------------ */
/* Qualité de l'air & pollens                                           */
/* ------------------------------------------------------------------ */

export interface AirQuality {
  current: {
    time: string;
    european_aqi: number | null;
    pm10: number | null;
    pm2_5: number | null;
    nitrogen_dioxide: number | null;
    ozone: number | null;
    sulphur_dioxide: number | null;
    carbon_monoxide: number | null;
    uv_index: number | null;
    alder_pollen: number | null;
    birch_pollen: number | null;
    grass_pollen: number | null;
    mugwort_pollen: number | null;
    olive_pollen: number | null;
    ragweed_pollen: number | null;
  };
  hourly: {
    time: string[];
    european_aqi: (number | null)[];
    pm2_5: (number | null)[];
    pm10: (number | null)[];
    ozone: (number | null)[];
    nitrogen_dioxide: (number | null)[];
  };
}

export function fetchAirQuality(lat: number, lon: number): Promise<AirQuality> {
  const u = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  u.searchParams.set("latitude", String(r4(lat)));
  u.searchParams.set("longitude", String(r4(lon)));
  u.searchParams.set(
    "current",
    "european_aqi,pm10,pm2_5,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide,uv_index,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen",
  );
  u.searchParams.set("hourly", "european_aqi,pm2_5,pm10,ozone,nitrogen_dioxide");
  u.searchParams.set("forecast_days", "4");
  u.searchParams.set("timezone", "auto");
  return getJSON<AirQuality>(u.toString());
}

/* ------------------------------------------------------------------ */
/* Géocodage                                                            */
/* ------------------------------------------------------------------ */

interface GeoResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

export async function searchPlaces(q: string): Promise<Place[]> {
  const u = new URL("https://geocoding-api.open-meteo.com/v1/search");
  u.searchParams.set("name", q);
  u.searchParams.set("count", "8");
  u.searchParams.set("language", "fr");
  u.searchParams.set("format", "json");
  const data = await getJSON<{ results?: GeoResult[] }>(u.toString());
  return (data.results ?? []).map((r) => ({
    id: String(r.id),
    name: r.name,
    lat: r.latitude,
    lon: r.longitude,
    country: r.country,
    admin: r.admin1,
  }));
}

export async function reverseGeocode(lat: number, lon: number): Promise<{ city: string; country: string }> {
  const data = await getJSON<{ address?: Record<string, string> }>(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10&accept-language=fr`,
  );
  const a = data.address ?? {};
  return {
    city: a.city || a.town || a.village || a.municipality || a.county || "Ma position",
    country: a.country || "",
  };
}

/* ------------------------------------------------------------------ */
/* Wikipédia : image d'illustration                                    */
/* ------------------------------------------------------------------ */

export async function fetchCityImage(name: string): Promise<string | null> {
  const key = encodeURIComponent(name.split(",")[0].trim());
  for (const lang of ["fr", "en"]) {
    try {
      const d = await getJSON<{ originalimage?: { source: string }; thumbnail?: { source: string }; type?: string }>(
        `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${key}`,
      );
      if (d.type === "disambiguation") continue;
      const src = d.thumbnail?.source || d.originalimage?.source;
      if (src) return src.replace(/\/\d+px-/, "/1280px-");
    } catch {
      /* essai suivant */
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Radar RainViewer                                                     */
/* ------------------------------------------------------------------ */

export interface RadarFrames {
  host: string;
  radar: { past: { time: number; path: string }[]; nowcast: { time: number; path: string }[] };
}

export const fetchRadarFrames = () => getJSON<RadarFrames>("https://api.rainviewer.com/public/weather-maps.json");

/* ------------------------------------------------------------------ */
/* Comparaison de modèles                                               */
/* ------------------------------------------------------------------ */

export const MODELS = [
  { id: "ecmwf_ifs025", label: "ECMWF IFS", origin: "Centre européen" },
  { id: "meteofrance_seamless", label: "Météo-France", origin: "ARPEGE / AROME" },
  { id: "icon_seamless", label: "DWD ICON", origin: "Allemagne" },
  { id: "gfs_seamless", label: "NOAA GFS", origin: "États-Unis" },
] as const;

export type ModelId = (typeof MODELS)[number]["id"];

export interface ModelsResponse {
  hourly: Record<string, (number | null)[]> & { time: string[] };
}

export function fetchModels(lat: number, lon: number, vars: string[]): Promise<ModelsResponse> {
  const u = new URL("https://api.open-meteo.com/v1/forecast");
  u.searchParams.set("latitude", String(r4(lat)));
  u.searchParams.set("longitude", String(r4(lon)));
  u.searchParams.set("hourly", vars.join(","));
  u.searchParams.set("models", MODELS.map((m) => m.id).join(","));
  u.searchParams.set("forecast_days", "7");
  u.searchParams.set("timezone", "auto");
  return getJSON<ModelsResponse>(u.toString());
}

/* ------------------------------------------------------------------ */
/* Prévision d'ensemble (incertitude)                                  */
/* ------------------------------------------------------------------ */

export interface EnsembleStats {
  time: string[];
  members: number;
  p10: number[];
  p50: number[];
  p90: number[];
  min: number[];
  max: number[];
  /** probabilité (0-100) que la valeur dépasse le seuil donné, si demandé */
  pExceed?: number[];
}

function quantile(sorted: number[], q: number) {
  if (!sorted.length) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export async function fetchEnsemble(
  lat: number,
  lon: number,
  variable: "temperature_2m" | "precipitation" | "wind_gusts_10m",
  threshold?: number,
): Promise<EnsembleStats> {
  const u = new URL("https://ensemble-api.open-meteo.com/v1/ensemble");
  u.searchParams.set("latitude", String(r4(lat)));
  u.searchParams.set("longitude", String(r4(lon)));
  u.searchParams.set("hourly", variable);
  u.searchParams.set("models", "ecmwf_ifs025");
  u.searchParams.set("forecast_days", "10");
  u.searchParams.set("timezone", "auto");
  const d = await getJSON<{ hourly: Record<string, (number | null)[]> & { time: string[] } }>(u.toString());
  const keys = Object.keys(d.hourly).filter((k) => k === variable || k.startsWith(`${variable}_member`));
  const out: EnsembleStats = { time: d.hourly.time, members: keys.length, p10: [], p50: [], p90: [], min: [], max: [] };
  if (threshold !== undefined) out.pExceed = [];
  d.hourly.time.forEach((_, i) => {
    const vals = keys.map((k) => d.hourly[k][i]).filter((v): v is number => v !== null).sort((a, b) => a - b);
    out.p10.push(quantile(vals, 0.1));
    out.p50.push(quantile(vals, 0.5));
    out.p90.push(quantile(vals, 0.9));
    out.min.push(vals[0] ?? NaN);
    out.max.push(vals[vals.length - 1] ?? NaN);
    if (out.pExceed) out.pExceed.push(vals.length ? (vals.filter((v) => v >= threshold!).length / vals.length) * 100 : NaN);
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Archives (réanalyse ERA5) pour comparer des périodes                 */
/* ------------------------------------------------------------------ */

export interface ArchiveDaily {
  time: string[];
  temperature_2m_max: (number | null)[];
  temperature_2m_min: (number | null)[];
  temperature_2m_mean: (number | null)[];
  precipitation_sum: (number | null)[];
  wind_gusts_10m_max: (number | null)[];
  sunshine_duration: (number | null)[];
}

export async function fetchArchive(lat: number, lon: number, start: string, end: string): Promise<ArchiveDaily> {
  const u = new URL("https://archive-api.open-meteo.com/v1/archive");
  u.searchParams.set("latitude", String(r4(lat)));
  u.searchParams.set("longitude", String(r4(lon)));
  u.searchParams.set("start_date", start);
  u.searchParams.set("end_date", end);
  u.searchParams.set(
    "daily",
    "temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,wind_gusts_10m_max,sunshine_duration",
  );
  u.searchParams.set("timezone", "auto");
  const d = await getJSON<{ daily: ArchiveDaily }>(u.toString());
  return d.daily;
}

/* ------------------------------------------------------------------ */
/* Grille régionale (champ météo pour la carte et l'analyse régionale)  */
/* ------------------------------------------------------------------ */

export interface GridField {
  lats: number[];
  lons: number[];
  /** unix time (s) */
  time: number[];
  /** values[varName][pointIndex][timeIndex] */
  values: Record<string, (number | null)[][]>;
  rows: number;
  cols: number;
}

export async function fetchGrid(
  south: number,
  west: number,
  north: number,
  east: number,
  rows: number,
  cols: number,
  vars: string[],
  hours = 72,
): Promise<GridField> {
  const lats: number[] = [];
  const lons: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      lats.push(r4(north - ((north - south) * (r + 0.5)) / rows));
      lons.push(r4(west + ((east - west) * (c + 0.5)) / cols));
    }
  }
  const u = new URL("https://api.open-meteo.com/v1/forecast");
  u.searchParams.set("latitude", lats.join(","));
  u.searchParams.set("longitude", lons.join(","));
  u.searchParams.set("hourly", vars.join(","));
  u.searchParams.set("forecast_hours", String(hours));
  u.searchParams.set("timeformat", "unixtime");
  u.searchParams.set("timezone", "GMT");
  const data = await getJSON<
    { hourly: Record<string, (number | null)[]> & { time: number[] } }[] | { hourly: Record<string, (number | null)[]> & { time: number[] } }
  >(u.toString());
  const arr = Array.isArray(data) ? data : [data];
  const values: Record<string, (number | null)[][]> = {};
  vars.forEach((v) => (values[v] = arr.map((p) => p.hourly[v] ?? [])));
  return { lats, lons, time: arr[0]?.hourly.time ?? [], values, rows, cols };
}

/* ------------------------------------------------------------------ */
/* Point unique (popup de carte)                                       */
/* ------------------------------------------------------------------ */

export interface PointNow {
  current: {
    temperature_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
    precipitation: number;
    cloud_cover: number;
    pressure_msl: number;
    relative_humidity_2m: number;
    is_day: number;
  };
  elevation: number;
}

export function fetchPointNow(lat: number, lon: number): Promise<PointNow> {
  return getJSON<PointNow>(
    `https://api.open-meteo.com/v1/forecast?latitude=${r4(lat)}&longitude=${r4(lon)}&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation,cloud_cover,pressure_msl,relative_humidity_2m,is_day&timezone=auto`,
  );
}

/* ------------------------------------------------------------------ */
/* Plusieurs points nommés (villes de la carte régionale)               */
/* ------------------------------------------------------------------ */

export interface PointsField {
  time: number[];
  values: Record<string, (number | null)[][]>;
}

export async function fetchPoints(pts: { lat: number; lon: number }[], vars: string[], hours = 48): Promise<PointsField> {
  const u = new URL("https://api.open-meteo.com/v1/forecast");
  u.searchParams.set("latitude", pts.map((p) => r4(p.lat)).join(","));
  u.searchParams.set("longitude", pts.map((p) => r4(p.lon)).join(","));
  u.searchParams.set("hourly", vars.join(","));
  u.searchParams.set("forecast_hours", String(hours));
  u.searchParams.set("timeformat", "unixtime");
  u.searchParams.set("timezone", "GMT");
  const data = await getJSON<{ hourly: Record<string, (number | null)[]> & { time: number[] } }[] | { hourly: Record<string, (number | null)[]> & { time: number[] } }>(u.toString());
  const arr = Array.isArray(data) ? data : [data];
  const values: Record<string, (number | null)[][]> = {};
  vars.forEach((v) => (values[v] = arr.map((p) => p.hourly[v] ?? [])));
  return { time: arr[0]?.hourly.time ?? [], values };
}
