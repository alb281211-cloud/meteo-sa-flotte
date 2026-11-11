import type { Forecast, HourlyKey } from "./api";
import { toUnit, type TempUnit } from "./weather";

export type MetricId =
  | "temperature"
  | "apparent"
  | "dewpoint"
  | "precipitation"
  | "probability"
  | "snowfall"
  | "wind"
  | "gusts"
  | "pressure"
  | "humidity"
  | "clouds"
  | "clouds_low"
  | "clouds_mid"
  | "clouds_high"
  | "visibility"
  | "uv"
  | "cape"
  | "lifted"
  | "freezing"
  | "radiation";

export interface Metric {
  id: MetricId;
  label: string;
  hourly: HourlyKey;
  color: string;
  kind: "line" | "area" | "bar";
  digits: number;
  temp?: boolean;
  zeroBase?: boolean;
  unit: string;
  description: string;
  phenomenon?: string;
  /** conversion d'affichage (ex. mètres → km) */
  scale?: number;
  thresholds?: { value: number; label: string }[];
}

export const METRICS: Record<MetricId, Metric> = {
  temperature: {
    id: "temperature",
    label: "Température",
    hourly: "temperature_2m",
    color: "var(--c-temp)",
    kind: "line",
    digits: 1,
    temp: true,
    unit: "°",
    description: "Température de l'air mesurée à 2 m du sol, sous abri.",
    phenomenon: "chaleur",
  },
  apparent: {
    id: "apparent",
    label: "Ressenti",
    hourly: "apparent_temperature",
    color: "var(--c-temp)",
    kind: "line",
    digits: 1,
    temp: true,
    unit: "°",
    description: "Température perçue par le corps, en combinant vent, humidité et rayonnement.",
    phenomenon: "froid",
  },
  dewpoint: {
    id: "dewpoint",
    label: "Point de rosée",
    hourly: "dew_point_2m",
    color: "var(--c-humid)",
    kind: "line",
    digits: 1,
    temp: true,
    unit: "°",
    description: "Température à laquelle l'air devient saturé. Au-delà de 20 °C, l'air est lourd et étouffant.",
    phenomenon: "brouillard",
  },
  precipitation: {
    id: "precipitation",
    label: "Précipitations",
    hourly: "precipitation",
    color: "var(--c-rain)",
    kind: "bar",
    digits: 1,
    zeroBase: true,
    unit: "mm",
    description: "Cumul horaire de pluie, d'averses et de neige fondue.",
    phenomenon: "pluie",
  },
  probability: {
    id: "probability",
    label: "Probabilité de pluie",
    hourly: "precipitation_probability",
    color: "var(--c-rain)",
    kind: "area",
    digits: 0,
    zeroBase: true,
    unit: "%",
    description: "Probabilité que plus de 0,1 mm tombe dans l'heure, d'après les ensembles de modèles.",
    phenomenon: "pluie",
  },
  snowfall: {
    id: "snowfall",
    label: "Chute de neige",
    hourly: "snowfall",
    color: "var(--c-snow)",
    kind: "bar",
    digits: 1,
    zeroBase: true,
    unit: "cm",
    description: "Hauteur de neige fraîche attendue par heure.",
    phenomenon: "neige",
  },
  wind: {
    id: "wind",
    label: "Vent moyen",
    hourly: "wind_speed_10m",
    color: "var(--c-wind)",
    kind: "line",
    digits: 0,
    zeroBase: true,
    unit: "km/h",
    description: "Vitesse moyenne du vent à 10 m de hauteur.",
    phenomenon: "vent",
  },
  gusts: {
    id: "gusts",
    label: "Rafales",
    hourly: "wind_gusts_10m",
    color: "var(--c-wind)",
    kind: "area",
    digits: 0,
    zeroBase: true,
    unit: "km/h",
    description: "Pointes de vent maximales attendues dans l'heure.",
    phenomenon: "vent",
    thresholds: [
      { value: 60, label: "60 · vent fort" },
      { value: 90, label: "90 · tempête" },
    ],
  },
  pressure: {
    id: "pressure",
    label: "Pression",
    hourly: "pressure_msl",
    color: "var(--c-press)",
    kind: "line",
    digits: 0,
    unit: "hPa",
    description: "Pression atmosphérique ramenée au niveau de la mer. 1013 hPa est la valeur de référence.",
    phenomenon: "pression",
    thresholds: [{ value: 1013, label: "1013" }],
  },
  humidity: {
    id: "humidity",
    label: "Humidité",
    hourly: "relative_humidity_2m",
    color: "var(--c-humid)",
    kind: "area",
    digits: 0,
    zeroBase: true,
    unit: "%",
    description: "Humidité relative de l'air à 2 m.",
    phenomenon: "brouillard",
  },
  clouds: {
    id: "clouds",
    label: "Nébulosité totale",
    hourly: "cloud_cover",
    color: "var(--c-cloud)",
    kind: "area",
    digits: 0,
    zeroBase: true,
    unit: "%",
    description: "Part du ciel couverte par les nuages, tous étages confondus.",
    phenomenon: "nuages",
  },
  clouds_low: {
    id: "clouds_low",
    label: "Nuages bas",
    hourly: "cloud_cover_low",
    color: "var(--c-cloud)",
    kind: "area",
    digits: 0,
    zeroBase: true,
    unit: "%",
    description: "Nuages sous 2 000 m : stratus, stratocumulus, brouillard élevé.",
    phenomenon: "nuages",
  },
  clouds_mid: {
    id: "clouds_mid",
    label: "Nuages moyens",
    hourly: "cloud_cover_mid",
    color: "var(--c-cloud)",
    kind: "area",
    digits: 0,
    zeroBase: true,
    unit: "%",
    description: "Nuages entre 2 000 et 6 000 m : altostratus, altocumulus.",
    phenomenon: "nuages",
  },
  clouds_high: {
    id: "clouds_high",
    label: "Nuages hauts",
    hourly: "cloud_cover_high",
    color: "var(--c-cloud)",
    kind: "area",
    digits: 0,
    zeroBase: true,
    unit: "%",
    description: "Nuages au-dessus de 6 000 m : cirrus, cirrostratus.",
    phenomenon: "nuages",
  },
  visibility: {
    id: "visibility",
    label: "Visibilité",
    hourly: "visibility",
    color: "var(--c-cloud)",
    kind: "line",
    digits: 1,
    zeroBase: true,
    unit: "km",
    scale: 0.001,
    description: "Distance horizontale à laquelle on distingue un objet. Sous 1 km, on parle de brouillard.",
    phenomenon: "brouillard",
    thresholds: [{ value: 1, label: "1 km · brouillard" }],
  },
  uv: {
    id: "uv",
    label: "Indice UV",
    hourly: "uv_index",
    color: "var(--c-uv)",
    kind: "area",
    digits: 1,
    zeroBase: true,
    unit: "",
    description: "Intensité du rayonnement ultraviolet. À partir de 6, une protection est nécessaire.",
    phenomenon: "uv",
    thresholds: [
      { value: 3, label: "3 · modéré" },
      { value: 6, label: "6 · élevé" },
      { value: 8, label: "8 · très élevé" },
    ],
  },
  cape: {
    id: "cape",
    label: "Énergie convective (CAPE)",
    hourly: "cape",
    color: "var(--c-storm)",
    kind: "area",
    digits: 0,
    zeroBase: true,
    unit: "J/kg",
    description: "Énergie disponible pour faire monter une particule d'air. Au-delà de 1 000 J/kg, des orages peuvent se former.",
    phenomenon: "orages",
    thresholds: [
      { value: 1000, label: "1000 · orages possibles" },
      { value: 2500, label: "2500 · orages violents" },
    ],
  },
  lifted: {
    id: "lifted",
    label: "Indice de soulèvement",
    hourly: "lifted_index",
    color: "var(--c-storm)",
    kind: "line",
    digits: 1,
    unit: "K",
    description: "Une valeur négative signale une atmosphère instable. Sous −4 K, l'instabilité est forte.",
    phenomenon: "orages",
    thresholds: [
      { value: 0, label: "0 · stable / instable" },
      { value: -4, label: "−4 · très instable" },
    ],
  },
  freezing: {
    id: "freezing",
    label: "Isotherme 0 °C",
    hourly: "freezing_level_height",
    color: "var(--c-snow)",
    kind: "line",
    digits: 0,
    zeroBase: true,
    unit: "m",
    description: "Altitude à laquelle la température passe sous 0 °C. Elle donne la limite pluie-neige.",
    phenomenon: "neige",
  },
  radiation: {
    id: "radiation",
    label: "Rayonnement solaire",
    hourly: "shortwave_radiation",
    color: "var(--c-uv)",
    kind: "area",
    digits: 0,
    zeroBase: true,
    unit: "W/m²",
    description: "Énergie solaire reçue au sol. Elle est utile pour estimer la production photovoltaïque.",
    phenomenon: "uv",
  },
};

