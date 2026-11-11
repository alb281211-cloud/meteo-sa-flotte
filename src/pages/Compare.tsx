import { useQueries } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState } from "react";
import { PageHead, Source } from "../components/common";
import { Chart } from "../components/charts/Chart";
import { WeatherIcon } from "../components/WeatherIcon";
import { fetchForecast, searchPlaces, type Place } from "../lib/api";
import { useArchive } from "../lib/queries";
import { METRICS, METRIC_GROUPS, formatMetric, metricValues, type MetricId } from "../lib/metrics";
import { addDays, describeCode, fmtNum, fmtTemp, hourOf, meanOf, nowIndex, shortDate, sum } from "../lib/weather";
import { setState, usePlace, useStore } from "../state/store";

const COLORS = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)"];

export default function Compare() {
  const [tab, setTab] = useState<"villes" | "periodes">("villes");
  return (
    <div className="page">
      <PageHead kicker="Comparer" title={tab === "villes" ? "Plusieurs villes" : "Plusieurs périodes"}>
        <div className="seg">
          <button className={tab === "villes" ? "on" : ""} onClick={() => setTab("villes")}>Villes</button>
          <button className={tab === "periodes" ? "on" : ""} onClick={() => setTab("periodes")}>Périodes</button>
        </div>
      </PageHead>
      {tab === "villes" ? <Cities /> : <Periods />}
    </div>
  );
}

