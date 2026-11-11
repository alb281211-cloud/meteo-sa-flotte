import type { Forecast } from "./api";
import { hm, dayLabel, maxOf, minOf } from "./weather";

export type RiskId = "orages" | "vent" | "pluie" | "neige" | "brouillard" | "chaleur" | "froid" | "uv";

export interface Risk {
  id: RiskId;
  label: string;
  /** 0 = rien à signaler, 1 = attention, 2 = marqué, 3 = fort */
  level: 0 | 1 | 2 | 3;
  value: string;
  detail: string;
  when?: string;
}

export const LEVEL_LABEL = ["Faible", "À surveiller", "Marqué", "Fort"] as const;

function argMax(arr: (number | null)[]) {
  let bi = -1;
  let bv = -Infinity;
  arr.forEach((v, i) => {
    if (v !== null && v > bv) {
      bv = v;
      bi = i;
    }
  });
  return bi;
}
function argMin(arr: (number | null)[]) {
  let bi = -1;
  let bv = Infinity;
  arr.forEach((v, i) => {
    if (v !== null && v < bv) {
      bv = v;
      bi = i;
    }
  });
  return bi;
}

/**
 * Indicateurs de risque calculés à partir des prévisions horaires réelles.
 * Il ne s'agit pas d'une vigilance officielle.
 */
export function computeRisks(fc: Forecast, from: number, hours = 48): Risk[] {
  const h = fc.hourly;
  const to = Math.min(h.time.length, from + hours);
  const sl = <T,>(a: T[]) => a.slice(from, to);
  const times = sl(h.time);
  const today = fc.current.time.slice(0, 10);
  const when = (i: number) => (i < 0 ? undefined : `${dayLabel(times[i], today)} · ${hm(times[i])}`);

  const cape = sl(h.cape);
  const li = sl(h.lifted_index);
  const codes = sl(h.weather_code);
  const capeMax = maxOf(cape);
  const liMin = minOf(li);
  const stormCode = codes.findIndex((c) => (c ?? 0) >= 95);
  let storm: Risk["level"] = 0;
  if (stormCode >= 0 && (capeMax > 1500 || codes.some((c) => (c ?? 0) >= 96))) storm = 3;
  else if (stormCode >= 0 || (capeMax > 1000 && liMin < -2)) storm = 2;
  else if (capeMax > 400 && liMin < 0) storm = 1;
  const stormAt = stormCode >= 0 ? stormCode : argMax(cape);

  const gusts = sl(h.wind_gusts_10m);
  const gMax = maxOf(gusts);
  const wind: Risk["level"] = gMax >= 100 ? 3 : gMax >= 80 ? 2 : gMax >= 60 ? 1 : 0;

  const pr = sl(h.precipitation);
  let best24 = 0;
  let best24At = -1;
  for (let i = 0; i < pr.length; i++) {
    let s = 0;
    for (let j = i; j < Math.min(pr.length, i + 24); j++) s += pr[j] ?? 0;
    if (s > best24) {
      best24 = s;
      best24At = i;
    }
  }
  const prMax = maxOf(pr);
  const rain: Risk["level"] = best24 >= 50 || prMax >= 15 ? 3 : best24 >= 25 || prMax >= 8 ? 2 : best24 >= 10 ? 1 : 0;

  const snow = sl(h.snowfall);
  const snowSum = snow.reduce<number>((s, v) => s + (v ?? 0), 0);
  const snowL: Risk["level"] = snowSum >= 10 ? 3 : snowSum >= 3 ? 2 : snowSum > 0.2 ? 1 : 0;

  const vis = sl(h.visibility);
  const visMin = minOf(vis);
  const fog: Risk["level"] = visMin < 200 ? 3 : visMin < 500 ? 2 : visMin < 1000 ? 1 : 0;

  const t = sl(h.temperature_2m);
  const tMax = maxOf(t);
  const tMin = minOf(t);
  const heat: Risk["level"] = tMax >= 38 ? 3 : tMax >= 33 ? 2 : tMax >= 30 ? 1 : 0;
  const cold: Risk["level"] = tMin <= -10 ? 3 : tMin <= -5 ? 2 : tMin <= 0 ? 1 : 0;

  const uv = sl(h.uv_index);
  const uvMax = maxOf(uv);
  const uvL: Risk["level"] = uvMax >= 8 ? 3 : uvMax >= 6 ? 2 : uvMax >= 3 ? 1 : 0;

  const f0 = (n: number, d = 0) => (Number.isFinite(n) ? n.toLocaleString("fr-FR", { maximumFractionDigits: d }) : "—");

  return [
    {
      id: "orages",
      label: "Orages",
      level: storm,
      value: `CAPE ${f0(capeMax)} J/kg`,
      detail:
        stormCode >= 0
          ? "Des orages figurent dans la prévision."
          : storm
            ? "L'atmosphère devient instable : des cellules orageuses sont possibles."
            : "L'atmosphère reste stable.",
      when: storm ? when(stormAt) : undefined,
    },
    {
      id: "vent",
      label: "Vent",
      level: wind,
      value: `Rafales ${f0(gMax)} km/h`,
      detail: wind ? "Des rafales soutenues sont attendues." : "Pas de vent fort attendu.",
      when: wind ? when(argMax(gusts)) : undefined,
    },
    {
      id: "pluie",
      label: "Fortes pluies",
      level: rain,
      value: `${f0(best24, 1)} mm / 24 h`,
      detail: rain ? `Intensité horaire jusqu'à ${f0(prMax, 1)} mm.` : "Pas de cumul important.",
      when: rain ? when(best24At) : undefined,
    },
    {
      id: "neige",
      label: "Neige",
      level: snowL,
      value: `${f0(snowSum, 1)} cm`,
      detail: snowL ? "De la neige fraîche est attendue." : "Pas de neige prévue.",
      when: snowL ? when(snow.findIndex((v) => (v ?? 0) > 0)) : undefined,
    },
    {
      id: "brouillard",
      label: "Brouillard",
      level: fog,
      value: `Visibilité min. ${f0(visMin / 1000, 1)} km`,
      detail: fog ? "La visibilité va baisser fortement." : "Bonne visibilité attendue.",
      when: fog ? when(argMin(vis)) : undefined,
    },
    {
      id: "chaleur",
      label: "Chaleur",
      level: heat,
      value: `Max. ${f0(tMax)} °C`,
      detail: heat ? "Des températures élevées sont attendues." : "Pas de chaleur excessive.",
      when: heat ? when(argMax(t)) : undefined,
    },
    {
      id: "froid",
      label: "Gel et froid",
      level: cold,
      value: `Min. ${f0(tMin)} °C`,
      detail: cold ? "Les températures passent sous zéro." : "Pas de gel attendu.",
      when: cold ? when(argMin(t)) : undefined,
    },
    {
      id: "uv",
      label: "UV",
      level: uvL,
      value: `Indice max. ${f0(uvMax, 1)}`,
      detail: uvL >= 2 ? "Protection solaire nécessaire." : uvL ? "Protection conseillée aux heures centrales." : "Exposition faible.",
      when: uvL ? when(argMax(uv)) : undefined,
    },
  ];
}
