import { lazy, Suspense, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  CloudRain,
  Cloud,
  Droplets,
  Eye,
  Gauge,
  Leaf,
  Sunrise,
  Thermometer,
  Wind,
  Sun,
  Star,
  X,
  CloudLightning,
  CalendarDays,
} from "lucide-react";
import type { Forecast, Place } from "../lib/api";
import { useAir, useCityImage, useForecast } from "../lib/queries";
import { computeRisks, LEVEL_LABEL } from "../lib/risks";
import type { MetricId } from "../lib/metrics";
import {
  beaufort,
  clamp,
  dayLabel,
  dayName,
  describeCode,
  fmtDuration,
  fmtNum,
  fmtTemp,
  hm,
  hourOf,
  moonPhase,
  nowIndex,
  softTempColor,
  themeOf,
  toUnit,
  windDir,
} from "../lib/weather";
import { placeKey, selectPlace, toggleFavorite, useStore, type WidgetId } from "../state/store";
import { ChartModal, ChartPanel } from "../components/charts/ChartPanel";
import { Chart, Sparkline } from "../components/charts/Chart";
import { Modal } from "../components/Modal";
import { WeatherIcon } from "../components/WeatherIcon";

const WeatherMap = lazy(() => import("../components/map/WeatherMap"));

export interface WidgetProps {
  fc: Forecast;
  place: Place;
}

/** Tuile cliquable qui ouvre un graphique détaillé. */
function MetricTile({
  fc,
  title,
  icon,
  metrics,
  children,
  className = "",
}: {
  fc: Forecast;
  title: string;
  icon: React.ReactNode;
  metrics: MetricId[];
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={`card tile ${className}`} onClick={() => setOpen(true)}>
        <div className="card-title">
          {icon}
          {title}
          <ArrowUpRight size={14} className="tile-arrow" />
        </div>
        {children}
      </button>
      <ChartModal fc={fc} open={open} onClose={() => setOpen(false)} title={title} metrics={metrics} />
    </>
  );
}

/* ------------------------------------------------------------------ */

