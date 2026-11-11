import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { PageHead, WithForecast, Source } from "../components/common";
import { Chart } from "../components/charts/Chart";
import { WeatherIcon } from "../components/WeatherIcon";
import { METRICS, METRIC_GROUPS, formatMetric, metricValues, type MetricId } from "../lib/metrics";
import { computeRisks, LEVEL_LABEL } from "../lib/risks";
import { addDays, dayLabel, describeCode, fmtDuration, fmtNum, fmtTemp, hm, hourOf, windDir } from "../lib/weather";
import { useStore } from "../state/store";

export default function Day() {
  const { date = "" } = useParams();
  const [sp] = useSearchParams();
  const unit = useStore((s) => s.unit);
  const [metric, setMetric] = useState<MetricId>("temperature");
  return (
    <div className="page">
      <WithForecast>
        {(fc, place) => {
          const di = fc.daily.time.indexOf(date);
          if (di < 0)
            return (
              <div className="card empty">
                <p>Cette date n'est pas couverte par la prévision.</p>
                <Link className="btn" to="/previsions">Voir les jours disponibles</Link>
              </div>
            );
          const today = fc.current.time.slice(0, 10);
          const idx = fc.hourly.time.map((t, i) => (t.startsWith(date) ? i : -1)).filter((i) => i >= 0);
          const from = idx[0];
          const to = idx[idx.length - 1] + 1;
          const times = fc.hourly.time.slice(from, to);
          const d = fc.daily;
          const info = describeCode(d.weather_code[di], true);
          const risks = computeRisks(fc, from, 24).filter((r) => r.level > 0);
          const m = METRICS[metric];
          const hl = sp.get("h");
          const prev = fc.daily.time.includes(addDays(date, -1)) ? addDays(date, -1) : null;
          const next = fc.daily.time.includes(addDays(date, 1)) ? addDays(date, 1) : null;
          return (
            <>
              <PageHead kicker={place.name} title={dayLabel(date, today)}>
                {prev && <Link className="icon-btn" to={`/jour/${prev}`} aria-label="Jour précédent"><ChevronLeft size={18} /></Link>}
                {next && <Link className="icon-btn" to={`/jour/${next}`} aria-label="Jour suivant"><ChevronRight size={18} /></Link>}
              </PageHead>
              <div className="day-hero card">
                <WeatherIcon kind={info.icon} size={88} />
                <div>
                  <div className="big">{fmtTemp(d.temperature_2m_max[di], unit)} <small>/ {fmtTemp(d.temperature_2m_min[di], unit)}</small></div>
                  <div>{info.label}</div>
                </div>
                <dl className="facts">
                  <div><dt>Précipitations</dt><dd>{fmtNum(d.precipitation_sum[di], 1)} mm en {fmtNum(d.precipitation_hours[di])} h</dd></div>
                  <div><dt>Probabilité max.</dt><dd>{d.precipitation_probability_max[di] ?? "—"} %</dd></div>
                  <div><dt>Rafales max.</dt><dd>{Math.round(d.wind_gusts_10m_max[di] ?? 0)} km/h · {windDir(d.wind_direction_10m_dominant[di])}</dd></div>
                  <div><dt>Soleil</dt><dd>{hm(d.sunrise[di])} → {hm(d.sunset[di])} · {fmtDuration(d.sunshine_duration[di])} d'ensoleillement</dd></div>
                  <div><dt>UV max.</dt><dd>{fmtNum(d.uv_index_max[di], 1)}</dd></div>
                  <div><dt>Neige</dt><dd>{fmtNum(d.snowfall_sum[di], 1)} cm</dd></div>
                </dl>
              </div>

              {risks.length > 0 && (
                <div className="chips" style={{ margin: "16px 0" }}>
                  {risks.map((r) => (
                    <Link key={r.id} to={`/phenomenes/${r.id}`} className={`chip lvl-b-${r.level}`}>
                      {r.label} · {LEVEL_LABEL[r.level]} · {r.value}
                    </Link>
                  ))}
                </div>
              )}

              <section className="card">
                <div className="toolbar">
                  <select value={metric} onChange={(e) => setMetric(e.target.value as MetricId)} aria-label="Paramètre">
                    {METRIC_GROUPS.map((g) => (
                      <optgroup key={g.label} label={g.label}>
                        {g.ids.map((id) => <option key={id} value={id}>{METRICS[id].label}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <span className="muted small">{m.description}</span>
                </div>
                <Chart
                  labels={times.map(hourOf)}
                  tipLabels={times.map(hm)}
                  series={[{ label: m.label, values: metricValues(m, fc, unit, from, to), color: m.color, kind: m.kind }]}
                  height={300}
                  zeroBase={m.zeroBase}
                  thresholds={m.thresholds}
                  marker={hl ? times.findIndex((t) => t.slice(11, 13) === hl) : times.findIndex((t) => t.slice(0, 13) === fc.current.time.slice(0, 13))}
                  format={(v) => formatMetric(m, v, unit)}
                  brush
                />
              </section>

              <section className="card">
                <h3 className="card-title">Heure par heure</h3>
                <div className="h-scroll">
                  {times.map((t, k) => {
                    const i = from + k;
                    const hi = describeCode(fc.hourly.weather_code[i], fc.hourly.is_day[i] === 1);
                    return (
                      <div key={t} className={`hour static ${hl === t.slice(11, 13) ? "hl" : ""}`}>
                        <span className="hour-t">{hourOf(t)}</span>
                        <WeatherIcon kind={hi.icon} size={32} />
                        <b>{fmtTemp(fc.hourly.temperature_2m[i], unit)}</b>
                        <span className="hour-p on">{(fc.hourly.precipitation[i] ?? 0) > 0 ? `${fmtNum(fc.hourly.precipitation[i], 1)} mm` : " "}</span>
                        <span className="hour-w">{Math.round(fc.hourly.wind_gusts_10m[i] ?? 0)} km/h</span>
                      </div>
                    );
                  })}
                </div>
              </section>
              <Source>Open-Meteo</Source>
            </>
          );
        }}
      </WithForecast>
    </div>
  );
}
