import { lazy, Suspense } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { PageHead, Source, WithForecast } from "../components/common";
import { ChartPanel } from "../components/charts/ChartPanel";
import { phenomenonBySlug, PHENOMENA } from "../lib/phenomena";
import { computeRisks, LEVEL_LABEL } from "../lib/risks";
import { METRICS } from "../lib/metrics";
import { nowIndex } from "../lib/weather";
import { usePlace } from "../state/store";
import { LAYERS } from "../components/map/layers";

const WeatherMap = lazy(() => import("../components/map/WeatherMap"));

export default function PhenomenonPage() {
  const { slug } = useParams();
  const p = phenomenonBySlug(slug);
  const place = usePlace();
  const nav = useNavigate();
  if (!p)
    return (
      <div className="page">
        <div className="card empty">
          <p>Phénomène inconnu.</p>
          <Link className="btn" to="/phenomenes">Tous les phénomènes</Link>
        </div>
      </div>
    );
  return (
    <div className="page">
      <PageHead kicker="Phénomène" title={p.title} />
      <p className="lead">{p.tagline}</p>
      <WithForecast>
        {(fc) => {
          const r = p.risk ? computeRisks(fc, nowIndex(fc.hourly.time, fc.current.time), 72).find((x) => x.id === p.risk) : undefined;
          // un graphique par paramètre, sauf les étages nuageux qui partagent la même unité
          const sameUnit = p.metrics.every((m) => METRICS[m].unit === METRICS[p.metrics[0]].unit && METRICS[m].kind === METRICS[p.metrics[0]].kind);
          const groups = sameUnit ? [p.metrics] : p.metrics.map((m) => [m]);
          return (
            <div className="phen-layout">
              <div className="stack">
                {r && (
                  <section className={`card risk-now lvl-b-${r.level}`}>
                    <div className="kicker">À {place.name}, sur 72 h</div>
                    <div className="risk-now-row">
                      <span className={`lvl lvl-${r.level} big-lvl`}>{LEVEL_LABEL[r.level]}</span>
                      <div>
                        <b>{r.value}</b>
                        <p className="small">{r.detail} {r.when && <span className="muted">· pic : {r.when}</span>}</p>
                      </div>
                    </div>
                    <p className="source">Indicateur calculé à partir des prévisions, pas une vigilance officielle.</p>
                  </section>
                )}
                {groups.map((g) => (
                  <ChartPanel key={g.join()} fc={fc} title={g.map((m) => METRICS[m].label).join(" · ")} metrics={g} hours={72} height={200} />
                ))}
                {p.mapLayer && (
                  <section className="card map-card">
                    <Suspense fallback={<div className="skeleton" style={{ height: 360 }} />}>
                      <WeatherMap lat={place.lat} lon={place.lon} zoom={5} initialLayers={[p.mapLayer]} compact height={360} onExpand={() => nav(`/carte?couches=${p.mapLayer}`)} />
                    </Suspense>
                    <p className="small muted pad">Couche : {LAYERS.find((l) => l.id === p.mapLayer)?.label} · <Link to={`/carte?couches=${p.mapLayer}`}>ouvrir en grand →</Link></p>
                  </section>
                )}
              </div>
              <article className="card prose">
                {p.sections.map((s) => (
                  <section key={s.title}>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </section>
                ))}
                {p.scale && (
                  <table className="data">
                    <thead><tr>{p.scale.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>{p.scale.rows.map((row) => <tr key={row[0]}>{row.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody>
                  </table>
                )}
                {p.tips && (
                  <>
                    <h3>Conseils</h3>
                    <ul>{p.tips.map((t) => <li key={t}>{t}</li>)}</ul>
                  </>
                )}
                <h3>Explorer aussi</h3>
                <div className="chips">
                  {p.related.map((s) => {
                    const o = PHENOMENA.find((x) => x.slug === s);
                    return o ? <Link key={s} className="chip" to={`/phenomenes/${s}`}>{o.title}</Link> : null;
                  })}
                  <Link className="chip" to={`/explorer?m=${p.metrics.join(",")}`}>Explorateur</Link>
                </div>
                <Source>Open-Meteo{p.mapLayer ? `, ${LAYERS.find((l) => l.id === p.mapLayer)?.source}` : ""}</Source>
              </article>
            </div>
          );
        }}
      </WithForecast>
    </div>
  );
}
