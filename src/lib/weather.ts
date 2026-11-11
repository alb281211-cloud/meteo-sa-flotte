/** Codes météo WMO (utilisés par Open-Meteo) */
export type IconKind =
  | "sun"
  | "moon"
  | "sun-cloud"
  | "moon-cloud"
  | "cloud"
  | "fog"
  | "drizzle"
  | "rain"
  | "heavy-rain"
  | "snow"
  | "sleet"
  | "storm"
  | "hail";

export type Mood = "clear-day" | "clear-night" | "cloudy" | "rain" | "storm" | "snow" | "fog";

export interface CodeInfo {
  label: string;
  icon: IconKind;
  mood: Mood;
  phenomenon?: string;
}

export function describeCode(code: number | null | undefined, isDay = true): CodeInfo {
  const c = code ?? -1;
  switch (c) {
    case 0:
      return { label: "Ciel dégagé", icon: isDay ? "sun" : "moon", mood: isDay ? "clear-day" : "clear-night" };
    case 1:
      return { label: "Principalement dégagé", icon: isDay ? "sun" : "moon", mood: isDay ? "clear-day" : "clear-night", phenomenon: "nuages" };
    case 2:
      return { label: "Partiellement nuageux", icon: isDay ? "sun-cloud" : "moon-cloud", mood: isDay ? "clear-day" : "clear-night", phenomenon: "nuages" };
    case 3:
      return { label: "Couvert", icon: "cloud", mood: "cloudy", phenomenon: "nuages" };
    case 45:
      return { label: "Brouillard", icon: "fog", mood: "fog", phenomenon: "brouillard" };
    case 48:
      return { label: "Brouillard givrant", icon: "fog", mood: "fog", phenomenon: "brouillard" };
    case 51:
      return { label: "Bruine légère", icon: "drizzle", mood: "rain", phenomenon: "pluie" };
    case 53:
      return { label: "Bruine", icon: "drizzle", mood: "rain", phenomenon: "pluie" };
    case 55:
      return { label: "Bruine dense", icon: "drizzle", mood: "rain", phenomenon: "pluie" };
    case 56:
    case 57:
      return { label: "Bruine verglaçante", icon: "sleet", mood: "rain", phenomenon: "froid" };
    case 61:
      return { label: "Pluie faible", icon: "rain", mood: "rain", phenomenon: "pluie" };
    case 63:
      return { label: "Pluie modérée", icon: "rain", mood: "rain", phenomenon: "pluie" };
    case 65:
      return { label: "Pluie forte", icon: "heavy-rain", mood: "rain", phenomenon: "pluie" };
    case 66:
    case 67:
      return { label: "Pluie verglaçante", icon: "sleet", mood: "rain", phenomenon: "froid" };
    case 71:
      return { label: "Neige faible", icon: "snow", mood: "snow", phenomenon: "neige" };
    case 73:
      return { label: "Neige modérée", icon: "snow", mood: "snow", phenomenon: "neige" };
    case 75:
      return { label: "Neige forte", icon: "snow", mood: "snow", phenomenon: "neige" };
    case 77:
      return { label: "Grains de neige", icon: "snow", mood: "snow", phenomenon: "neige" };
    case 80:
      return { label: "Averses faibles", icon: "rain", mood: "rain", phenomenon: "pluie" };
    case 81:
      return { label: "Averses", icon: "rain", mood: "rain", phenomenon: "pluie" };
    case 82:
      return { label: "Averses violentes", icon: "heavy-rain", mood: "storm", phenomenon: "pluie" };
    case 85:
    case 86:
      return { label: "Averses de neige", icon: "snow", mood: "snow", phenomenon: "neige" };
    case 95:
      return { label: "Orage", icon: "storm", mood: "storm", phenomenon: "orages" };
    case 96:
    case 99:
      return { label: "Orage avec grêle", icon: "hail", mood: "storm", phenomenon: "orages" };
    default:
      return { label: "Conditions variables", icon: isDay ? "sun-cloud" : "moon-cloud", mood: "cloudy" };
  }
}

/* ------------------------------------------------------------------ */
/* Formatage                                                            */
/* ------------------------------------------------------------------ */

export type TempUnit = "C" | "F";

export const toUnit = (c: number, u: TempUnit) => (u === "F" ? (c * 9) / 5 + 32 : c);

export function fmtTemp(c: number | null | undefined, u: TempUnit, withUnit = false) {
  if (c === null || c === undefined || Number.isNaN(c)) return "—";
  return `${Math.round(toUnit(c, u))}°${withUnit ? u : ""}`;
}

export function fmtNum(v: number | null | undefined, digits = 0) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return v.toLocaleString("fr-FR", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

const DIRS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];
export const windDir = (deg: number | null | undefined) =>
  deg === null || deg === undefined ? "—" : DIRS[Math.round(((deg % 360) / 22.5)) % 16];

export function beaufort(kmh: number): { force: number; label: string } {
  const t = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];
  const labels = [
    "Calme",
    "Très légère brise",
    "Légère brise",
    "Petite brise",
    "Jolie brise",
    "Bonne brise",
    "Vent frais",
    "Grand frais",
    "Coup de vent",
    "Fort coup de vent",
    "Tempête",
    "Violente tempête",
    "Ouragan",
  ];
  let f = t.findIndex((x) => kmh < x);
  if (f === -1) f = 12;
  return { force: f, label: labels[f] };
}

