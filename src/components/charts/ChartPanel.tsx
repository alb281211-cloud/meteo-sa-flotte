import { Maximize2, Table2, LineChart, ArrowUpRight } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import type { Forecast } from "../../lib/api";
import { METRICS, formatMetric, metricUnit, metricValues, type MetricId } from "../../lib/metrics";
import { dayLabel, hm, hourOf, maxOf, meanOf, minOf, nowIndex, shortDate, sum } from "../../lib/weather";
import { useStore } from "../../state/store";
import { Modal } from "../Modal";
import { Chart, type Series } from "./Chart";

export const RANGES = [
  { id: "24", label: "24 h", hours: 24 },
  { id: "48", label: "48 h", hours: 48 },
  { id: "168", label: "7 jours", hours: 168 },
  { id: "384", label: "16 jours", hours: 384 },
];

export function useHourWindow(fc: Forecast, hours: number, offset = 0) {
  return useMemo(() => {
    const start = nowIndex(fc.hourly.time, fc.current.time) + offset;
    const end = Math.min(fc.hourly.time.length, start + hours);
    const times = fc.hourly.time.slice(start, end);
    const today = fc.current.time.slice(0, 10);
    const long = hours > 48;
    const labels = times.map((t) => (long ? (t.slice(11, 13) === "00" ? shortDate(t) : hourOf(t)) : hourOf(t)));
    const tips = times.map((t) => `${dayLabel(t, today)} · ${hm(t)}`);
    return { start, end, times, labels, tips };
  }, [fc, hours, offset]);
}

export function metricSeries(fc: Forecast, ids: MetricId[], unit: "C" | "F", start: number, end: number): Series[] {
  return ids.map((id) => {
    const m = METRICS[id];
    return { label: m.label, values: metricValues(m, fc, unit, start, end), color: m.color, kind: m.kind, dashed: id === "apparent" || id === "dewpoint" };
  });
}

/** Carte contenant un graphique compact, qui s'ouvre en grand avec tableau, statistiques et zoom. */
export function ChartPanel({
  fc,
  title,
  metrics,
  icon,
  hours = 48,
  height = 180,
  footer,
}: {
  fc: Forecast;
  title: string;
  metrics: MetricId[];
  icon?: ReactNode;
  hours?: number;
  height?: number;
  footer?: ReactNode;
}) {
  const unit = useStore((s) => s.unit);
  const [open, setOpen] = useState(false);
  const w = useHourWindow(fc, hours);
  const m0 = METRICS[metrics[0]];
  const series = metricSeries(fc, metrics, unit, w.start, w.end);
  return (
    <section className="card chart-card">
      <header className="card-head">
        <button className="card-title as-link" onClick={() => setOpen(true)}>
          {icon}
          {title}
        </button>
        <div className="card-tools">
          <Link className="icon-btn" to={`/explorer?m=${metrics.join(",")}`} title="Ouvrir dans l'explorateur" aria-label="Ouvrir dans l'explorateur">
            <LineChart size={16} />
          </Link>
          <button className="icon-btn" onClick={() => setOpen(true)} title="Agrandir" aria-label="Agrandir le graphique">
            <Maximize2 size={16} />
          </button>
        </div>
      </header>
      <Chart
        labels={w.labels}
        tipLabels={w.tips}
        series={series}
        height={height}
        zeroBase={m0.zeroBase}
        thresholds={m0.thresholds}
        format={(v) => formatMetric(m0, v, unit)}
      />
      {footer}
      <ChartModal fc={fc} open={open} onClose={() => setOpen(false)} title={title} metrics={metrics} initialHours={hours} />
    </section>
  );
}

export function ChartModal({
  fc,
  open,
  onClose,
  title,
  metrics,
  initialHours = 48,
}: {
  fc: Forecast;
  open: boolean;
  onClose: () => void;
  title: string;
  metrics: MetricId[];
  initialHours?: number;
}) {
  const unit = useStore((s) => s.unit);
  const [hours, setHours] = useState(initialHours);
  const [table, setTable] = useState(false);
  const w = useHourWindow(fc, hours);
  const m0 = METRICS[metrics[0]];
  const series = metricSeries(fc, metrics, unit, w.start, w.end);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={m0.description}
      actions={
        <Link className="btn ghost" to={`/explorer?m=${metrics.join(",")}`} onClick={onClose}>
          Explorateur <ArrowUpRight size={14} />
        </Link>
      }
    >
      <div className="toolbar">
        <div className="seg">
          {RANGES.map((r) => (
            <button key={r.id} className={hours === r.hours ? "on" : ""} onClick={() => setHours(r.hours)}>
              {r.label}
            </button>
          ))}
        </div>
        <button className={`chip ${table ? "on" : ""}`} onClick={() => setTable(!table)}>
          <Table2 size={14} /> {table ? "Graphique" : "Tableau"}
        </button>
        <span className="muted small">Glissez sur le graphique pour zoomer sur une période.</span>
      </div>
      <div className="stats-row">
        {series.map((s, i) => {
          const m = METRICS[metrics[i]];
          const isSum = m.kind === "bar";
          return (
            <div className="stat" key={s.label}>
              <span className="stat-label">{s.label}</span>
              <span className="stat-val">
                {isSum ? `Σ ${formatMetric(m, sum(s.values), unit)}` : `${formatMetric(m, minOf(s.values), unit)} → ${formatMetric(m, maxOf(s.values), unit)}`}
              </span>
              <span className="muted small">
                {isSum ? `max. horaire ${formatMetric(m, maxOf(s.values), unit)}` : `moyenne ${formatMetric(m, meanOf(s.values), unit)}`}
              </span>
            </div>
          );
        })}
      </div>
      {table ? (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Heure</th>
                {metrics.map((id) => (
                  <th key={id}>
                    {METRICS[id].label} ({metricUnit(METRICS[id], unit)})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {w.times.map((t, i) => (
                <tr key={t}>
                  <td>{w.tips[i]}</td>
                  {series.map((s, k) => (
                    <td key={k}>{formatMetric(METRICS[metrics[k]], s.values[i], unit)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Chart
          labels={w.labels}
          tipLabels={w.tips}
          series={series}
          height={380}
          zeroBase={m0.zeroBase}
          thresholds={m0.thresholds}
          format={(v) => formatMetric(m0, v, unit)}
          brush
        />
      )}
      {m0.phenomenon && (
        <p className="small muted" style={{ marginTop: 12 }}>
          Pour comprendre ce phénomène :{" "}
          <Link to={`/phenomenes/${m0.phenomenon}`} onClick={onClose}>
            ouvrir la page dédiée →
          </Link>
        </p>
      )}
    </Modal>
  );
}
