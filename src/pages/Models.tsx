import { useState } from "react";
import { PageHead, Source, ErrorBox } from "../components/common";
import { Chart } from "../components/charts/Chart";
import { MODELS } from "../lib/api";
import { useEnsemble, useModels } from "../lib/queries";
import { fmtNum, hourOf, shortDate, toUnit } from "../lib/weather";
import { usePlace, useStore } from "../state/store";

const VARS = [
  { id: "temperature_2m", label: "Température", unit: "°" },
  { id: "precipitation", label: "Précipitations", unit: "mm" },
  { id: "wind_gusts_10m", label: "Rafales", unit: "km/h" },
] as const;
const COLORS = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)"];

export default function Models() {
  const place = usePlace();
  const unit = useStore((s) => s.unit);
  const [v, setV] = useState<(typeof VARS)[number]["id"]>("temperature_2m");
  const meta = VARS.find((x) => x.id === v)!;
  const models = useModels(place, ["temperature_2m", "precipitation", "wind_gusts_10m"]);
  const thr = v === "temperature_2m" ? undefined : v === "precipitation" ? 1 : 60;
  const ens = useEnsemble(place, v, thr);
  const conv = (x: number | null) => (x === null || Number.isNaN(x) ? null : v === "temperature_2m" ? toUnit(x, unit) : x);
  const fmt = (x: number) => `${fmtNum(x, 1)} ${v === "temperature_2m" ? `°${unit}` : meta.unit}`;
  const lab = (t: string) => (t.slice(11, 13) === "00" ? shortDate(t) : hourOf(t));
  return (
    <div className="page">
      <PageHead kicker="Modèles et incertitude" title={`Que disent les modèles à ${place.name} ?`}>
        <div className="seg">
          {VARS.map((x) => <button key={x.id} className={v === x.id ? "on" : ""} onClick={() => setV(x.id)}>{x.label}</button>)}
        </div>
      </PageHead>
      <p className="lead">Quand les modèles concordent, la prévision est fiable. Quand ils divergent, l'incertitude est forte.</p>
      <section className="card">
        <h3 className="card-title">Quatre modèles déterministes sur 7 jours</h3>
        {models.isError && <ErrorBox onRetry={() => models.refetch()} />}
        {models.isLoading && <div className="skeleton" style={{ height: 320 }} />}
        {models.data && (
          <Chart
            labels={models.data.hourly.time.map(lab)}
            tipLabels={models.data.hourly.time.map((t) => `${shortDate(t)} ${hourOf(t)}`)}
            series={MODELS.map((m, i) => ({ label: `${m.label} (${m.origin})`, values: (models.data!.hourly[`${v}_${m.id}`] ?? []).map(conv), color: COLORS[i], kind: "line" as const }))}
            height={340}
            zeroBase={v !== "temperature_2m"}
            format={fmt}
            brush
          />
        )}
      </section>
      <section className="card">
        <h3 className="card-title">Prévision d'ensemble ECMWF : médiane et fourchette 10–90 %</h3>
        <p className="muted small">51 scénarios légèrement différents. La zone ombrée contient 80 % des scénarios.</p>
        {ens.isLoading && <div className="skeleton" style={{ height: 300 }} />}
        {ens.data && (
          <>
            <Chart
              labels={ens.data.time.map(lab)}
              tipLabels={ens.data.time.map((t) => `${shortDate(t)} ${hourOf(t)}`)}
              series={[{ label: "Médiane", values: ens.data.p50.map(conv), color: "var(--s1)", band: { lo: ens.data.p10.map(conv), hi: ens.data.p90.map(conv) } }]}
              height={300}
              zeroBase={v !== "temperature_2m"}
              format={fmt}
              brush
            />
            {ens.data.pExceed && (
              <>
                <h3 className="card-title" style={{ marginTop: 18 }}>Probabilité de dépasser {thr} {meta.unit}</h3>
                <Chart labels={ens.data.time.map(lab)} series={[{ label: "Probabilité", values: ens.data.pExceed, color: "var(--s2)", kind: "area" }]} height={180} zeroBase format={(x) => `${Math.round(x)} %`} />
              </>
            )}
          </>
        )}
      </section>
      <Source>Open-Meteo (ECMWF IFS & ENS, Météo-France ARPEGE/AROME, DWD ICON, NOAA GFS)</Source>
    </div>
  );
}