/** Les heures retournées par Open-Meteo sont dans le fuseau du lieu : on les manipule comme des chaînes. */
export const hourOf = (t: string) => `${t.slice(11, 13)}h`;
export const hm = (t: string) => t.slice(11, 16).replace(":", "h");

const dateFromLocal = (t: string) => new Date(`${t.slice(0, 10)}T12:00:00`);

export function dayName(t: string, style: "short" | "long" = "short") {
  return dateFromLocal(t).toLocaleDateString("fr-FR", { weekday: style });
}

export function dayLabel(t: string, todayStr?: string) {
  const d = t.slice(0, 10);
  if (todayStr) {
    if (d === todayStr) return "Aujourd'hui";
    const tomorrow = addDays(todayStr, 1);
    if (d === tomorrow) return "Demain";
    if (d === addDays(todayStr, -1)) return "Hier";
  }
  return capitalize(dateFromLocal(t).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }));
}

export const shortDate = (t: string) =>
  dateFromLocal(t).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

export function addDays(day: string, n: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function fmtDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h} h ${String(m).padStart(2, "0")}`;
}

/** Index de l'heure courante dans le tableau horaire (heures locales) */
export function nowIndex(times: string[], currentTime: string) {
  const key = `${currentTime.slice(0, 13)}:00`;
  const i = times.indexOf(key);
  if (i >= 0) return i;
  const j = times.findIndex((t) => t > currentTime);
  return j > 0 ? j - 1 : 0;
}

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function sum(arr: (number | null | undefined)[]) {
  return arr.reduce<number>((s, v) => s + (v ?? 0), 0);
}
export function maxOf(arr: (number | null | undefined)[]) {
  const v = arr.filter((x): x is number => x !== null && x !== undefined && !Number.isNaN(x));
  return v.length ? Math.max(...v) : NaN;
}
export function minOf(arr: (number | null | undefined)[]) {
  const v = arr.filter((x): x is number => x !== null && x !== undefined && !Number.isNaN(x));
  return v.length ? Math.min(...v) : NaN;
}
export function meanOf(arr: (number | null | undefined)[]) {
  const v = arr.filter((x): x is number => x !== null && x !== undefined && !Number.isNaN(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
}

/* ------------------------------------------------------------------ */
/* Phase de la Lune (calcul astronomique, algorithme de Conway amélioré) */
/* ------------------------------------------------------------------ */

export function moonPhase(date = new Date()) {
  const synodic = 29.530588853;
  const ref = Date.UTC(2000, 0, 6, 18, 14); // nouvelle lune de référence
  const days = (date.getTime() - ref) / 86400000;
  const age = ((days % synodic) + synodic) % synodic;
  const fraction = age / synodic;
  const illumination = (1 - Math.cos(2 * Math.PI * fraction)) / 2;
  const names = [
    "Nouvelle lune",
    "Premier croissant",
    "Premier quartier",
    "Gibbeuse croissante",
    "Pleine lune",
    "Gibbeuse décroissante",
    "Dernier quartier",
    "Dernier croissant",
  ];
  const name = names[Math.round(fraction * 8) % 8];
  return { age, fraction, illumination, name };
}

/** Thème visuel d'origine du site (dégradés selon le temps). */
export type SkyTheme =
  | "theme-sunny-day"
  | "theme-partly-cloudy"
  | "theme-cloudy"
  | "theme-rainy"
  | "theme-stormy"
  | "theme-snowy"
  | "theme-clear-night";

export function themeOf(code: number | null | undefined, isDay: boolean): SkyTheme {
  const c = code ?? 0;
  if (c >= 95) return "theme-stormy";
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return "theme-snowy";
  if (c >= 51) return "theme-rainy";
  if (c === 45 || c === 48 || c === 3) return "theme-cloudy";
  if (!isDay) return "theme-clear-night";
  if (c === 2) return "theme-partly-cloudy";
  return "theme-sunny-day";
}

/** Échelle de couleurs douce (pastel) pour les températures, en °C. */
export function softTempColor(c: number) {
  const stops: [number, [number, number, number]][] = [
    [-10, [146, 168, 224]],
    [0, [156, 196, 236]],
    [7, [160, 214, 214]],
    [13, [182, 222, 178]],
    [18, [238, 214, 140]],
    [23, [244, 184, 120]],
    [29, [238, 146, 108]],
    [36, [214, 112, 112]],
  ];
  if (c <= stops[0][0]) return `rgb(${stops[0][1].join(",")})`;
  for (let i = 1; i < stops.length; i++) {
    if (c <= stops[i][0]) {
      const [a, ca] = stops[i - 1];
      const [b, cb] = stops[i];
      const t = (c - a) / (b - a);
      return `rgb(${ca.map((v, k) => Math.round(v + (cb[k] - v) * t)).join(",")})`;
    }
  }
  return `rgb(${stops[stops.length - 1][1].join(",")})`;
}
