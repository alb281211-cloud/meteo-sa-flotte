import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useQuery } from "@tanstack/react-query";
import { Pause, Play, MapPin } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { PageHead, Source } from "../components/common";
import { WeatherIcon } from "../components/WeatherIcon";
import { fetchPoints } from "../lib/api";
import { CITIES } from "../lib/cities";
import { useGrid } from "../lib/queries";
import { describeCode, fmtNum, fmtTemp, softTempColor } from "../lib/weather";
import { selectPlace, usePlace, useStore } from "../state/store";

type VarId = "temperature_2m" | "precipitation" | "wind_gusts_10m" | "cloud_cover";
const VARS: { id: VarId; label: string }[] = [
  { id: "temperature_2m", label: "Températures" },
  { id: "precipitation", label: "Pluie" },
  { id: "wind_gusts_10m", label: "Rafales" },
  { id: "cloud_cover", label: "Nuages" },
];
const ZOOMS = [
  { z: 9, l: "Local" },
  { z: 7, l: "Région" },
  { z: 6, l: "Pays" },
  { z: 4, l: "Europe" },
];

type RGBA = [number, number, number, number];
function rgba(v: VarId, x: number): RGBA {
  if (v === "temperature_2m") {
    const m = softTempColor(x).match(/\d+/g)!.map(Number);
    return [m[0], m[1], m[2], 165];
  }
  if (v === "precipitation") return x < 0.05 ? [0, 0, 0, 0] : [92, 150, 230, Math.min(200, 70 + x * 45)];
  if (v === "wind_gusts_10m") return [150, 120, 220, Math.min(190, x * 2.2)];
  return [150, 156, 170, Math.min(185, x * 1.8)];
}

function chipColor(v: VarId, x: number) {
  if (v === "temperature_2m") return softTempColor(x);
  if (v === "precipitation") return x >= 0.1 ? "#7fb0ee" : "#e9eef4";
  if (v === "wind_gusts_10m") return x >= 60 ? "#c4a8f0" : x >= 30 ? "#ddd0f6" : "#eeeaf7";
  return x >= 70 ? "#c9ced8" : x >= 30 ? "#dde1e8" : "#f1f3f6";
}