function NowWidget({ fc, place }: WidgetProps) {
  const unit = useStore((s) => s.unit);
  const favs = useStore((s) => s.favorites);
  const c = fc.current;
  const info = describeCode(c.weather_code, c.is_day === 1);
  const img = useCityImage(place.name);
  const [loaded, setLoaded] = useState(false);
  const di = Math.max(0, fc.daily.time.indexOf(c.time.slice(0, 10)));
  const [metric, setMetric] = useState<MetricId | null>(null);
  const isFav = favs.some((f) => placeKey(f) === placeKey(place));
  const lo = fc.daily.temperature_2m_min[di] ?? c.temperature_2m;
  const hi = fc.daily.temperature_2m_max[di] ?? c.temperature_2m;
  const pos = clamp(((c.temperature_2m - lo) / Math.max(hi - lo, 1)) * 100, 0, 100);
  const start = nowIndex(fc.hourly.time, fc.current.time);
  const next = [1, 2, 3, 4, 5].map((k) => start + k).filter((i) => i < fc.hourly.time.length);
  const titles: Partial<Record<MetricId, string>> = { temperature: "Température et ressenti", apparent: "Température ressentie", gusts: "Vent et rafales" };
  return (
    <section className="hero">
      {img.data && <img className={`hero-photo ${loaded ? "on" : ""}`} src={img.data} alt={place.name} onLoad={() => setLoaded(true)} />}
      <div className={`hero-sky ${themeOf(c.weather_code, c.is_day === 1)}`} style={{ opacity: loaded && img.data ? 0.55 : 1 }} />
      <div className="hero-shade" />
      {c.is_day === 0 && info.icon === "moon" && <div className="star-field" style={{ opacity: 0.8 }} />}
      <div className="hero-top">
        <div>
          <p className="hero-date">{new Date(`${c.time.slice(0, 10)}T12:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h2 className="hero-city">{place.name}</h2>
          <p className="hero-cond">{info.label}</p>
        </div>
        <div className="hero-side">
          <button className="glass-btn" onClick={() => toggleFavorite(place)} aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"} title={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}>
            <Star size={20} fill={isFav ? "#fff" : "none"} />
          </button>
          <div className="glass-pill-box">{hm(c.time).replace("h", ":")}</div>
        </div>
      </div>
      <div className="hero-mid">
        <div>
          <button className="hero-temp" onClick={() => setMetric("temperature")} title="Voir l'évolution de la température">
            {fmtTemp(c.temperature_2m, unit)}
          </button>
          <div className="hero-chips">
            <button className="glass-chip" onClick={() => setMetric("apparent")}>
              <Thermometer size={14} /> Ressenti {fmtTemp(c.apparent_temperature, unit)}
            </button>
            <button className="glass-chip" onClick={() => setMetric("gusts")}>
              <Wind size={14} /> {Math.round(c.wind_speed_10m)} km/h {windDir(c.wind_direction_10m)}
            </button>
            <button className="glass-chip" onClick={() => setMetric("humidity")}>
              <Droplets size={14} /> {c.relative_humidity_2m} %
            </button>
          </div>
        </div>
        <div className="hero-iconbox">
          <WeatherIcon kind={info.icon} size={80} />
        </div>
      </div>
      <div className="hero-range">
        <span>{fmtTemp(lo, unit)}</span>
        <div className="hero-range-bar">
          <i style={{ left: `calc(${pos}% - 6px)` }} />
        </div>
        <span>{fmtTemp(hi, unit)}</span>
      </div>
      <p className="hero-range-label">Aujourd'hui</p>
      <div className="hero-hours">
        {next.map((i) => {
          const h = describeCode(fc.hourly.weather_code[i], fc.hourly.is_day[i] === 1);
          return (
            <Link key={i} to={`/jour/${fc.hourly.time[i].slice(0, 10)}?h=${fc.hourly.time[i].slice(11, 13)}`} className="hero-hour">
              <span>{hourOf(fc.hourly.time[i])}</span>
              <WeatherIcon kind={h.icon} size={22} />
              <b>{fmtTemp(fc.hourly.temperature_2m[i], unit)}</b>
            </Link>
          );
        })}
      </div>
      <div className="hero-sun">
        <span>↑ {hm(fc.daily.sunrise[di]).replace("h", ":")}</span>
        <span>↓ {hm(fc.daily.sunset[di]).replace("h", ":")}</span>
      </div>
      {metric && (
        <ChartModal fc={fc} open onClose={() => setMetric(null)} title={titles[metric] ?? "Humidité"} metrics={metric === "temperature" ? ["temperature", "apparent"] : [metric]} />
      )}
    </section>
  );
}

function NowcastWidget({ fc }: WidgetProps) {
  const [open, setOpen] = useState(false);
  const m = fc.minutely_15;
  const data = useMemo(() => {
    if (!m) return null;
    const start = Math.max(0, m.time.findIndex((t) => t >= fc.current.time.slice(0, 16)) - 1);
    const times = m.time.slice(start, start + 32);
    const vals = m.precipitation.slice(start, start + 32).map((v) => (v === null ? null : v * 4)); // mm/h
    return { times, vals };
  }, [m, fc.current.time]);
  if (!data) return null;
  const wet = data.vals.some((v) => (v ?? 0) > 0.05);
  const firstWet = data.vals.findIndex((v) => (v ?? 0) > 0.05);
  const firstDry = wet ? data.vals.findIndex((v, i) => i > firstWet && (v ?? 0) <= 0.05) : -1;
  let summary = "Pas de pluie prévue dans les 8 prochaines heures.";
  if (wet && firstWet === 0) summary = firstDry > 0 ? `Pluie en cours, fin vers ${hm(data.times[firstDry])}.` : "Pluie en cours et persistante.";
  else if (wet) summary = `Pluie attendue vers ${hm(data.times[firstWet])}.`;
  const labels = data.times.map((t) => hm(t));
  return (
    <section className="card nowcast">
      <header className="card-head">
        <button className="card-title as-link" onClick={() => setOpen(true)}>
          <CloudRain size={16} /> Pluie dans les 8 h
        </button>
        <Link className="icon-btn" to="/carte?couches=radar" title="Voir le radar" aria-label="Voir le radar">
          <ArrowUpRight size={16} />
        </Link>
      </header>
      <p className="nowcast-summary">{summary}</p>
      <button className="nowcast-bars" onClick={() => setOpen(true)} aria-label="Agrandir la prévision de pluie">
        {data.vals.map((v, i) => (
          <span key={i} style={{ height: `${clamp(((v ?? 0) / 4) * 100, 3, 100)}%` }} className={(v ?? 0) > 0.05 ? "wet" : ""} title={`${labels[i]} · ${fmtNum(v, 1)} mm/h`} />
        ))}
      </button>
      <div className="nowcast-axis">
        <span>Maint.</span>
        <span>+2 h</span>
        <span>+4 h</span>
        <span>+6 h</span>
        <span>+8 h</span>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Pluie au quart d'heure" subtitle="Intensité prévue (mm/h) par tranche de 15 minutes, modèles haute résolution.">
        <Chart labels={labels} series={[{ label: "Intensité", values: data.vals, color: "var(--c-rain)", kind: "bar" }]} height={320} zeroBase format={(v) => `${fmtNum(v, 1)} mm/h`} />
        <div className="row-links">
          <Link className="btn" to="/carte?couches=radar" onClick={() => setOpen(false)}>Radar animé</Link>
          <Link className="btn ghost" to="/phenomenes/pluie" onClick={() => setOpen(false)}>Comprendre la pluie</Link>
        </div>
      </Modal>
    </section>
  );
}

function RisksWidget({ fc }: WidgetProps) {
  const risks = useMemo(() => computeRisks(fc, nowIndex(fc.hourly.time, fc.current.time), 48), [fc]);
  const sorted = [...risks].sort((a, b) => b.level - a.level);
  const worst = sorted[0];
  return (
    <section className="card risks">
      <header className="card-head">
        <div className="card-title">
          <AlertTriangle size={16} /> Risques sur 48 h
        </div>
        <Link className="small" to="/phenomenes">
          Tous les phénomènes →
        </Link>
      </header>
      {worst.level >= 2 && (
        <div className={`alert lvl-bg-${worst.level}`}>
          <AlertTriangle size={16} /> {worst.label} : {worst.detail} {worst.when && <span className="muted">({worst.when})</span>}
        </div>
      )}
      <div className="risk-grid">
        {sorted.map((r) => (
          <Link key={r.id} to={`/phenomenes/${r.id}`} className={`risk lvl-b-${r.level}`}>
            <span className="risk-top">
              <b>{r.label}</b>
              <span className={`lvl lvl-${r.level}`}>{LEVEL_LABEL[r.level]}</span>
            </span>
            <span className="risk-val">{r.value}</span>
            {r.when && <span className="muted small">{r.when}</span>}
          </Link>
        ))}
      </div>
      <p className="source">Indicateurs calculés à partir des prévisions Open-Meteo. Ce ne sont pas des vigilances officielles : consultez <a href="https://vigilance.meteofrance.fr" target="_blank" rel="noreferrer">Météo-France Vigilance</a>.</p>
    </section>
  );
}

function HourlyWidget({ fc }: WidgetProps) {
  const unit = useStore((s) => s.unit);
  const start = nowIndex(fc.hourly.time, fc.current.time);
  const idx = Array.from({ length: 48 }, (_, k) => start + k).filter((i) => i < fc.hourly.time.length);
  const today = fc.current.time.slice(0, 10);
  const temps = idx.map((i) => toUnit(fc.hourly.temperature_2m[i] ?? 0, unit));
  const lo = Math.min(...temps);
  const hi = Math.max(...temps);
  const W = 76;
  const H = 40;
  const pad = 6;
  const yv = (t: number) => pad + ((hi - t) / Math.max(hi - lo, 1)) * (H - pad * 2);
  const d = temps.reduce((acc, t, k) => {
    const x = k * W + W / 2;
    if (k === 0) return `M ${x} ${yv(t)}`;
    const px = (k - 1) * W + W / 2;
    const mx = (px + x) / 2;
    return `${acc} C ${mx} ${yv(temps[k - 1])} ${mx} ${yv(t)} ${x} ${yv(t)}`;
  }, "");
  return (
    <section className="card hourly flush">
      <header className="card-head padded">
        <h2 className="card-title">Prévisions horaires</h2>
        <Link className="small" to="/previsions?vue=heures">
          Tableau détaillé →
        </Link>
      </header>
      <div className="h-scroll">
        <div style={{ width: idx.length * W, minWidth: "100%" }}>
          <svg width={idx.length * W} height={H} className="hourly-curve">
            <defs>
              <linearGradient id="curve-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="50%" stopColor="#818CF8" />
                <stop offset="100%" stopColor="#FB923C" />
              </linearGradient>
            </defs>
            <path d={d} fill="none" stroke="url(#curve-grad)" strokeWidth="2.5" strokeLinecap="round" />
            {temps.map((t, k) => (
              <circle key={k} cx={k * W + W / 2} cy={yv(t)} r="2.5" fill="url(#curve-grad)" />
            ))}
          </svg>
          <div className="hour-row">
            {idx.map((i, k) => {
              const t = fc.hourly.time[i];
              const info = describeCode(fc.hourly.weather_code[i], fc.hourly.is_day[i] === 1);
              const p = fc.hourly.precipitation_probability[i] ?? 0;
              const newDay = t.slice(11, 13) === "00";
              return (
                <Link key={t} to={`/jour/${t.slice(0, 10)}?h=${t.slice(11, 13)}`} className={`hour ${k === 0 ? "now" : ""}`} style={{ width: W - 8 }} title={`${dayLabel(t, today)} · ${info.label}`}>
                  <span className="hour-t">{k === 0 ? "Maint." : newDay ? dayName(t) : hourOf(t)}</span>
                  <WeatherIcon kind={info.icon} size={30} />
                  <b>{fmtTemp(fc.hourly.temperature_2m[i], unit)}</b>
                  <span className={`hour-p ${p >= 30 ? "on" : ""}`}>{p >= 10 ? `${p} %` : " "}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function DailyWidget({ fc }: WidgetProps) {
  const unit = useStore((s) => s.unit);
  const d = fc.daily;
  const today = fc.current.time.slice(0, 10);
  const startI = Math.max(0, d.time.indexOf(today));
  const days = d.time.slice(startI);
  const conv = (v: number | null) => toUnit(v ?? 0, unit);
  const lo = Math.min(...days.map((_, k) => conv(d.temperature_2m_min[startI + k])));
  const hi = Math.max(...days.map((_, k) => conv(d.temperature_2m_max[startI + k])));
  const span = Math.max(hi - lo, 1);
  return (
    <section className="card daily">
      <header className="card-head">
        <h2 className="card-title">
          <CalendarDays size={16} /> Prévisions {days.length} jours
        </h2>
        <Link className="small" to="/previsions">
          Graphiques →
        </Link>
      </header>
      <ul className="day-list">
        {days.map((t, k) => {
          const i = startI + k;
          const info = describeCode(d.weather_code[i], true);
          const mn = conv(d.temperature_2m_min[i]);
          const mx = conv(d.temperature_2m_max[i]);
          const maxC = d.temperature_2m_max[i] ?? 0;
          const p = d.precipitation_probability_max[i] ?? 0;
          return (
            <motion.li key={t} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: k * 0.06, ease: [0.22, 1, 0.36, 1] }}>
              <Link to={`/jour/${t}`} className={`day-row ${k === 0 ? "today" : ""}`}>
                <span className="day-name">{k === 0 ? "Aujourd'hui" : `${dayName(t)} ${+t.slice(8, 10)}`}</span>
                <WeatherIcon kind={info.icon} size={22} />
                <span className="day-p">{p > 10 && <em>{p}%</em>}</span>
                <span className="day-min">{fmtTemp(d.temperature_2m_min[i], unit)}</span>
                <span className="range-bar">
                  <i style={{ left: `${((mn - lo) / span) * 100}%`, width: `${Math.max(((mx - mn) / span) * 100, 5)}%`, background: `linear-gradient(90deg, ${softTempColor(d.temperature_2m_min[i] ?? 0)}, ${softTempColor(maxC)})` }} />
                </span>
                <span className="day-max">{fmtTemp(d.temperature_2m_max[i], unit)}</span>
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}

function MapWidget({ place }: WidgetProps) {
  const nav = useNavigate();
  return (
    <section className="card map-card">
      <Suspense fallback={<div className="skeleton" style={{ height: 380 }} />}>
        <WeatherMap lat={place.lat} lon={place.lon} zoom={6} compact height={380} onExpand={() => nav("/carte?couches=radar")} />
      </Suspense>
    </section>
  );
}

function WindWidget({ fc }: WidgetProps) {
  const c = fc.current;
  const b = beaufort(c.wind_speed_10m);
  return (
    <MetricTile fc={fc} title="Vent" icon={<Wind size={16} />} metrics={["wind", "gusts"]}>
      <div className="wind-body">
        <div className="compass">
          {["N", "E", "S", "O"].map((d, i) => (
            <span key={d} className={`cp cp-${i}`}>{d}</span>
          ))}
          <svg viewBox="0 0 100 100" style={{ transform: `rotate(${c.wind_direction_10m + 180}deg)` }}>
            <path d="M50 12 L60 50 L50 44 L40 50 Z" fill="var(--accent)" />
            <path d="M50 88 L58 54 L50 58 L42 54 Z" fill="var(--muted)" opacity=".5" />
          </svg>
        </div>
        <div>
          <div className="big">{Math.round(c.wind_speed_10m)} <small>km/h</small></div>
          <div className="small">Rafales {Math.round(c.wind_gusts_10m)} km/h · {windDir(c.wind_direction_10m)}</div>
          <div className="muted small">Force {b.force} · {b.label}</div>
        </div>
      </div>
    </MetricTile>
  );
}

function PressureWidget({ fc }: WidgetProps) {
  const i = nowIndex(fc.hourly.time, fc.current.time);
  const p = fc.hourly.pressure_msl;
  const trend = (p[i] ?? 0) - (p[Math.max(0, i - 3)] ?? 0);
  const t = trend > 1 ? "En hausse" : trend < -1 ? "En baisse" : "Stable";
  return (
    <MetricTile fc={fc} title="Pression" icon={<Gauge size={16} />} metrics={["pressure"]}>
      <div className="big">{Math.round(fc.current.pressure_msl)} <small>hPa</small></div>
      <div className="small">
        {t} ({trend >= 0 ? "+" : ""}
        {fmtNum(trend, 1)} hPa en 3 h)
      </div>
      <Sparkline values={p.slice(i, i + 48)} color="var(--c-press)" />
    </MetricTile>
  );
}

function HumidityWidget({ fc }: WidgetProps) {
  const unit = useStore((s) => s.unit);
  const c = fc.current;
  const dp = c.dew_point_2m;
  const comfort = dp >= 21 ? "Étouffant" : dp >= 18 ? "Lourd" : dp >= 13 ? "Confortable" : dp >= 5 ? "Agréable, sec" : "Très sec";
  return (
    <MetricTile fc={fc} title="Humidité" icon={<Droplets size={16} />} metrics={["humidity"]}>
      <div className="big">{c.relative_humidity_2m} <small>%</small></div>
      <div className="small">Point de rosée {fmtTemp(dp, unit)} · {comfort}</div>
      <div className="meter"><i style={{ width: `${c.relative_humidity_2m}%` }} /></div>
    </MetricTile>
  );
}

function CloudsWidget({ fc }: WidgetProps) {
  const i = nowIndex(fc.hourly.time, fc.current.time);
  const rows = [
    { l: "Hauts", v: fc.hourly.cloud_cover_high[i] ?? 0 },
    { l: "Moyens", v: fc.hourly.cloud_cover_mid[i] ?? 0 },
    { l: "Bas", v: fc.hourly.cloud_cover_low[i] ?? 0 },
  ];
  return (
    <MetricTile fc={fc} title="Nuages" icon={<Cloud size={16} />} metrics={["clouds_low", "clouds_mid", "clouds_high"]}>
      <div className="big">{fc.current.cloud_cover} <small>%</small></div>
      <div className="cloud-layers">
        {rows.map((r) => (
          <div key={r.l}>
            <span>{r.l}</span>
            <div className="meter"><i style={{ width: `${r.v}%`, background: "var(--c-cloud)" }} /></div>
            <b>{r.v} %</b>
          </div>
        ))}
      </div>
    </MetricTile>
  );
}

function UvWidget({ fc }: WidgetProps) {
  const uv = fc.current.uv_index ?? 0;
  const lvl = uv < 3 ? "Faible" : uv < 6 ? "Modéré" : uv < 8 ? "Élevé" : uv < 11 ? "Très élevé" : "Extrême";
  const di = Math.max(0, fc.daily.time.indexOf(fc.current.time.slice(0, 10)));
  return (
    <MetricTile fc={fc} title="Indice UV" icon={<Sun size={16} />} metrics={["uv"]}>
      <div className="big">{fmtNum(uv, 1)}</div>
      <div className="small">{lvl} · max. du jour {fmtNum(fc.daily.uv_index_max[di], 1)}</div>
      <div className="uv-scale"><i style={{ left: `${clamp((uv / 11) * 100, 0, 100)}%` }} /></div>
    </MetricTile>
  );
}

function VisibilityWidget({ fc }: WidgetProps) {
  const v = fc.current.visibility / 1000;
  const l = v < 0.2 ? "Brouillard dense" : v < 1 ? "Brouillard" : v < 5 ? "Brume" : v < 10 ? "Correcte" : "Excellente";
  return (
    <MetricTile fc={fc} title="Visibilité" icon={<Eye size={16} />} metrics={["visibility"]}>
      <div className="big">{fmtNum(v, v < 10 ? 1 : 0)} <small>km</small></div>
      <div className="small">{l}</div>
    </MetricTile>
  );
}

function SunWidget({ fc }: WidgetProps) {
  const di = Math.max(0, fc.daily.time.indexOf(fc.current.time.slice(0, 10)));
  const rise = fc.daily.sunrise[di];
  const set = fc.daily.sunset[di];
  const toMin = (t: string) => +t.slice(11, 13) * 60 + +t.slice(14, 16);
  const pos = clamp((toMin(fc.current.time) - toMin(rise)) / (toMin(set) - toMin(rise)), 0, 1);
  const moon = moonPhase();
  const sx = 10 + pos * 180;
  const sy = 90 - Math.sin(pos * Math.PI) * 70;
  return (
    <Link to={`/jour/${fc.current.time.slice(0, 10)}`} className="card tile sun-card">
      <div className="card-title">
        <Sunrise size={16} /> Soleil et Lune <ArrowUpRight size={14} className="tile-arrow" />
      </div>
      <svg viewBox="0 0 200 100" className="sun-arc">
        <path d="M10 90 Q100 -50 190 90" fill="none" stroke="var(--line)" strokeDasharray="3 4" />
        <line x1="0" x2="200" y1="90" y2="90" stroke="var(--line)" />
        {fc.current.is_day === 1 && <circle cx={sx} cy={sy} r="7" fill="var(--wi-sun)" />}
      </svg>
      <div className="sun-row">
        <span>Lever <b>{hm(rise)}</b></span>
        <span>Coucher <b>{hm(set)}</b></span>
      </div>
      <div className="small muted">Durée du jour {fmtDuration(fc.daily.daylight_duration[di])} · ensoleillement {fmtDuration(fc.daily.sunshine_duration[di])}</div>
      <div className="moon-row">
        <span className="moon-disc" style={{ "--ill": `${moon.illumination * 100}%`, "--dir": moon.fraction < 0.5 ? "right" : "left" } as React.CSSProperties} />
        <span>{moon.name} · {Math.round(moon.illumination * 100)} % éclairée</span>
      </div>
    </Link>
  );
}

function AirWidget({ place }: WidgetProps) {
  const q = useAir(place);
  const aqi = q.data?.current.european_aqi ?? null;
  const lvl = aqi === null ? "—" : aqi <= 20 ? "Bon" : aqi <= 40 ? "Correct" : aqi <= 60 ? "Moyen" : aqi <= 80 ? "Médiocre" : aqi <= 100 ? "Mauvais" : "Très mauvais";
  return (
    <Link to="/air" className="card tile">
      <div className="card-title">
        <Leaf size={16} /> Qualité de l'air <ArrowUpRight size={14} className="tile-arrow" />
      </div>
      {q.isLoading ? (
        <div className="skeleton" style={{ height: 50 }} />
      ) : (
        <>
          <div className="big">{aqi ?? "—"} <small>IQA européen</small></div>
          <div className="small">{lvl} · PM2,5 {fmtNum(q.data?.current.pm2_5, 0)} µg/m³</div>
          <div className="aqi-scale"><i style={{ left: `${clamp(((aqi ?? 0) / 100) * 100, 0, 100)}%` }} /></div>
          <ul className="aqi-list">
            {([
              ["PM2,5", q.data?.current.pm2_5, 25],
              ["PM10", q.data?.current.pm10, 50],
              ["NO₂", q.data?.current.nitrogen_dioxide, 90],
              ["Ozone", q.data?.current.ozone, 120],
            ] as [string, number | null | undefined, number][]).map(([l, v, ref]) => (
              <li key={l}>
                <span>{l}</span>
                <div className="meter"><i style={{ width: `${clamp(((v ?? 0) / ref) * 100, 2, 100)}%`, background: (v ?? 0) > ref ? "var(--lvl2)" : "var(--s3)" }} /></div>
                <b>{fmtNum(v, 0)}</b>
              </li>
            ))}
          </ul>
          {q.data && (
            <div className="aqi-trend">
              <span className="muted small">Indice sur 24 h</span>
              <Sparkline values={q.data.hourly.european_aqi.slice(nowIndex(q.data.hourly.time, q.data.current.time), nowIndex(q.data.hourly.time, q.data.current.time) + 24)} color="var(--s3)" height={44} />
            </div>
          )}
        </>
      )}
    </Link>
  );
}

function FavoriteTile({ p }: { p: Place }) {
  const unit = useStore((s) => s.unit);
  const q = useForecast(p);
  const c = q.data?.current;
  const info = c ? describeCode(c.weather_code, c.is_day === 1) : null;
  return (
    <div className={`fav ${c ? themeOf(c.weather_code, c.is_day === 1) : "theme-cloudy"}`}>
      <button className="fav-main" onClick={() => selectPlace(p)}>
        <b>{p.name}</b>
        {c && info ? (
          <span className="fav-now">
            <WeatherIcon kind={info.icon} size={34} />
            <span className="fav-t">{fmtTemp(c.temperature_2m, unit)}</span>
          </span>
        ) : (
          <span className="muted small">…</span>
        )}
        <small>{info?.label}</small>
      </button>
      <button className="fav-x" onClick={() => toggleFavorite(p)} aria-label={`Retirer ${p.name}`} data-testid={`button-remove-favorite-${p.id}`}>
        <X size={13} />
      </button>
    </div>
  );
}

function FavoritesWidget({ place }: WidgetProps) {
  const favs = useStore((s) => s.favorites);
  const isFav = favs.some((f) => placeKey(f) === placeKey(place));
  return (
    <section className="card favorites">
      <header className="card-head">
        <div className="card-title">
          <Star size={16} /> Lieux enregistrés
        </div>
        {favs.length >= 2 && (
          <Link className="small" to="/comparer?favoris=1">
            Comparer →
          </Link>
        )}
      </header>
      {favs.length === 0 ? (
        <div className="empty">
          <p>Aucun lieu enregistré. Ajoutez la ville affichée pour la suivre d'un coup d'œil.</p>
          {!isFav && (
            <button className="btn" onClick={() => toggleFavorite(place)}>
              <Star size={14} /> Ajouter {place.name}
            </button>
          )}
        </div>
      ) : (
        <div className="fav-grid">
          {favs.map((p) => (
            <FavoriteTile key={p.id} p={p} />
          ))}
        </div>
      )}
    </section>
  );
}

export const WIDGETS: Record<WidgetId, (p: WidgetProps) => React.ReactNode> = {
  now: NowWidget,
  nowcast: NowcastWidget,
  risks: RisksWidget,
  hourly: HourlyWidget,
  daily: DailyWidget,
  map: MapWidget,
  temperature: ({ fc }) => <ChartPanel fc={fc} title="Température et ressenti" metrics={["temperature", "apparent"]} icon={<Thermometer size={16} />} />,
  precip: ({ fc }) => (
    <ChartPanel
      fc={fc}
      title="Précipitations"
      metrics={["precipitation"]}
      icon={<CloudRain size={16} />}
      footer={
        <p className="small muted">
          Cumul sur 48 h :{" "}
          <b>
            {fmtNum(
              fc.hourly.precipitation.slice(nowIndex(fc.hourly.time, fc.current.time), nowIndex(fc.hourly.time, fc.current.time) + 48).reduce<number>((s, v) => s + (v ?? 0), 0),
              1,
            )}{" "}
            mm
          </b>{" "}
          · <Link to="/explorer?m=probability">probabilités →</Link>
        </p>
      }
    />
  ),
  wind: WindWidget,
  pressure: PressureWidget,
  humidity: HumidityWidget,
  clouds: CloudsWidget,
  air: AirWidget,
  sun: SunWidget,
  uv: UvWidget,
  visibility: VisibilityWidget,
  favorites: FavoritesWidget,
};

export const WIDGET_ICON: Partial<Record<WidgetId, React.ReactNode>> = { risks: <CloudLightning size={14} /> };

export function WidgetFrame({ id, children, index }: { id: WidgetId; children: React.ReactNode; index: number }) {
  return (
    <motion.div className={`w w-${id}`} initial={{ opacity: 0, y: 28, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: Math.min(index * 0.09, 0.9), duration: 0.9, ease: [0.22, 1, 0.36, 1] }} layout="position">
      {children}
    </motion.div>
  );
}
