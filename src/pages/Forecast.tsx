import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useSearchParams } from "react-router";
import { PageHead, WithForecast, Source } from "../components/common";
import { Chart } from "../components/charts/Chart";
import { WeatherIcon } from "../components/WeatherIcon";
import { capitalize, dayLabel, dayName, describeCode, fmtDuration, fmtNum, fmtTemp, hm, hourOf, nowIndex, shortDate, softTempColor, toUnit, windDir } from "../lib/weather";
import { useStore } from "../state/store";
import type { Forecast as Fc } from "../lib/api";

export default function Forecast() {
  const [sp, setSp] = useSearchParams();
  const view = sp.get("vue") === "heures" ? "heures" : "jours";
  return (
    <div className="page">
      <PageHead kicker="Prévisions" title={view === "jours" ? "La semaine" : "Heure par heure"}>
        <div className="seg">
          <button className={view === "jours" ? "on" : ""} onClick={() => setSp({})}>Semaine</button>
          <button className={view === "heures" ? "on" : ""} onClick={() => setSp({ vue: "heures" })}>Heure par heure</button>
        </div>
      </PageHead>
      <WithForecast>{(fc) => (view === "jours" ? <DailyView fc={fc} /> : <HourlyTable fc={fc} />)}</WithForecast>
    </div>
  );
}