function AddCity({ onAdd }: { onAdd: (p: Place) => void }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Place[]>([]);
  return (
    <div className="add-city">
      <input
        value={q}
        placeholder="Ajouter une ville…"
        onChange={async (e) => {
          setQ(e.target.value);
          if (e.target.value.length >= 2) setRes(await searchPlaces(e.target.value).catch(() => []));
          else setRes([]);
        }}
      />
      {res.length > 0 && (
        <ul className="dropdown">
          {res.map((p) => (
            <li key={p.id}>
              <button onClick={() => { onAdd(p); setQ(""); setRes([]); }}>
                {p.name} <small className="muted">{[p.admin, p.country].filter(Boolean).join(", ")}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Cities() {
  const place = usePlace();
  const unit = useStore((s) => s.unit);
  const stored = useStore((s) => s.compare);
  const favs = useStore((s) => s.favorites);
  const [metric, setMetric] = useState<MetricId>("temperature");
  const list = [place, ...(stored.length ? stored : favs)].filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i).slice(0, 4);
  const qs = useQueries({ queries: list.map((p) => ({ queryKey: ["forecast", p.lat, p.lon], queryFn: () => fetchForecast(p.lat, p.lon), staleTime: 600000 })) });
  const m = METRICS[metric];
  const base = qs[0]?.data;
  const start = base ? nowIndex(base.hourly.time, base.current.time) : 0;
  const times = base?.hourly.time.slice(start, start + 168) ?? [];
  return (
    <div className="stack">
      <div className="card">
        <div className="chips">
          {list.map((p, i) => (
            <span key={p.id} className="chip on" style={{ borderColor: COLORS[i] }}>
              <i className="sw" style={{ background: COLORS[i] }} /> {p.name}
              {i > 0 && (
                <button className="chip-x" onClick={() => setState({ compare: list.slice(1).filter((x) => x.id !== p.id) })} aria-label={`Retirer ${p.name}`}>
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
          {list.length < 4 && <AddCity onAdd={(p) => setState({ compare: [...list.slice(1), p] })} />}
        </div>
      </div>
      <div className="cmp-grid">
        {list.map((p, i) => {
          const d = qs[i]?.data;
          if (!d) return <div key={p.id} className="skeleton" style={{ height: 150 }} />;
          const info = describeCode(d.current.weather_code, d.current.is_day === 1);
          const s = nowIndex(d.hourly.time, d.current.time);
          return (
            <button key={p.id} className="card cmp-card" style={{ borderTopColor: COLORS[i] }} onClick={() => setState({ place: p })} title="Afficher cette ville sur le tableau de bord">
              <b>{p.name}</b>
              <div className="cmp-now"><WeatherIcon kind={info.icon} size={40} /><span className="big">{fmtTemp(d.current.temperature_2m, unit)}</span></div>
              <span className="small">{info.label}</span>
              <span className="small muted">7 j : {fmtNum(sum(d.hourly.precipitation.slice(s, s + 168)), 0)} mm · moy. {fmtTemp(meanOf(d.hourly.temperature_2m.slice(s, s + 168)), unit)}</span>
            </button>
          );
        })}
      </div>
      <section className="card">
        <div className="toolbar">
          <select value={metric} onChange={(e) => setMetric(e.target.value as MetricId)} aria-label="Paramètre">
            {METRIC_GROUPS.map((g) => (
              <optgroup key={g.label} label={g.label}>{g.ids.map((id) => <option key={id} value={id}>{METRICS[id].label}</option>)}</optgroup>
            ))}
          </select>
          <span className="muted small">7 prochains jours, heure par heure</span>
        </div>
        <Chart
          labels={times.map((t) => (t.slice(11, 13) === "00" ? shortDate(t) : hourOf(t)))}
          tipLabels={times.map((t) => `${shortDate(t)} ${hourOf(t)}`)}
          series={list.map((p, i) => {
            const d = qs[i]?.data;
            const s = d ? nowIndex(d.hourly.time, d.current.time) : 0;
            return { label: p.name, values: d ? metricValues(m, d, unit, s, s + 168) : [], color: COLORS[i], kind: m.kind === "bar" ? "line" : "line" };
          })}
          height={340}
          zeroBase={m.zeroBase}
          format={(v) => formatMetric(m, v, unit)}
          brush
        />
      </section>
      <Source>Open-Meteo</Source>
    </div>
  );
}

function Periods() {
  const place = usePlace();
  const unit = useStore((s) => s.unit);
  const today = new Date().toISOString().slice(0, 10);
  const [endA, setEndA] = useState(addDays(today, -7));
  const [len, setLen] = useState(30);
  const [yearsBack, setYearsBack] = useState(1);
  const startA = addDays(endA, -len + 1);
  const shift = (d: string) => `${+d.slice(0, 4) - yearsBack}${d.slice(4)}`;
  const A = useArchive(place, startA, endA);
  const B = useArchive(place, shift(startA), shift(endA));
  const v = (x: (number | null)[] | undefined) => (x ?? []).map((n) => (n === null ? null : unit === "F" ? (n * 9) / 5 + 32 : n));
  const labels = (A.data?.time ?? []).map((t) => shortDate(t));
  const stat = (d: typeof A.data) =>
    d && {
      t: meanOf(d.temperature_2m_mean),
      p: sum(d.precipitation_sum),
      s: sum(d.sunshine_duration) / 3600,
      g: Math.max(...d.wind_gusts_10m_max.map((x) => x ?? 0)),
    };
  const a = stat(A.data);
  const b = stat(B.data);
  return (
    <div className="stack">
      <div className="card toolbar">
        <label>Fin de période <input type="date" value={endA} max={addDays(today, -5)} onChange={(e) => setEndA(e.target.value)} /></label>
        <label>Durée
          <select value={len} onChange={(e) => setLen(+e.target.value)}>
            <option value={7}>7 jours</option><option value={30}>30 jours</option><option value={90}>3 mois</option><option value={365}>1 an</option>
          </select>
        </label>
        <label>Comparer à
          <select value={yearsBack} onChange={(e) => setYearsBack(+e.target.value)}>
            {[1, 2, 5, 10, 20, 30, 40].map((y) => <option key={y} value={y}>il y a {y} an{y > 1 ? "s" : ""}</option>)}
          </select>
        </label>
        <span className="muted small">Réanalyse ERA5 à {place.name} (observations historiques depuis 1940)</span>
      </div>
      {(A.isLoading || B.isLoading) && <div className="skeleton" style={{ height: 300 }} />}
      {a && b && (
        <>
          <div className="cmp-grid">
            {[
              { l: "Température moyenne", x: fmtTemp(a.t, unit), y: fmtTemp(b.t, unit), d: `${a.t - b.t >= 0 ? "+" : ""}${fmtNum(a.t - b.t, 1)} °C` },
              { l: "Cumul de pluie", x: `${fmtNum(a.p, 0)} mm`, y: `${fmtNum(b.p, 0)} mm`, d: `${a.p - b.p >= 0 ? "+" : ""}${fmtNum(a.p - b.p, 0)} mm` },
              { l: "Ensoleillement", x: `${fmtNum(a.s, 0)} h`, y: `${fmtNum(b.s, 0)} h`, d: `${a.s - b.s >= 0 ? "+" : ""}${fmtNum(a.s - b.s, 0)} h` },
              { l: "Rafale maximale", x: `${fmtNum(a.g, 0)} km/h`, y: `${fmtNum(b.g, 0)} km/h`, d: "" },
            ].map((s) => (
              <div key={s.l} className="card stat">
                <span className="stat-label">{s.l}</span>
                <span className="stat-val">{s.x}</span>
                <span className="small muted">contre {s.y} {s.d && <b>({s.d})</b>}</span>
              </div>
            ))}
          </div>
          <section className="card">
            <h3 className="card-title">Température moyenne journalière</h3>
            <Chart labels={labels} height={300} series={[
              { label: `${startA.slice(0, 4)}`, values: v(A.data?.temperature_2m_mean), color: "var(--s1)" },
              { label: `${shift(startA).slice(0, 4)}`, values: v(B.data?.temperature_2m_mean), color: "var(--s2)" },
            ]} format={(x) => `${fmtNum(x, 1)}°`} brush />
          </section>
          <section className="card">
            <h3 className="card-title">Précipitations journalières (mm)</h3>
            <Chart labels={labels} height={240} zeroBase series={[
              { label: `${startA.slice(0, 4)}`, values: A.data?.precipitation_sum ?? [], color: "var(--s1)", kind: "bar" },
              { label: `${shift(startA).slice(0, 4)}`, values: B.data?.precipitation_sum ?? [], color: "var(--s2)", kind: "bar" },
            ]} format={(x) => `${fmtNum(x, 1)} mm`} />
          </section>
        </>
      )}
      <Source>Open-Meteo Historical Weather API (ECMWF ERA5 / ERA5-Land)</Source>
    </div>
  );
}
