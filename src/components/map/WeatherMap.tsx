import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useQuery } from "@tanstack/react-query";
import { Layers, Maximize, Minimize, Pause, Play, Star, MapPin, GitCompare, X, Crosshair } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { fetchPointNow, reverseGeocode, type Place } from "../../lib/api";
import { useGrid, useRadar } from "../../lib/queries";
import { describeCode, fmtTemp, windDir } from "../../lib/weather";
import { selectPlace, setState, toggleFavorite, useStore } from "../../state/store";
import { WeatherIcon } from "../WeatherIcon";
import { LAYERS, isGridLayer, tempColor, type GridLayerId, type LayerId } from "./layers";

const BASES = {
  plan: { label: "Plan", url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", attr: "© OpenStreetMap" },
  sombre: { label: "Sombre", url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", attr: "Esri, HERE, Garmin, © OpenStreetMap" },
  relief: {
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attr: "Esri, Maxar, Earthstar Geographics",
  },
} as const;
type BaseId = keyof typeof BASES;

const yesterday = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);

function makeTileLayer(id: Exclude<LayerId, GridLayerId | "radar">): L.Layer {
  switch (id) {
    case "infrared":
      return L.tileLayer.wms("https://view.eumetsat.int/geoserver/wms", {
        layers: "msg_fes:ir108",
        format: "image/png",
        transparent: true,
        version: "1.3.0",
        opacity: 0.75,
        attribution: "EUMETSAT",
        zIndex: 8,
      });
    case "geocolor":
      return L.tileLayer.wms("https://view.eumetsat.int/geoserver/wms", {
        layers: "mtg_fd:rgb_geocolour",
        format: "image/png",
        transparent: true,
        version: "1.3.0",
        opacity: 0.9,
        attribution: "EUMETSAT",
        zIndex: 7,
      });
    case "lightning":
      return L.tileLayer.wms("https://view.eumetsat.int/geoserver/wms", {
        layers: "mtg_fd:li_afa",
        format: "image/png",
        transparent: true,
        version: "1.3.0",
        attribution: "EUMETSAT",
        zIndex: 12,
      });
    case "truecolor":
      return L.tileLayer(
        `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_NOAA20_CorrectedReflectance_TrueColor/default/${yesterday()}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
        { maxNativeZoom: 9, attribution: "NASA GIBS", zIndex: 6, opacity: 0.95 },
      );
  }
}

export interface WeatherMapProps {
  lat: number;
  lon: number;
  zoom?: number;
  initialLayers?: LayerId[];
  compact?: boolean;
  height?: number | string;
  onExpand?: () => void;
}

export default function WeatherMap({ lat, lon, zoom = 6, initialLayers = ["radar"], compact, height = 420, onExpand }: WeatherMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const baseLayer = useRef<L.TileLayer | null>(null);
  const overlays = useRef<Map<string, L.Layer>>(new Map());
  const radarLayers = useRef<L.TileLayer[]>([]);
  const gridGroup = useRef<L.LayerGroup | null>(null);
  const hereMarker = useRef<L.Marker | null>(null);

  const theme = useStore((s) => s.theme);
  const unit = useStore((s) => s.unit);
  const [base, setBase] = useState<BaseId>(theme === "dark" ? "sombre" : "plan");
  const [active, setActive] = useState<LayerId[]>(initialLayers);
  const [panel, setPanel] = useState(!compact);
  const [frame, setFrame] = useState(-1);
  const [playing, setPlaying] = useState(!compact);
  const [gridHour, setGridHour] = useState(0);
  const [bbox, setBbox] = useState<[number, number, number, number] | null>(null);
  const [picked, setPicked] = useState<{ lat: number; lon: number } | null>(null);
  const [fs, setFs] = useState(false);

  const radar = useRadar();
  const frames = useMemo(() => [...(radar.data?.radar.past ?? []), ...(radar.data?.radar.nowcast ?? [])], [radar.data]);
  const gridLayer = active.find(isGridLayer);
  const gridVars = gridLayer === "wind" ? ["wind_speed_10m", "wind_direction_10m"] : gridLayer === "temperature" ? ["temperature_2m"] : gridLayer === "precip" ? ["precipitation"] : ["cloud_cover"];
  const grid = useGrid(gridLayer ? bbox : null, 7, 9, gridVars, 48);

  /* --- création de la carte --- */
  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { center: [lat, lon], zoom, zoomControl: false, worldCopyJump: true, minZoom: 2 });
    L.control.zoom({ position: "bottomright" }).addTo(m);
    L.control.scale({ imperial: false, position: "bottomleft" }).addTo(m);
    gridGroup.current = L.layerGroup().addTo(m);
    const updateBbox = () => {
      const b = m.getBounds();
      setBbox([Math.max(-85, b.getSouth()), Math.max(-180, b.getWest()), Math.min(85, b.getNorth()), Math.min(180, b.getEast())]);
    };
    let t: ReturnType<typeof setTimeout>;
    m.on("moveend", () => {
      clearTimeout(t);
      t = setTimeout(updateBbox, 350);
    });
    m.on("click", (e: L.LeafletMouseEvent) => setPicked({ lat: e.latlng.lat, lon: e.latlng.lng }));
    updateBbox();
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --- recentrage --- */
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    m.setView([lat, lon], m.getZoom() < 4 ? zoom : m.getZoom());
    hereMarker.current?.remove();
    hereMarker.current = L.marker([lat, lon], {
      icon: L.divIcon({ className: "here-pin", html: "<span></span>", iconSize: [18, 18] }),
      interactive: false,
    }).addTo(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon]);

  /* --- fond de carte --- */
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    baseLayer.current?.remove();
    const b = BASES[base];
    baseLayer.current = L.tileLayer(b.url, { attribution: b.attr, maxZoom: 18, zIndex: 1 }).addTo(m);
  }, [base]);

  /* --- couches tuilées --- */
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const wanted = active.filter((a) => a !== "radar" && !isGridLayer(a)) as Exclude<LayerId, GridLayerId | "radar">[];
    overlays.current.forEach((layer, id) => {
      if (!wanted.includes(id as never)) {
        layer.remove();
        overlays.current.delete(id);
      }
    });
    wanted.forEach((id) => {
      if (!overlays.current.has(id)) overlays.current.set(id, makeTileLayer(id).addTo(m));
    });
  }, [active]);

  /* --- radar : préchargement de toutes les images pour une animation fluide --- */
  useEffect(() => {
    const m = map.current;
    radarLayers.current.forEach((l) => l.remove());
    radarLayers.current = [];
    if (!m || !radar.data || !active.includes("radar")) return;
    radarLayers.current = frames.map((f) =>
      L.tileLayer(`${radar.data!.host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`, {
        opacity: 0,
        zIndex: 10,
        maxNativeZoom: 7,
        maxZoom: 18,
        attribution: "RainViewer",
      }).addTo(m),
    );
    setFrame(radar.data.radar.past.length - 1);
  }, [radar.data, frames, active]);

  useEffect(() => {
    radarLayers.current.forEach((l, i) => l.setOpacity(i === frame ? 0.7 : 0));
  }, [frame, radar.data, active]);

  useEffect(() => {
    if (!playing || !frames.length || !active.includes("radar")) return;
    const t = setInterval(() => setFrame((f) => (f + 1) % frames.length), 1200);
    return () => clearInterval(t);
  }, [playing, frames.length, active]);

  /* --- grille de prévisions --- */
  useEffect(() => {
    const g = gridGroup.current;
    if (!g) return;
    g.clearLayers();
    if (!gridLayer || !grid.data) return;
    const d = grid.data;
    d.lats.forEach((la, i) => {
      const lo = d.lons[i];
      let html = "";
      if (gridLayer === "temperature") {
        const v = d.values.temperature_2m[i]?.[gridHour];
        if (v === null || v === undefined) return;
        html = `<span class="gv" style="background:${tempColor(v)}">${fmtTemp(v, unit)}</span>`;
      } else if (gridLayer === "wind") {
        const s = d.values.wind_speed_10m[i]?.[gridHour];
        const dir = d.values.wind_direction_10m[i]?.[gridHour];
        if (s === null || s === undefined || dir === null || dir === undefined) return;
        html = `<span class="gw"><svg viewBox="0 0 24 24" width="22" height="22" style="transform:rotate(${dir + 180}deg)"><path d="M12 3 L17 13 H13 V21 H11 V13 H7 Z" fill="currentColor"/></svg><b>${Math.round(s)}</b></span>`;
      } else if (gridLayer === "precip") {
        const v = d.values.precipitation[i]?.[gridHour];
        if (v === null || v === undefined) return;
        html = v > 0 ? `<span class="gv rain" style="opacity:${Math.min(1, 0.45 + v / 4)}">${v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}</span>` : `<span class="gv dry">0</span>`;
      } else {
        const v = d.values.cloud_cover[i]?.[gridHour];
        if (v === null || v === undefined) return;
        html = `<span class="gv cloud" style="--cc:${v}%">${Math.round(v)}%</span>`;
      }
      L.marker([la, lo], { icon: L.divIcon({ className: "grid-pt", html, iconSize: [46, 26] }), interactive: false }).addTo(g);
    });
  }, [grid.data, gridHour, gridLayer, unit]);

  /* --- plein écran natif --- */
  useEffect(() => {
    const on = () => {
      setFs(document.fullscreenElement === wrap.current);
      setTimeout(() => map.current?.invalidateSize(), 120);
    };
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => map.current?.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [height, panel]);

  const toggleLayer = (id: LayerId) =>
    setActive((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      const next = isGridLayer(id) ? cur.filter((x) => !isGridLayer(x)) : cur;
      if (id === "geocolor" || id === "truecolor" || id === "infrared") {
        return [...next.filter((x) => x !== "geocolor" && x !== "truecolor" && x !== "infrared"), id];
      }
      return [...next, id];
    });

  const frameTime = frames[frame]?.time;
  const isNowcast = frame >= (radar.data?.radar.past.length ?? 99);
  const gridTime = grid.data?.time[gridHour];

  return (
    <div className={`wmap ${compact ? "compact" : ""}`} ref={wrap} style={{ height: fs ? "100vh" : height }}>
      <div ref={el} className="wmap-canvas" />

      <div className="wmap-top">
        <button className={`map-btn ${panel ? "on" : ""}`} onClick={() => setPanel(!panel)} aria-label="Couches">
          <Layers size={16} /> {!compact && "Couches"}
        </button>
        <button className="map-btn" onClick={() => map.current?.setView([lat, lon], Math.max(map.current.getZoom(), 7))} aria-label="Recentrer sur le lieu" title="Recentrer">
          <Crosshair size={16} />
        </button>
        {onExpand ? (
          <button className="map-btn" onClick={onExpand} aria-label="Ouvrir la carte complète" title="Carte complète">
            <Maximize size={16} />
          </button>
        ) : (
          <button
            className="map-btn"
            onClick={() => (fs ? document.exitFullscreen() : wrap.current?.requestFullscreen())}
            aria-label={fs ? "Quitter le plein écran" : "Plein écran"}
            title="Plein écran"
          >
            {fs ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        )}
      </div>

      {panel && (
        <div className="wmap-panel">
          <div className="seg small">
            {(Object.keys(BASES) as BaseId[]).map((b) => (
              <button key={b} className={base === b ? "on" : ""} onClick={() => setBase(b)}>
                {BASES[b].label}
              </button>
            ))}
          </div>
          {(["Observations", "Satellite", "Prévisions"] as const).map((g) => (
            <div key={g} className="layer-group">
              <div className="layer-group-title">{g}</div>
              {LAYERS.filter((l) => l.group === g).map((l) => (
                <button key={l.id} className={`layer-item ${active.includes(l.id) ? "on" : ""}`} onClick={() => toggleLayer(l.id)} title={l.description}>
                  <span className="dot" />
                  <span>
                    <b>{l.label}</b>
                    <small>
                      {l.source}
                      {l.coverage ? ` · ${l.coverage}` : ""}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          ))}
          <p className="small muted">Cliquez n'importe où sur la carte pour voir la météo de ce point.</p>
        </div>
      )}

      <div className="wmap-bottom">
        {active.includes("radar") && frames.length > 0 && (
          <div className="timeline">
            <button className="map-btn" onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause" : "Lecture"}>
              {playing ? <Pause size={15} /> : <Play size={15} />}
            </button>
            <input type="range" min={0} max={frames.length - 1} value={Math.max(0, frame)} onChange={(e) => { setPlaying(false); setFrame(+e.target.value); }} aria-label="Image radar" />
            <span className="tl-label">
              Radar {frameTime ? new Date(frameTime * 1000).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
              {isNowcast && " · prévision"}
            </span>
          </div>
        )}
        {gridLayer && grid.data && !compact && (
          <div className="timeline">
            <input type="range" min={0} max={grid.data.time.length - 1} value={gridHour} onChange={(e) => setGridHour(+e.target.value)} aria-label="Heure de prévision" />
            <span className="tl-label">
              {LAYERS.find((l) => l.id === gridLayer)?.label} ·{" "}
              {gridTime ? new Date(gridTime * 1000).toLocaleString("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit" }) : ""}
              {grid.isFetching && " · mise à jour…"}
            </span>
          </div>
        )}
        {gridLayer === "temperature" && !compact && <TempLegend />}
      </div>

      {picked && <PointCard lat={picked.lat} lon={picked.lon} onClose={() => setPicked(null)} />}
    </div>
  );
}

function TempLegend() {
  const stops = [-15, -5, 0, 5, 10, 15, 20, 25, 30, 35];
  return (
    <div className="temp-legend" aria-label="Échelle des températures">
      {stops.map((s) => (
        <span key={s} style={{ background: tempColor(s) }}>
          {s}
        </span>
      ))}
    </div>
  );
}

function PointCard({ lat, lon, onClose }: { lat: number; lon: number; onClose: () => void }) {
  const unit = useStore((s) => s.unit);
  const nav = useNavigate();
  const q = useQuery({ queryKey: ["pt", lat.toFixed(3), lon.toFixed(3)], queryFn: () => fetchPointNow(lat, lon) });
  const name = useQuery({ queryKey: ["rev", lat.toFixed(2), lon.toFixed(2)], queryFn: () => reverseGeocode(lat, lon), retry: 0 });
  const place: Place = {
    id: `${lat.toFixed(4)},${lon.toFixed(4)}`,
    name: name.data?.city ?? `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
    lat,
    lon,
    country: name.data?.country,
  };
  const c = q.data?.current;
  const info = c ? describeCode(c.weather_code, c.is_day === 1) : null;
  return (
    <div className="point-card">
      <button className="icon-btn close" onClick={onClose} aria-label="Fermer">
        <X size={15} />
      </button>
      <div className="pc-name">{place.name}</div>
      <div className="muted small">
        {place.country ? `${place.country} · ` : ""}
        {lat.toFixed(2)}°, {lon.toFixed(2)}°{q.data ? ` · ${Math.round(q.data.elevation)} m` : ""}
      </div>
      {q.isLoading && <div className="skeleton" style={{ height: 60, marginTop: 10 }} />}
      {q.isError && <p className="small">Données indisponibles pour ce point.</p>}
      {c && info && (
        <div className="pc-now">
          <WeatherIcon kind={info.icon} size={44} />
          <div>
            <div className="pc-temp">{fmtTemp(c.temperature_2m, unit)}</div>
            <div className="small">{info.label}</div>
          </div>
          <ul className="pc-list">
            <li>
              Vent {Math.round(c.wind_speed_10m)} km/h {windDir(c.wind_direction_10m)} · rafales {Math.round(c.wind_gusts_10m)}
            </li>
            <li>
              Nuages {c.cloud_cover} % · humidité {c.relative_humidity_2m} %
            </li>
            <li>
              Pression {Math.round(c.pressure_msl)} hPa · pluie {c.precipitation} mm
            </li>
          </ul>
        </div>
      )}
      <div className="pc-actions">
        <button
          className="btn"
          onClick={() => {
            selectPlace(place);
            nav("/");
          }}
        >
          <MapPin size={14} /> Prévisions ici
        </button>
        <button className="btn ghost" onClick={() => toggleFavorite(place)}>
          <Star size={14} /> Favori
        </button>
        <button
          className="btn ghost"
          onClick={() => {
            setState((s) => ({ compare: [...s.compare.filter((p) => p.id !== place.id), place].slice(-3) }));
            nav("/comparer");
          }}
        >
          <GitCompare size={14} /> Comparer
        </button>
      </div>
    </div>
  );
}