function HourlyTable({ fc }: { fc: Fc }) {
  const unit = useStore((s) => s.unit);
  const h = fc.hourly;
  const start = nowIndex(h.time, fc.current.time);
  const today = fc.current.time.slice(0, 10);
  const idx = Array.from({ length: Math.min(168, h.time.length - start) }, (_, k) => start + k);
  const days: { date: string; hours: number[] }[] = [];
  idx.forEach((i) => {
    const d = h.time[i].slice(0, 10);
    if (!days.length || days[days.length - 1].date !== d) days.push({ date: d, hours: [] });
    days[days.length - 1].hours.push(i);
  });
  const [open, setOpen] = useState<Record<string, boolean>>({});
  return (
    <div className="ht">
      <p className="small muted ht-intro">7 jours heure par heure, regroupés par journée. Touchez l'en-tête d'un jour pour replier ou déplier ses heures.</p>
      {days.map((day, di) => {
        const di2 = fc.daily.time.indexOf(day.date);
        const info = describeCode(fc.daily.weather_code[di2], true);
        const rain = day.hours.reduce((a, i) => a + (h.precipitation[i] ?? 0), 0);
        const gust = Math.max(...day.hours.map((i) => h.wind_gusts_10m[i] ?? 0));
        const collapsed = open[day.date] === undefined ? di > 1 : !open[day.date];
        return (
          <section key={day.date} className="ht-day card" style={{ animationDelay: `${di * 0.08}s` }}>
            <button className="ht-head" onClick={() => setOpen((o) => ({ ...o, [day.date]: collapsed }))} aria-expanded={!collapsed}>
              <WeatherIcon kind={info.icon} size={38} />
              <span className="ht-title">
                <b>{dayLabel(day.date, today)}</b>
                <small>{info.label}</small>
              </span>
              <span className="ht-sum">
                <span className="ht-pill t"><i>Max</i>{fmtTemp(fc.daily.temperature_2m_max[di2], unit)}</span>
                <span className="ht-pill c"><i>Min</i>{fmtTemp(fc.daily.temperature_2m_min[di2], unit)}</span>
                <span className="ht-pill r"><i>Pluie</i>{fmtNum(rain, 1)} mm</span>
                <span className="ht-pill w"><i>Rafales</i>{Math.round(gust)} km/h</span>
              </span>
              <span className={`ht-chev ${collapsed ? "" : "open"}`}>›</span>
            </button>
            {!collapsed && (
              <div className="ht-body">
                <div className="ht-row ht-cols">
                  <span>Heure</span><span>Ciel</span><span>Temp.</span><span>Ressenti</span><span>Pluie</span><span>Vent</span><span>Rafales</span><span>Humidité</span><span>Pression</span><span>UV</span>
                </div>
                {day.hours.map((i, k) => {
                  const hi = describeCode(h.weather_code[i], h.is_day[i] === 1);
                  const pr = h.precipitation[i] ?? 0;
                  const pp = h.precipitation_probability[i] ?? 0;
                  const g = h.wind_gusts_10m[i] ?? 0;
                  const isNow = i === start;
                  const night = h.is_day[i] !== 1;
                  return (
                    <Link key={i} to={`/jour/${day.date}?h=${h.time[i].slice(11, 13)}`} className={`ht-row ${isNow ? "now" : ""} ${night ? "night" : ""}`} style={{ animationDelay: `${Math.min(k * 0.025, 0.5)}s` }}>
                      <span className="ht-hour">{isNow ? "Maint." : hm(h.time[i])}</span>
                      <span title={hi.label}><WeatherIcon kind={hi.icon} size={26} /></span>
                      <span className="ht-temp">{fmtTemp(h.temperature_2m[i], unit)}</span>
                      <span className="muted">{fmtTemp(h.apparent_temperature[i], unit)}</span>
                      <span className={pr >= 2 ? "hot-r" : pr > 0 ? "on-r" : "muted"}>
                        {pr > 0 ? `${fmtNum(pr, 1)} mm` : "—"}
                        {pp >= 20 && <small> · {pp} %</small>}
                      </span>
                      <span>
                        <svg width="12" height="12" viewBox="0 0 24 24" style={{ transform: `rotate(${(h.wind_direction_10m[i] ?? 0) + 180}deg)`, verticalAlign: "-1px", marginRight: 4 }}>
                          <path d="M12 3 L18 15 H13 V21 H11 V15 H6 Z" fill="currentColor" />
                        </svg>
                        {Math.round(h.wind_speed_10m[i] ?? 0)} {windDir(h.wind_direction_10m[i])}
                      </span>
                      <span className={g >= 60 ? "hot-w" : ""}>{Math.round(g)} km/h</span>
                      <span className="muted">{h.relative_humidity_2m[i]} %</span>
                      <span className="muted">{Math.round(h.pressure_msl[i] ?? 0)} hPa</span>
                      <span className={(h.uv_index[i] ?? 0) >= 6 ? "hot-u" : "muted"}>{fmtNum(h.uv_index[i], 1)}</span>
                    </Link>
                  );
                })}
                <Link className="ht-more" to={`/jour/${day.date}`}>Analyse complète de la journée →</Link>
              </div>
            )}
          </section>
        );
      })}
      <Source>Open-Meteo, meilleur modèle disponible pour le lieu</Source>
    </div>
  );
}

function daySummary(fc: Fc, i: number, unit: "C" | "F") {
  const d = fc.daily;
  const info = describeCode(d.weather_code[i], true);
  const rain = d.precipitation_sum[i] ?? 0;
  const p = d.precipitation_probability_max[i] ?? 0;
  const g = d.wind_gusts_10m_max[i] ?? 0;
  const parts = [`${info.label}, de ${fmtTemp(d.temperature_2m_min[i], unit)} à ${fmtTemp(d.temperature_2m_max[i], unit)}.`];
  parts.push(rain >= 0.2 ? `Environ ${fmtNum(rain, 1)} mm de pluie (risque ${p} %).` : p >= 30 ? `Quelques gouttes possibles (${p} %).` : "Temps sec.");
  parts.push(g >= 70 ? `Coups de vent jusqu'à ${Math.round(g)} km/h.` : g >= 45 ? `Vent soutenu, rafales à ${Math.round(g)} km/h.` : "Vent faible à modéré.");
  return parts.join(" ");
}

