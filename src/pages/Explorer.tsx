import { X, Plus } from "lucide-react";
import { useSearchParams } from "react-router";
import { PageHead, WithForecast, Source } from "../components/common";
import { Chart } from "../components/charts/Chart";
import { RANGES, useHourWindow } from "../components/charts/ChartPanel";
import { METRICS, METRIC_GROUPS, formatMetric, isMetricId, metricValues, type MetricId } from "../lib/metrics";
import { maxOf, minOf } from "../lib/weather";
import { useStore } from "../state/store";
import type { Forecast } from "../lib/api";
import { Link } from "react-router";

/** Explorateur : plusieurs paramètres empilés, chacun sur son propre axe, sur la même période. */
export default function Explorer() {
  const [sp, setSp] = useSearchParams();
  const ids = (sp.get("m") ?? "temperature,precipitation,gusts,pressure").split(",").filter(isMetricId);
  const hours = Number(sp.get("h")) || 168;
  const update = (m: MetricId[], h = hours) => setSp({ m: m.join(","), h: String(h) }, { replace: true });
  return (
    <div className="page">
      <PageHead kicker="Explorateur de données" title="Croisez les paramètres">
        <div className="seg">
          {RANGES.map((r) => (
            <button key={r.id} className={hours === r.hours ? "on" : ""} onClick={() => update(ids, r.hours)}>{r.label}</button>
          ))}
        </div>
      </PageHead>
      <div className="card explorer-picker">
        {METRIC_GROUPS.map((g) => (
          <div key={g.label} className="picker-group">
            <span className="muted small">{g.label}</span>
            <div className="chips">
              {g.ids.map((id) => {
                const on = ids.includes(id);
                return (
                  <button key={id} className={`chip ${on ? "on" : ""}`} onClick={() => update(on ? ids.filter((x) => x !== id) : [...ids, id])}>
                    {on ? <X size={12} /> : <Plus size={12} />} {METRICS[id].label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <WithForecast>{(fc) => <Stack fc={fc} ids={ids} hours={hours} />}</WithForecast>
    </div>
  );
}

function Stack({ fc, ids, hours }: { fc: Forecast; ids: MetricId[]; hours: number }) {
  const unit = useStore((s) => s.unit);
  const w = useHourWindow(fc, hours);
  if (!ids.length) return <div className="card empty"><p>Choisissez au moins un paramètre ci-dessus.</p></div>;
  return (
    <div className="stack">
      {ids.map((id) => {
        const m = METRICS[id];
        const vals = metricValues(m, fc, unit, w.start, w.end);
        return (
          <section key={id} className="card">
            <header className="card-head">
              <div>
                <h3 className="card-title">{m.label}</h3>
                <p className="muted small">{m.description}</p>
              </div>
              <div className="small right">
                min. <b>{formatMetric(m, minOf(vals), unit)}</b> · max. <b>{formatMetric(m, maxOf(vals), unit)}</b>
                {m.phenomenon && <div><Link to={`/phenomenes/${m.phenomenon}`}>Comprendre →</Link></div>}
              </div>
            </header>
            <Chart labels={w.labels} tipLabels={w.tips} series={[{ label: m.label, values: vals, color: m.color, kind: m.kind }]} height={190} zeroBase={m.zeroBase} thresholds={m.thresholds} format={(v) => formatMetric(m, v, unit)} brush />
          </section>
        );
      })}
      <Source>Open-Meteo · glissez sur un graphique pour zoomer</Source>
    </div>
  );
}
