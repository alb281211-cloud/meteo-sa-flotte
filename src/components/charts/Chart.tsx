import { useEffect, useId, useMemo, useRef, useState } from "react";

export interface Series {
  label: string;
  values: (number | null)[];
  color: string;
  kind?: "line" | "area" | "bar";
  dashed?: boolean;
  /** bande (min/max) */
  band?: { lo: (number | null)[]; hi: (number | null)[] };
}

export interface ChartProps {
  labels: string[];
  /** libellé détaillé pour l'infobulle */
  tipLabels?: string[];
  series: Series[];
  height?: number;
  zeroBase?: boolean;
  format?: (v: number) => string;
  thresholds?: { value: number; label: string }[];
  /** index mis en évidence (ex. heure actuelle) */
  marker?: number;
  onPick?: (i: number) => void;
  brush?: boolean;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export function Chart({
  labels,
  tipLabels,
  series,
  height = 220,
  zeroBase,
  format = (v) => v.toLocaleString("fr-FR", { maximumFractionDigits: 1 }),
  thresholds,
  marker,
  onPick,
  brush,
}: ChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const uid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const [range, setRange] = useState<[number, number] | null>(null);
  const [drag, setDrag] = useState<number | null>(null);

  useEffect(() => {
    setRange(null);
  }, [labels.length, labels[0]]);

  const n = labels.length;
  const [a, b] = range ?? [0, n - 1];
  const count = Math.max(1, b - a);
  const pad = { l: 44, r: 12, t: 14, b: 26 };
  const W = width;
  const H = height;
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  const { lo, hi } = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const s of series) {
      const arrs = [s.values, s.band?.lo ?? [], s.band?.hi ?? []];
      for (const arr of arrs)
        for (let i = a; i <= b; i++) {
          const v = arr[i];
          if (v === null || v === undefined || Number.isNaN(v)) continue;
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        }
    }
    thresholds?.forEach((t) => {
      if (t.value >= lo - (hi - lo) * 0.3 && t.value <= hi + (hi - lo) * 0.3) {
        lo = Math.min(lo, t.value);
        hi = Math.max(hi, t.value);
      }
    });
    if (!Number.isFinite(lo)) return { lo: 0, hi: 1 };
    if (zeroBase) lo = Math.min(0, lo);
    if (hi - lo < 1e-6) hi = lo + 1;
    const m = (hi - lo) * 0.08;
    return { lo: zeroBase && lo >= 0 ? 0 : lo - m, hi: hi + m };
  }, [series, a, b, zeroBase, thresholds]);

  const x = (i: number) => pad.l + ((i - a) / count) * iw;
  const y = (v: number) => pad.t + ih - ((v - lo) / (hi - lo)) * ih;

  const ticks = useMemo(() => {
    const step = (hi - lo) / 4;
    return Array.from({ length: 5 }, (_, k) => lo + step * k);
  }, [lo, hi]);

  const labelEvery = Math.max(1, Math.ceil((b - a + 1) / Math.max(2, Math.floor(iw / 56))));

  const path = (vals: (number | null)[]) => {
    // courbe lissée (cubique entre points voisins)
    let d = "";
    let prev: [number, number] | null = null;
    for (let i = a; i <= b; i++) {
      const v = vals[i];
      if (v === null || v === undefined || Number.isNaN(v)) {
        prev = null;
        continue;
      }
      const px = x(i);
      const py = y(v);
      if (!prev) d += `M${px.toFixed(1)},${py.toFixed(1)}`;
      else {
        const mx = (prev[0] + px) / 2;
        d += `C${mx.toFixed(1)},${prev[1].toFixed(1)} ${mx.toFixed(1)},${py.toFixed(1)} ${px.toFixed(1)},${py.toFixed(1)}`;
      }
      prev = [px, py];
    }
    return d;
  };

  const idxAt = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    const px = clientX - r.left - pad.l;
    return Math.round(Math.min(b, Math.max(a, a + (px / iw) * count)));
  };

  const bars = series.filter((s) => s.kind === "bar");
  const bw = Math.max(1, (iw / (count + 1)) / Math.max(1, bars.length) - 2);

  const tipX = hover !== null ? x(hover) : 0;

  return (
    <div className="chart" ref={ref}>
      {series.length > 1 && (
        <div className="chart-legend">
          {series.map((s) => (
            <span key={s.label}>
              <i style={{ background: s.color, opacity: s.dashed ? 0.6 : 1 }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <svg
        width={W}
        height={H}
        onPointerMove={(e) => setHover(idxAt(e.clientX))}
        onPointerLeave={() => {
          setHover(null);
          setDrag(null);
        }}
        onPointerDown={(e) => brush && setDrag(idxAt(e.clientX))}
        onPointerUp={(e) => {
          const i = idxAt(e.clientX);
          if (brush && drag !== null && Math.abs(i - drag) >= 3) setRange([Math.min(i, drag), Math.max(i, drag)]);
          else onPick?.(i);
          setDrag(null);
        }}
        style={{ cursor: brush ? "crosshair" : onPick ? "pointer" : "default", touchAction: "pan-y" }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="grid" />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" className="axis">
              {format(t)}
            </text>
          </g>
        ))}
        {thresholds?.map((t) =>
          t.value >= lo && t.value <= hi ? (
            <g key={t.label}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t.value)} y2={y(t.value)} className="threshold" />
              <text x={W - pad.r - 4} y={y(t.value) - 4} textAnchor="end" className="axis thr">
                {t.label}
              </text>
            </g>
          ) : null,
        )}
        {labels.map((l, i) =>
          i >= a && i <= b && (i - a) % labelEvery === 0 ? (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="axis">
              {l}
            </text>
          ) : null,
        )}
        {marker !== undefined && marker >= a && marker <= b && (
          <line x1={x(marker)} x2={x(marker)} y1={pad.t} y2={pad.t + ih} className="now-line" />
        )}
        <defs>
          {series.map((s, si) => (
            <linearGradient key={si} id={`g${uid}${si}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.42} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <g className="chart-reveal" key={`${a}-${b}-${labels[0]}-${series.map((x) => x.label).join()}`}>
        {series.map((s, si) => {
          if (s.kind === "bar") {
            const bi = bars.indexOf(s);
            return (
              <g key={si} fill={s.color} className="bars-grow">
                {s.values.map((v, i) =>
                  i >= a && i <= b && v !== null && v > 0 ? (
                    <rect
                      key={i}
                      x={x(i) - (bw * bars.length) / 2 + bi * (bw + 1)}
                      y={y(v)}
                      width={bw}
                      height={Math.max(1, y(Math.max(0, lo)) - y(v))}
                      rx={Math.min(3, bw / 2)}
                      fillOpacity={hover === null || hover === i ? 1 : 0.5}
                      style={{ animationDelay: `${Math.min(((i - a) / Math.max(1, count)) * 0.9, 0.9)}s` }}
                    />
                  ) : null,
                )}
              </g>
            );
          }
          const d = path(s.values);
          return (
            <g key={si}>
              {s.band && <Band lo={s.band.lo} hi={s.band.hi} a={a} b={b} x={x} y={y} color={s.color} />}
              {s.kind === "area" && d && (
                <path d={`${d}L${x(lastIdx(s.values, a, b))},${y(Math.max(lo, 0))}L${x(firstIdx(s.values, a, b))},${y(Math.max(lo, 0))}Z`} fill={`url(#g${uid}${si})`} className="area-fade" />
              )}
              <path d={d} fill="none" stroke={s.color} strokeWidth={2.5} strokeDasharray={s.dashed ? "5 4" : undefined} className="chart-line" strokeLinejoin="round" strokeLinecap="round" />
            </g>
          );
        })}
        </g>
        {hover !== null && (
          <g>
            <line x1={tipX} x2={tipX} y1={pad.t} y2={pad.t + ih} className="crosshair" />
            {series.map((s, si) => {
              const v = s.values[hover];
              return v !== null && v !== undefined && s.kind !== "bar" ? (
                <circle key={si} cx={tipX} cy={y(v)} r={4.5} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
              ) : null;
            })}
          </g>
        )}
        {drag !== null && hover !== null && (
          <rect x={Math.min(x(drag), tipX)} y={pad.t} width={Math.abs(tipX - x(drag))} height={ih} className="brush" />
        )}
      </svg>
      {hover !== null && (
        <div className="chart-tip" style={{ left: Math.min(W - 170, Math.max(0, tipX + 12)) }}>
          <b>{tipLabels?.[hover] ?? labels[hover]}</b>
          {series.map((s) => {
            const v = s.values[hover];
            return (
              <div key={s.label}>
                <i style={{ background: s.color }} />
                <span>{s.label}</span>
                <strong>{v === null || v === undefined || Number.isNaN(v) ? "—" : format(v)}</strong>
              </div>
            );
          })}
          {series[0]?.band && (
            <div className="muted">
              Fourchette {fmtMaybe(series[0].band.lo[hover], format)} – {fmtMaybe(series[0].band.hi[hover], format)}
            </div>
          )}
        </div>
      )}
      {range && (
        <button className="chip chart-reset" onClick={() => setRange(null)}>
          Réinitialiser le zoom
        </button>
      )}
    </div>
  );
}