/** Analyse régionale : carte avec champ de valeurs lissé, villes réelles et lecture animée sur 48 h. */
export default function Region() {
  const place = usePlace();
  const unit = useStore((s) => s.unit);
  const theme = useStore((s) => s.theme);
  const nav = useNavigate();
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const base = useRef<L.TileLayer | null>(null);
  const overlay = useRef<L.ImageOverlay | null>(null);
  const labels = useRef<L.LayerGroup | null>(null);
  const [v, setV] = useState<VarId>("temperature_2m");
  const [hour, setHour] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(7);
  const [bbox, setBbox] = useState<[number, number, number, number] | null>(null);
  const [sel, setSel] = useState<number | null>(null);

  /* carte */
  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { center: [place.lat, place.lon], zoom: 7, zoomControl: false, minZoom: 3, maxZoom: 11 });
    L.control.zoom({ position: "bottomright" }).addTo(m);
    labels.current = L.layerGroup().addTo(m);
    m.createPane("labels");
    m.getPane("labels")!.style.zIndex = "650";
    let t: ReturnType<typeof setTimeout>;
    const upd = () => {
      const b = m.getBounds();
      setBbox([Math.max(-80, b.getSouth()), Math.max(-179, b.getWest()), Math.min(80, b.getNorth()), Math.min(179, b.getEast())]);
      setZoom(m.getZoom());
    };
    m.on("moveend", () => {
      clearTimeout(t);
      t = setTimeout(upd, 300);
    });
    upd();
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    map.current?.flyTo([place.lat, place.lon], map.current.getZoom(), { duration: 1.4 });
  }, [place.lat, place.lon]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    base.current?.remove();
    base.current = L.tileLayer(
      theme === "dark"
        ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        : "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Esri, HERE, Garmin, © OpenStreetMap", maxZoom: 16 },
    ).addTo(m);
  }, [theme]);

  /* données : champ lissé + villes visibles */
  const grid = useGrid(bbox, 10, 12, ["temperature_2m", "precipitation", "wind_gusts_10m", "cloud_cover"], 48);
  const cities = useMemo(() => {
    if (!bbox) return [];
    const [s, w, n, e] = bbox;
    const minD = Math.max((e - w) / 11, (n - s) / 9);
    const picked: { name: string; lat: number; lon: number; here?: boolean }[] = [{ name: place.name, lat: place.lat, lon: place.lon, here: true }];
    for (const [name, lat, lon] of CITIES) {
      if (lat < s || lat > n || lon < w || lon > e) continue;
      if (picked.some((p) => Math.hypot(p.lat - lat, (p.lon - lon) * Math.cos((lat * Math.PI) / 180)) < minD * 0.8)) continue;
      picked.push({ name, lat, lon });
      if (picked.length >= 40) break;
    }
    return picked;
  }, [bbox, place]);
  const pts = useQuery({
    queryKey: ["region-pts", cities.map((c) => `${c.lat},${c.lon}`).join("|")],
    queryFn: () => fetchPoints(cities, ["temperature_2m", "precipitation", "wind_gusts_10m", "cloud_cover", "weather_code", "is_day"], 48),
    enabled: cities.length > 0,
    staleTime: 20 * 60 * 1000,
    placeholderData: (p) => p,
  });
  const ptsOk = pts.data && pts.data.values.temperature_2m.length === cities.length;

  /* champ coloré lissé (interpolation bilinéaire par le navigateur) */
  useEffect(() => {
    const m = map.current;
    const d = grid.data;
    if (!m || !d) return;
    const small = document.createElement("canvas");
    small.width = d.cols;
    small.height = d.rows;
    const ctx = small.getContext("2d")!;
    const img = ctx.createImageData(d.cols, d.rows);
    d.values[v].forEach((series, i) => {
      const x = series[hour];
      const c: RGBA = x === null || x === undefined ? [0, 0, 0, 0] : rgba(v, x);
      img.data.set(c, i * 4);
    });
    ctx.putImageData(img, 0, 0);
    const big = document.createElement("canvas");
    big.width = d.cols * 40;
    big.height = d.rows * 40;
    const bctx = big.getContext("2d")!;
    bctx.imageSmoothingEnabled = true;
    bctx.imageSmoothingQuality = "high";
    bctx.filter = "blur(18px)";
    bctx.drawImage(small, -0.5 * 40, -0.5 * 40, big.width + 40, big.height + 40);
    const url = big.toDataURL();
    const lat = d.lats;
    const lon = d.lons;
    const dLat = (lat[0] - lat[d.cols]) / 2 || 0.5;
    const dLon = (lon[1] - lon[0]) / 2 || 0.5;
    const bounds = L.latLngBounds([lat[lat.length - 1] - dLat, lon[0] - dLon], [lat[0] + dLat, lon[d.cols - 1] + dLon]);
    if (overlay.current) {
      overlay.current.setUrl(url);
      overlay.current.setBounds(bounds);
    } else {
      overlay.current = L.imageOverlay(url, bounds, { opacity: 0.85, className: "field-layer", interactive: false }).addTo(m);
    }
  }, [grid.data, hour, v]);

  /* étiquettes des villes */
  useEffect(() => {
    const g = labels.current;
    if (!g) return;
    g.clearLayers();
    if (!ptsOk) return;
    const d = pts.data!;
    cities.forEach((c, i) => {
      const x = d.values[v][i]?.[hour];
      if (x === null || x === undefined) return;
      const code = d.values.weather_code[i]?.[hour];
      const day = d.values.is_day[i]?.[hour] === 1;
      const info = describeCode(code, day);
      const val = v === "temperature_2m" ? fmtTemp(x, unit) : v === "precipitation" ? `${fmtNum(x, 1)} mm` : v === "wind_gusts_10m" ? `${Math.round(x)} km/h` : `${Math.round(x)} %`;
      const html = `<div class="cm ${c.here ? "here" : ""} ${sel === i ? "sel" : ""}" style="animation-delay:${Math.min(i * 25, 600)}ms"><span class="cm-ic">${iconEmoji(info.icon)}</span><span class="cm-v" style="background:${chipColor(v, x)}">${val}</span><span class="cm-n">${escapeHtml(c.name)}</span></div>`;
      const mk = L.marker([c.lat, c.lon], { icon: L.divIcon({ className: "cm-wrap", html, iconSize: [0, 0] }), pane: "labels", riseOnHover: true });
      mk.on("click", () => setSel(i));
      mk.addTo(g);
    });
  }, [pts.data, ptsOk, hour, v, unit, sel, cities]);

  /* lecture animée */
  useEffect(() => {
    if (!playing) return;
    const n = grid.data?.time.length ?? 48;
    const t = setInterval(() => setHour((h) => (h + 1) % n), 900);
    return () => clearInterval(t);
  }, [playing, grid.data?.time.length]);

  const time = grid.data?.time[hour] ?? pts.data?.time[hour];
  const ranking = useMemo(() => {
    if (!ptsOk) return [];
    return cities
      .map((c, i) => ({ c, i, x: pts.data!.values[v][i]?.[hour] ?? null, code: pts.data!.values.weather_code[i]?.[hour], day: pts.data!.values.is_day[i]?.[hour] === 1 }))
      .filter((r) => r.x !== null)
      .sort((a, b) => (b.x as number) - (a.x as number));
  }, [ptsOk, pts.data, cities, v, hour]);
  const fmtV = (x: number | null) =>
    x === null ? "—" : v === "temperature_2m" ? fmtTemp(x, unit) : v === "precipitation" ? `${fmtNum(x, 1)} mm` : v === "wind_gusts_10m" ? `${Math.round(x)} km/h` : `${Math.round(x)} %`;
  const selected = sel !== null && ptsOk ? { c: cities[sel], t: pts.data!.values.temperature_2m[sel]?.[hour], p: pts.data!.values.precipitation[sel]?.[hour], g: pts.data!.values.wind_gusts_10m[sel]?.[hour], n: pts.data!.values.cloud_cover[sel]?.[hour], code: pts.data!.values.weather_code[sel]?.[hour], day: pts.data!.values.is_day[sel]?.[hour] === 1 } : null;

  return (
    <div className="page region-page">
      <PageHead kicker="Analyse régionale" title={`Autour de ${place.name}`}>
        <div className="seg">
          {ZOOMS.map((z) => (
            <button key={z.z} className={zoom === z.z ? "on" : ""} onClick={() => map.current?.flyTo([place.lat, place.lon], z.z, { duration: 1.2 })}>
              {z.l}
            </button>
          ))}
        </div>
      </PageHead>

      <div className="region-wrap">
        <div className="region-map card">
          <div ref={el} className="region-canvas" />
          <div className="region-top">
            <div className="seg">
              {VARS.map((x) => (
                <button key={x.id} className={v === x.id ? "on" : ""} onClick={() => setV(x.id)}>
                  {x.label}
                </button>
              ))}
            </div>
            {(grid.isFetching || pts.isFetching) && <span className="region-loading">Mise à jour…</span>}
          </div>
          <div className="region-time">
            <button className="map-btn" onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause" : "Lecture"}>
              {playing ? <Pause size={15} /> : <Play size={15} />}
            </button>
            <input type="range" min={0} max={(grid.data?.time.length ?? 48) - 1} value={hour} onChange={(e) => { setPlaying(false); setHour(+e.target.value); }} aria-label="Heure de prévision" />
            <span className="tl-label">{time ? new Date(time * 1000).toLocaleString("fr-FR", { weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "…"}</span>
          </div>
          {v === "temperature_2m" && (
            <div className="soft-legend">
              {[-5, 0, 5, 10, 15, 20, 25, 30, 35].map((t) => (
                <span key={t} style={{ background: softTempColor(t) }}>{unit === "F" ? Math.round((t * 9) / 5 + 32) : t}°</span>
              ))}
            </div>
          )}
        </div>

        <aside className="region-side">
          {selected ? (
            <div className="card region-sel">
              <div className="rs-head">
                <WeatherIcon kind={describeCode(selected.code, selected.day).icon} size={46} />
                <div>
                  <b>{selected.c.name}</b>
                  <small>{describeCode(selected.code, selected.day).label}</small>
                </div>
                <span className="rs-t">{fmtTemp(selected.t, unit)}</span>
              </div>
              <div className="rs-grid">
                <span><i>Pluie</i>{fmtNum(selected.p, 1)} mm</span>
                <span><i>Rafales</i>{Math.round(selected.g ?? 0)} km/h</span>
                <span><i>Nuages</i>{Math.round(selected.n ?? 0)} %</span>
              </div>
              <button className="btn" onClick={() => { selectPlace({ id: `${selected.c.lat},${selected.c.lon}`, name: selected.c.name, lat: selected.c.lat, lon: selected.c.lon }); nav("/"); }}>
                <MapPin size={14} /> Prévisions complètes
              </button>
            </div>
          ) : (
            <div className="card region-hint small muted">Touchez une ville sur la carte pour voir son détail. Déplacez ou zoomez la carte pour explorer d'autres régions.</div>
          )}
          <div className="card region-list">
            <h3 className="card-title">{VARS.find((x) => x.id === v)!.label} · classement</h3>
            {!ptsOk && <div className="skeleton" style={{ height: 200 }} />}
            {ranking.map((r, k) => (
              <button key={r.c.name} className={`rl-row ${sel === r.i ? "on" : ""}`} style={{ animationDelay: `${Math.min(k * 30, 500)}ms` }} onClick={() => { setSel(r.i); map.current?.flyTo([r.c.lat, r.c.lon], Math.max(map.current.getZoom(), 8), { duration: 1.2 }); }}>
                <WeatherIcon kind={describeCode(r.code, r.day).icon} size={24} />
                <span className="rl-name">{r.c.name}</span>
                <span className="rl-v" style={{ background: chipColor(v, r.x as number) }}>{fmtV(r.x)}</span>
              </button>
            ))}
          </div>
        </aside>
      </div>
      <Source>Open-Meteo (champ lissé sur 120 points et prévisions pour chaque ville) · fond de carte Esri</Source>
    </div>
  );
}

function iconEmoji(k: string) {
  // pictogrammes SVG compacts pour les étiquettes de carte
  const sun = '<circle cx="12" cy="12" r="5" fill="#f6b73c"/>';
  const cloud = '<path d="M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.3 1.5A3.3 3.3 0 0 0 7 18z" fill="#cfd6e0"/>';
  const drops = '<path d="M9 20l-1 2M13 20l-1 2M17 20l-1 2" stroke="#6aa5ec" stroke-width="1.8" stroke-linecap="round"/>';
  const moon = '<path d="M15 4a8 8 0 1 0 5 13A7 7 0 0 1 15 4z" fill="#e5dcc0"/>';
  const map: Record<string, string> = {
    sun,
    moon,
    "sun-cloud": `<circle cx="9" cy="9" r="4" fill="#f6b73c"/>${cloud}`,
    "moon-cloud": `<path d="M10 3a5 5 0 1 0 3 8A4.5 4.5 0 0 1 10 3z" fill="#e5dcc0"/>${cloud}`,
    cloud,
    fog: `${cloud}<path d="M5 21h14" stroke="#b9c0cb" stroke-width="1.8" stroke-linecap="round"/>`,
    drizzle: cloud + drops,
    rain: cloud + drops,
    "heavy-rain": cloud + drops,
    snow: `${cloud}<circle cx="9" cy="21" r="1.3" fill="#9ec4ef"/><circle cx="15" cy="21" r="1.3" fill="#9ec4ef"/>`,
    sleet: cloud + drops,
    storm: `${cloud}<path d="M12 17l-2 4h2l-1 3 4-5h-2l1-2z" fill="#f2c94c"/>`,
    hail: `${cloud}<path d="M12 17l-2 4h2l-1 3 4-5h-2l1-2z" fill="#f2c94c"/>`,
  };
  return `<svg viewBox="0 0 24 24" width="18" height="18">${map[k] ?? cloud}</svg>`;
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
