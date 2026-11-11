import { memo } from "react";
import type { IconKind } from "../lib/weather";

/** Icônes météo vectorielles animées (CSS). */
export const WeatherIcon = memo(function WeatherIcon({
  kind,
  size = 48,
  className = "",
}: {
  kind: IconKind;
  size?: number;
  className?: string;
}) {
  const sun = (cx: number, cy: number, r: number) => (
    <g className="wi-sun">
      <circle cx={cx} cy={cy} r={r} fill="var(--wi-sun)" />
      <g className="wi-rays" style={{ transformOrigin: `${cx}px ${cy}px` }}>
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          return (
            <line
              key={i}
              x1={cx + Math.cos(a) * (r + 3)}
              y1={cy + Math.sin(a) * (r + 3)}
              x2={cx + Math.cos(a) * (r + 7)}
              y2={cy + Math.sin(a) * (r + 7)}
              stroke="var(--wi-sun)"
              strokeWidth={2.4}
              strokeLinecap="round"
            />
          );
        })}
      </g>
    </g>
  );
  const moon = (cx: number, cy: number, r: number) => (
    <path
      d={`M ${cx + r * 0.3} ${cy - r} a ${r} ${r} 0 1 0 ${r * 0.7} ${r * 1.55} a ${r * 0.8} ${r * 0.8} 0 1 1 ${-r * 0.7} ${-r * 1.55} z`}
      fill="var(--wi-moon)"
    />
  );
  const cloud = (dx = 0, dy = 0, fill = "var(--wi-cloud)") => (
    <path
      transform={`translate(${dx} ${dy})`}
      d="M14 40 h26 a9 9 0 0 0 0-18 a12 12 0 0 0-23-3 a10 10 0 0 0-3 21 z"
      fill={fill}
      className="wi-cloud"
    />
  );
  const drops = (n: number, heavy = false) => (
    <g className="wi-drops">
      {Array.from({ length: n }, (_, i) => (
        <line
          key={i}
          x1={18 + i * (22 / Math.max(1, n - 1))}
          y1={45}
          x2={15 + i * (22 / Math.max(1, n - 1))}
          y2={heavy ? 55 : 52}
          stroke="var(--wi-rain)"
          strokeWidth={2.4}
          strokeLinecap="round"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </g>
  );
  const flakes = () => (
    <g className="wi-flakes">
      {[18, 28, 38].map((x, i) => (
        <circle key={x} cx={x} cy={50} r={2.4} fill="var(--wi-snow)" style={{ animationDelay: `${i * 0.3}s` }} />
      ))}
    </g>
  );

  let content: React.ReactNode;
  switch (kind) {
    case "sun":
      content = sun(28, 28, 10);
      break;
    case "moon":
      content = moon(26, 28, 12);
      break;
    case "sun-cloud":
      content = (
        <>
          {sun(22, 20, 8)}
          {cloud(4, 6)}
        </>
      );
      break;
    case "moon-cloud":
      content = (
        <>
          {moon(20, 18, 9)}
          {cloud(4, 6)}
        </>
      );
      break;
    case "cloud":
      content = (
        <>
          {cloud(-4, -2, "var(--wi-cloud-2)")}
          {cloud(2, 4)}
        </>
      );
      break;
    case "fog":
      content = (
        <>
          {cloud(0, -4)}
          <g className="wi-fog">
            {[44, 50, 56].map((y, i) => (
              <line key={y} x1={10 + i * 3} y1={y} x2={46 - i * 2} y2={y} stroke="var(--wi-cloud-2)" strokeWidth={2.6} strokeLinecap="round" />
            ))}
          </g>
        </>
      );
      break;
    case "drizzle":
      content = (
        <>
          {cloud(0, -2)}
          {drops(3)}
        </>
      );
      break;
    case "rain":
      content = (
        <>
          {cloud(0, -2)}
          {drops(4)}
        </>
      );
      break;
    case "heavy-rain":
      content = (
        <>
          {cloud(0, -2, "var(--wi-cloud-2)")}
          {drops(5, true)}
        </>
      );
      break;
    case "snow":
      content = (
        <>
          {cloud(0, -2)}
          {flakes()}
        </>
      );
      break;
    case "sleet":
      content = (
        <>
          {cloud(0, -2)}
          {drops(2)}
          <circle cx={36} cy={52} r={2.4} fill="var(--wi-snow)" />
        </>
      );
      break;
    case "storm":
    case "hail":
      content = (
        <>
          {cloud(0, -4, "var(--wi-cloud-2)")}
          <path d="M30 38 l-7 10 h6 l-4 9 l11 -13 h-6 l4 -6 z" fill="var(--wi-bolt)" className="wi-bolt" />
          {kind === "hail" && (
            <>
              <circle cx={16} cy={50} r={2.2} fill="var(--wi-snow)" />
              <circle cx={42} cy={52} r={2.2} fill="var(--wi-snow)" />
            </>
          )}
        </>
      );
      break;
  }
  return (
    <svg viewBox="0 0 56 60" width={size} height={size} className={`wi ${className}`} aria-hidden="true">
      {content}
    </svg>
  );
});