export const METRIC_GROUPS: { label: string; ids: MetricId[] }[] = [
  { label: "Température", ids: ["temperature", "apparent", "dewpoint"] },
  { label: "Précipitations", ids: ["precipitation", "probability", "snowfall", "freezing"] },
  { label: "Vent", ids: ["wind", "gusts"] },
  { label: "Atmosphère", ids: ["pressure", "humidity", "visibility"] },
  { label: "Nuages", ids: ["clouds", "clouds_low", "clouds_mid", "clouds_high"] },
  { label: "Orages", ids: ["cape", "lifted"] },
  { label: "Soleil", ids: ["uv", "radiation"] },
];

export function metricUnit(m: Metric, u: TempUnit) {
  return m.temp ? `°${u}` : m.unit;
}

export function metricValues(m: Metric, fc: Forecast, u: TempUnit, from = 0, to?: number) {
  const raw = (fc.hourly[m.hourly] ?? []).slice(from, to);
  return raw.map((v) => {
    if (v === null || v === undefined) return null;
    if (m.temp) return toUnit(v, u);
    if (m.scale) return v * m.scale;
    return v;
  });
}

export function formatMetric(m: Metric, v: number | null | undefined, u: TempUnit) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const n = v.toLocaleString("fr-FR", { maximumFractionDigits: m.digits });
  const unit = metricUnit(m, u);
  return m.temp ? `${n}${unit}` : unit ? `${n} ${unit}` : n;
}

export const isMetricId = (s: string | null | undefined): s is MetricId => !!s && s in METRICS;
