import { lazy, Suspense } from "react";
import { useSearchParams } from "react-router";
import { isLayerId, LAYERS, type LayerId } from "../components/map/layers";
import { usePlace } from "../state/store";

const WeatherMap = lazy(() => import("../components/map/WeatherMap"));

export default function MapPage() {
  const place = usePlace();
  const [sp] = useSearchParams();
  const layers = (sp.get("couches") ?? "radar").split(",").filter(isLayerId) as LayerId[];
  return (
    <div className="page map-page">
      <Suspense fallback={<div className="skeleton" style={{ height: "calc(100vh - 140px)" }} />}>
        <WeatherMap key={layers.join()} lat={place.lat} lon={place.lon} zoom={6} initialLayers={layers.length ? layers : ["radar"]} height="calc(100vh - 140px)" />
      </Suspense>
      <details className="card map-sources">
        <summary>À propos des couches</summary>
        <ul>
          {LAYERS.map((l) => (
            <li key={l.id}>
              <b>{l.label}</b> — {l.description} <span className="muted">({l.source}{l.coverage ? `, couverture : ${l.coverage}` : ""})</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
