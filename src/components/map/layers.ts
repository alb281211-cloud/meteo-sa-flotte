/** Catalogue des couches cartographiques (sans dépendance à Leaflet). */

export type LayerId = "radar" | "infrared" | "geocolor" | "truecolor" | "lightning" | "temperature" | "wind" | "precip" | "clouds";

export type GridLayerId = "temperature" | "wind" | "precip" | "clouds";

export interface LayerDef {
  id: LayerId;
  label: string;
  group: "Observations" | "Satellite" | "Prévisions";
  source: string;
  description: string;
  coverage?: string;
}

export const LAYERS: LayerDef[] = [
  {
    id: "radar",
    label: "Radar pluie",
    group: "Observations",
    source: "RainViewer",
    description: "Échos radar des 2 dernières heures, animés toutes les 10 minutes.",
  },
  {
    id: "lightning",
    label: "Éclairs",
    group: "Observations",
    source: "EUMETSAT · MTG Lightning Imager",
    description: "Surface couverte par les éclairs détectés depuis l'orbite géostationnaire.",
    coverage: "Europe, Afrique, Atlantique",
  },
  {
    id: "infrared",
    label: "Infrarouge",
    group: "Satellite",
    source: "EUMETSAT · Meteosat 10,8 µm",
    description: "Température du sommet des nuages. Les sommets les plus blancs sont les plus hauts. Disponible de jour comme de nuit.",
    coverage: "Europe, Afrique, Atlantique",
  },
  {
    id: "geocolor",
    label: "Couleurs naturelles",
    group: "Satellite",
    source: "EUMETSAT · MTG GeoColour",
    description: "Composition en couleurs naturelles le jour et infrarouge la nuit, actualisée toutes les 10 minutes.",
    coverage: "Europe, Afrique, Atlantique",
  },
  {
    id: "truecolor",
    label: "Vue du jour (haute déf.)",
    group: "Satellite",
    source: "NASA GIBS · VIIRS NOAA-20",
    description: "Mosaïque mondiale en vraies couleurs du passage satellite de la veille.",
  },
  {
    id: "temperature",
    label: "Températures",
    group: "Prévisions",
    source: "Open-Meteo",
    description: "Température prévue sur une grille de points, heure par heure.",
  },
  {
    id: "wind",
    label: "Vent",
    group: "Prévisions",
    source: "Open-Meteo",
    description: "Direction et vitesse du vent prévues, heure par heure.",
  },
  {
    id: "precip",
    label: "Précipitations",
    group: "Prévisions",
    source: "Open-Meteo",
    description: "Cumul de précipitations prévu par heure.",
  },
  {
    id: "clouds",
    label: "Nébulosité",
    group: "Prévisions",
    source: "Open-Meteo",
    description: "Couverture nuageuse prévue.",
  },
];

export const isGridLayer = (id: LayerId): id is GridLayerId =>
  id === "temperature" || id === "wind" || id === "precip" || id === "clouds";

export const isLayerId = (s: string): s is LayerId => LAYERS.some((l) => l.id === s);

export function tempColor(c: number) {
  const stops: [number, [number, number, number]][] = [
    [-20, [62, 76, 168]],
    [-8, [74, 128, 210]],
    [0, [138, 184, 226]],
    [8, [196, 214, 200]],
    [14, [230, 216, 160]],
    [20, [240, 172, 92]],
    [27, [222, 108, 52]],
    [35, [176, 50, 40]],
    [42, [110, 24, 40]],
  ];
  if (c <= stops[0][0]) return `rgb(${stops[0][1].join(",")})`;
  for (let i = 1; i < stops.length; i++) {
    if (c <= stops[i][0]) {
      const [a, ca] = stops[i - 1];
      const [b, cb] = stops[i];
      const t = (c - a) / (b - a);
      const mix = ca.map((v, k) => Math.round(v + (cb[k] - v) * t));
      return `rgb(${mix.join(",")})`;
    }
  }
  return `rgb(${stops[stops.length - 1][1].join(",")})`;
}
