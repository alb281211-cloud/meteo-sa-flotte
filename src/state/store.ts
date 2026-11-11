import { useSyncExternalStore } from "react";
import type { Place } from "../lib/api";
import type { TempUnit } from "../lib/weather";

export type WidgetId =
  | "now"
  | "nowcast"
  | "risks"
  | "hourly"
  | "daily"
  | "map"
  | "temperature"
  | "precip"
  | "wind"
  | "pressure"
  | "humidity"
  | "clouds"
  | "air"
  | "sun"
  | "uv"
  | "visibility"
  | "favorites";

export const ALL_WIDGETS: { id: WidgetId; label: string; hint: string }[] = [
  { id: "now", label: "Conditions actuelles", hint: "Température, ressenti, ciel" },
  { id: "nowcast", label: "Pluie dans les 8 h", hint: "Précipitations au quart d'heure" },
  { id: "risks", label: "Risques météo", hint: "Orages, vent, pluie, chaleur…" },
  { id: "hourly", label: "Heure par heure", hint: "48 prochaines heures" },
  { id: "daily", label: "Prévisions 16 jours", hint: "Jour par jour" },
  { id: "map", label: "Carte radar", hint: "Radar et satellite" },
  { id: "temperature", label: "Graphique température", hint: "Température et ressenti" },
  { id: "precip", label: "Graphique précipitations", hint: "Cumuls et probabilités" },
  { id: "wind", label: "Vent", hint: "Vitesse, rafales, direction" },
  { id: "pressure", label: "Pression", hint: "Tendance barométrique" },
  { id: "humidity", label: "Humidité", hint: "Humidité et point de rosée" },
  { id: "clouds", label: "Nuages", hint: "Couverture par étage" },
  { id: "air", label: "Qualité de l'air", hint: "Indice européen et pollens" },
  { id: "sun", label: "Soleil et Lune", hint: "Lever, coucher, phase" },
  { id: "uv", label: "Indice UV", hint: "Exposition solaire" },
  { id: "visibility", label: "Visibilité", hint: "Brouillard et brume" },
  { id: "favorites", label: "Lieux enregistrés", hint: "Vos villes favorites" },
];

export const DEFAULT_WIDGETS: WidgetId[] = [
  "now",
  "air",
  "daily",
  "hourly",
  "nowcast",
  "wind",
  "humidity",
  "pressure",
  "visibility",
  "uv",
  "risks",
  "temperature",
  "map",
  "precip",
  "clouds",
  "sun",
  "favorites",
];

export interface AppState {
  unit: TempUnit;
  theme: "light" | "dark";
  favorites: Place[];
  place: Place | null;
  widgets: WidgetId[];
  compare: Place[];
}

const KEY = "meteo-state-v2";
const LAYOUT_VERSION = 2;

function load(): AppState {
  const base: AppState = {
    unit: "C",
    theme: window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light",
    favorites: [],
    place: null,
    widgets: DEFAULT_WIDGETS,
    compare: [],
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<AppState>;
      const stale = (s as { layout?: number }).layout !== LAYOUT_VERSION;
      const widgets = stale ? DEFAULT_WIDGETS : (s.widgets ?? DEFAULT_WIDGETS).filter((w) => ALL_WIDGETS.some((x) => x.id === w));
      return { ...base, ...s, widgets };
    }
    // Reprise des préférences de l'ancienne version du site
    const theme = localStorage.getItem("theme");
    if (theme === "light" || theme === "dark") base.theme = theme;
    const unit = localStorage.getItem("meteo-unit");
    if (unit === "C" || unit === "F") base.unit = unit;
    const fav = localStorage.getItem("favorites");
    if (fav) {
      const arr = JSON.parse(fav) as { id?: string | number; name: string; lat: number; lon: number }[];
      base.favorites = arr
        .filter((f) => typeof f.lat === "number" && typeof f.lon === "number")
        .map((f) => ({ id: String(f.id ?? `${f.lat},${f.lon}`), name: f.name, lat: f.lat, lon: f.lon }));
    }
  } catch {
    /* état par défaut */
  }
  return base;
}

let state: AppState = load();
const listeners = new Set<() => void>();

export function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  const p = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...p };
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...state, layout: LAYOUT_VERSION }));
  } catch {
    /* stockage indisponible */
  }
  listeners.forEach((l) => l());
}

export const getState = () => state;

export function useStore<T>(sel: (s: AppState) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => sel(state),
  );
}

export const DEFAULT_PLACE: Place = { id: "2988507", name: "Paris", lat: 48.8566, lon: 2.3522, country: "France" };

export function usePlace(): Place {
  return useStore((s) => s.place) ?? DEFAULT_PLACE;
}

export const placeKey = (p: Place) => `${p.lat.toFixed(3)},${p.lon.toFixed(3)}`;

export function toggleFavorite(p: Place) {
  setState((s) => {
    const exists = s.favorites.some((f) => placeKey(f) === placeKey(p));
    return { favorites: exists ? s.favorites.filter((f) => placeKey(f) !== placeKey(p)) : [...s.favorites, p] };
  });
}

export function selectPlace(p: Place) {
  setState({ place: p });
}