function DailyView({ fc }: { fc: Fc }) {
  const unit = useStore((s) => s.unit);
  const d = fc.daily;
  const today = fc.current.time.slice(0, 10);
  const s0 = Math.max(0, d.time.indexOf(today));
  const times = d.time.slice(s0);
  const week = times.slice(0, 7);
  const [sel, setSel] = useState(0);
  const si = s0 + sel;
  const selDate = d.time[si];
  const lo = Math.min(...times.map((_, k) => d.temperature_2m_min[s0 + k] ?? 99));
  const hi = Math.max(...times.map((_, k) => d.temperature_2m_max[s0 + k] ?? -99));
  const span = Math.max(hi - lo, 1);
  const hIdx = fc.hourly.time.map((t, i) => (t.startsWith(selDate) ? i : -1)).filter((i) => i >= 0);
  const hFrom = hIdx[0] ?? 0;
  const hTo = (hIdx[hIdx.length - 1] ?? 0) + 1;
  const hTimes = fc.hourly.time.slice(hFrom, hTo);
  const tv = (arr: (number | null)[]) => arr.map((v) => (v === null ? null : toUnit(v, unit)));
  const labels = times.map((t) => `${dayName(t)} ${+t.slice(8, 10)}`);
  const tips = times.map((t) => shortDate(t));
  const sel_info = describeCode(d.weather_code[si], true);
  return (
    <div className="stack week">
      <section className="card week-card">
        <h3 className="card-title">Cette semaine</h3>
        <div className="week-strip">
          {week.map((t, k) => {
            const i = s0 + k;
            const info = describeCode(d.weather_code[i], true);
            const mn = d.temperature_2m_min[i] ?? 0;
            const mx = d.temperature_2m_max[i] ?? 0;
            const p = d.precipitation_probability_max[i] ?? 0;
            return (
              <button key={t} className={`wk ${sel === k ? "on" : ""}`} onClick={() => setSel(k)} style={{ animationDelay: `${k * 70}ms` }}>
                <span className="wk-d">{k === 0 ? "Auj." : dayName(t)}</span>
                <span className="wk-n">{+t.slice(8, 10)}</span>
                <WeatherIcon kind={info.icon} size={40} />
                <span className="wk-max">{fmtTemp(mx, unit)}</span>
                <span className="wk-min">{fmtTemp(mn, unit)}</span>
                <span className="wk-bar">
                  <i style={{ bottom: `${((mn - lo) / span) * 100}%`, height: `${Math.max(((mx - mn) / span) * 100, 8)}%`, background: `linear-gradient(to top, ${softTempColor(mn)}, ${softTempColor(mx)})` }} />
                </span>
                <span className={`wk-p ${p >= 30 ? "on" : ""}`}>
                  <svg width="9" height="11" viewBox="0 0 10 12"><path d="M5 0C5 0 0 6 0 8a5 5 0 0 0 10 0C10 6 5 0 5 0z" fill="currentColor" /></svg>
                  {p} %
                </span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={selDate} className="wk-detail" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
            <div className="wkd-head">
              <WeatherIcon kind={sel_info.icon} size={64} />
              <div>
                <h3>{dayLabel(selDate, today)}</h3>
                <p>{daySummary(fc, si, unit)}</p>
              </div>
              <Link className="btn ghost" to={`/jour/${selDate}`}>Journée détaillée →</Link>
            </div>
            <div className="wkd-stats">
              <span><i>Maximum</i><b style={{ color: "var(--soft-warm)" }}>{fmtTemp(d.temperature_2m_max[si], unit)}</b></span>
              <span><i>Minimum</i><b style={{ color: "var(--soft-cool)" }}>{fmtTemp(d.temperature_2m_min[si], unit)}</b></span>
              <span><i>Pluie</i><b>{fmtNum(d.precipitation_sum[si], 1)} mm</b></span>
              <span><i>Rafales</i><b>{Math.round(d.wind_gusts_10m_max[si] ?? 0)} km/h</b></span>
              <span><i>Soleil</i><b>{fmtDuration(d.sunshine_duration[si])}</b></span>
              <span><i>UV max.</i><b>{fmtNum(d.uv_index_max[si], 1)}</b></span>
              <span><i>Lever</i><b>{hm(d.sunrise[si])}</b></span>
              <span><i>Coucher</i><b>{hm(d.sunset[si])}</b></span>
            </div>
            {hTimes.length > 0 && (
              <div className="wkd-chart">
                <Chart
                  labels={hTimes.map(hourOf)}
                  tipLabels={hTimes.map(hm)}
                  height={200}
                  series={[
                    { label: "Température", values: tv(fc.hourly.temperature_2m.slice(hFrom, hTo)), color: "var(--soft-warm)", kind: "area" },
                    { label: "Ressenti", values: tv(fc.hourly.apparent_temperature.slice(hFrom, hTo)), color: "var(--soft-cool)", dashed: true },
                  ]}
                  format={(v) => `${fmtNum(v, 1)}°`}
                />
                <div className="wkd-rain">
                  {fc.hourly.precipitation_probability.slice(hFrom, hTo).map((p, k) => (
                    <span key={k} title={`${hTimes[k] ? hm(hTimes[k]) : ""} · ${p ?? 0} %`} style={{ opacity: 0.25 + ((p ?? 0) / 100) * 0.75, height: `${Math.max(4, (p ?? 0) * 0.32)}px`, animationDelay: `${k * 20}ms` }} />
                  ))}
                </div>
                <p className="muted small">Barres bleues : probabilité de pluie heure par heure.</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </section>

      <section className="card">
        <h3 className="card-title">Tendance sur {times.length} jours</h3>
        <Chart
          labels={labels}
          tipLabels={tips}
          height={260}
          series={[
            { label: "Maximum", values: tv(d.temperature_2m_max.slice(s0)), color: "var(--soft-warm)", band: { lo: tv(d.temperature_2m_min.slice(s0)), hi: tv(d.temperature_2m_max.slice(s0)) } },
            { label: "Minimum", values: tv(d.temperature_2m_min.slice(s0)), color: "var(--soft-cool)" },
          ]}
          format={(v) => `${fmtNum(v, 1)}°`}
          onPick={(k) => k < 7 && setSel(k)}
        />
        <Chart labels={labels} tipLabels={tips} height={130} zeroBase series={[{ label: "Pluie (mm)", values: d.precipitation_sum.slice(s0), color: "var(--soft-rain)", kind: "bar" }]} format={(v) => `${fmtNum(v, 1)} mm`} />
      </section>

      <section className="card">
        <h3 className="card-title">Jour par jour</h3>
        <ul className="soft-days">
          {times.map((t, k) => {
            const i = s0 + k;
            const info = describeCode(d.weather_code[i], true);
            const mn = d.temperature_2m_min[i] ?? 0;
            const mx = d.temperature_2m_max[i] ?? 0;
            const p = d.precipitation_probability_max[i] ?? 0;
            return (
              <li key={t} style={{ animationDelay: `${k * 50}ms` }}>
                <Link to={`/jour/${t}`} className={`sd-row ${k === 0 ? "today" : ""}`}>
                  <span className="sd-day">{k === 0 ? "Aujourd'hui" : capitalize(dayName(t, "long"))} <small>{+t.slice(8, 10)}</small></span>
                  <WeatherIcon kind={info.icon} size={30} />
                  <span className="sd-cond">{info.label}</span>
                  <span className="sd-p">{p >= 20 ? `${p} %` : ""}</span>
                  <span className="sd-min">{fmtTemp(mn, unit)}</span>
                  <span className="sd-bar">
                    <i style={{ left: `${((mn - lo) / span) * 100}%`, width: `${Math.max(((mx - mn) / span) * 100, 6)}%`, background: `linear-gradient(90deg, ${softTempColor(mn)}, ${softTempColor(mx)})` }} />
                  </span>
                  <span className="sd-max">{fmtTemp(mx, unit)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
      <Source>Open-Meteo · au-delà de 7 jours, la fiabilité diminue : voyez la page <Link to="/modeles">Modèles</Link> pour l'incertitude.</Source>
    </div>
  );
}