const fmtMaybe = (v: number | null | undefined, f: (v: number) => string) =>
  v === null || v === undefined || Number.isNaN(v) ? "—" : f(v);

function firstIdx(v: (number | null)[], a: number, b: number) {
  for (let i = a; i <= b; i++) if (v[i] !== null && v[i] !== undefined) return i;
  return a;
}
function lastIdx(v: (number | null)[], a: number, b: number) {
  for (let i = b; i >= a; i--) if (v[i] !== null && v[i] !== undefined) return i;
  return b;
}

function Band({
  lo,
  hi,
  a,
  b,
  x,
  y,
  color,
}: {
  lo: (number | null)[];
  hi: (number | null)[];
  a: number;
  b: number;
  x: (i: number) => number;
  y: (v: number) => number;
  color: string;
}) {
  const pts: string[] = [];
  const back: string[] = [];
  for (let i = a; i <= b; i++) {
    const l = lo[i];
    const h = hi[i];
    if (l === null || h === null || l === undefined || h === undefined || Number.isNaN(l) || Number.isNaN(h)) continue;
    pts.push(`${x(i).toFixed(1)},${y(h).toFixed(1)}`);
    back.unshift(`${x(i).toFixed(1)},${y(l).toFixed(1)}`);
  }
  if (!pts.length) return null;
  return <polygon points={[...pts, ...back].join(" ")} fill={color} opacity={0.18} />;
}

/** Mini-courbe pour les tuiles */
export function Sparkline({ values, color, height = 36 }: { values: (number | null)[]; color: string; height?: number }) {
  const v = values.filter((x): x is number => x !== null);
  if (v.length < 2) return null;
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  const w = 120;
  const d = values
    .map((val, i) => (val === null ? null : `${(i / (values.length - 1)) * w},${height - 3 - ((val - lo) / (hi - lo || 1)) * (height - 6)}`))
    .filter(Boolean)
    .join(" L");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="spark" preserveAspectRatio="none" aria-hidden="true">
      <path d={`M${d}`} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
    </svg>
  );
}
