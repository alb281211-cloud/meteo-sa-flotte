import { RefreshCw, CloudOff } from "lucide-react";
import type { ReactNode } from "react";
import type { Forecast, Place } from "../lib/api";
import { useForecast } from "../lib/queries";
import { usePlace } from "../state/store";

export function PageHead({ kicker, title, children }: { kicker?: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        {kicker && <div className="kicker">{kicker}</div>}
        <h1>{title}</h1>
      </div>
      {children && <div className="page-head-tools">{children}</div>}
    </header>
  );
}

export function ErrorBox({ onRetry, msg = "Les données météo sont momentanément indisponibles." }: { onRetry?: () => void; msg?: string }) {
  return (
    <div className="card error-box">
      <CloudOff size={28} />
      <div>
        <b>Données indisponibles</b>
        <p className="muted small">{msg} Vérifiez votre connexion et réessayez.</p>
      </div>
      {onRetry && (
        <button className="btn" onClick={onRetry}>
          <RefreshCw size={14} /> Réessayer
        </button>
      )}
    </div>
  );
}

export function Skeletons({ n = 3, h = 180 }: { n?: number; h?: number }) {
  return (
    <div className="grid-auto">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="skeleton" style={{ height: h, animationDelay: `${i * 80}ms` }} />
      ))}
    </div>
  );
}

/** Charge la prévision du lieu courant et rend les enfants une fois disponible. */
export function WithForecast({ children }: { children: (fc: Forecast, place: Place) => ReactNode }) {
  const place = usePlace();
  const q = useForecast(place);
  if (q.isLoading) return <Skeletons n={4} />;
  if (q.isError || !q.data) return <ErrorBox onRetry={() => q.refetch()} />;
  return <>{children(q.data, place)}</>;
}

export function LevelBadge({ level, children }: { level: number; children: ReactNode }) {
  return <span className={`lvl lvl-${level}`}>{children}</span>;
}

export function Source({ children }: { children: ReactNode }) {
  return <p className="source">Source : {children}</p>;
}
