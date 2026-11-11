import { PageHead, Source, ErrorBox } from "../components/common";
import { Chart } from "../components/charts/Chart";
import { useAir } from "../lib/queries";
import { fmtNum, hourOf, shortDate } from "../lib/weather";
import { usePlace } from "../state/store";

const POLLENS = [
  ["alder_pollen", "Aulne"],
  ["birch_pollen", "Bouleau"],
  ["grass_pollen", "Graminées"],
  ["mugwort_pollen", "Armoise"],
  ["olive_pollen", "Olivier"],
  ["ragweed_pollen", "Ambroisie"],
] as const;

export default function Air() {
  const place = usePlace();
  const q = useAir(place);
  const c = q.data?.current;
  const h = q.data?.hourly;
  const aqi = c?.european_aqi ?? 0;
  const lvl = aqi <= 20 ? "Bon" : aqi <= 40 ? "Correct" : aqi <= 60 ? "Moyen" : aqi <= 80 ? "Médiocre" : aqi <= 100 ? "Mauvais" : "Très mauvais";
  return (
    <div className="page">
      <PageHead kicker="Air et pollens" title={`Ce que l'on respire à ${place.name}`} />
      {q.isError && <ErrorBox onRetry={() => q.refetch()} />}
      {q.isLoading && <div className="skeleton" style={{ height: 300 }} />}
      {c && h && (
        <div className="stack">
          <div className="cmp-grid">
            <div className="card stat"><span className="stat-label">Indice européen</span><span className="stat-val">{c.european_aqi ?? "—"}</span><span className="small">{lvl}</span></div>
            {[["PM2,5", c.pm2_5], ["PM10", c.pm10], ["NO₂", c.nitrogen_dioxide], ["Ozone", c.ozone], ["SO₂", c.sulphur_dioxide]].map(([l, v]) => (
              <div key={l as string} className="card stat"><span className="stat-label">{l}</span><span className="stat-val">{fmtNum(v as number, 0)}</span><span className="small muted">µg/m³</span></div>
            ))}
          </div>
          <section className="card">
            <h3 className="card-title">Indice européen sur 4 jours</h3>
            <Chart labels={h.time.map((t) => (t.slice(11, 13) === "00" ? shortDate(t) : hourOf(t)))} series={[{ label: "IQA", values: h.european_aqi, color: "var(--s3)", kind: "area" }]} height={240} zeroBase thresholds={[{ value: 40, label: "40 · correct" }, { value: 60, label: "60 · moyen" }]} format={(v) => fmtNum(v, 0)} brush />
          </section>
          <section className="card">
            <h3 className="card-title">Particules fines (µg/m³)</h3>
            <Chart labels={h.time.map((t) => (t.slice(11, 13) === "00" ? shortDate(t) : hourOf(t)))} series={[{ label: "PM2,5", values: h.pm2_5, color: "var(--s1)" }, { label: "PM10", values: h.pm10, color: "var(--s2)" }]} height={220} zeroBase format={(v) => fmtNum(v, 0)} />
          </section>
          <section className="card">
            <h3 className="card-title">Pollens (grains/m³)</h3>
            <div className="pollen-grid">
              {POLLENS.map(([k, l]) => {
                const v = c[k];
                return (
                  <div key={k} className="pollen">
                    <span>{l}</span>
                    <div className="meter"><i style={{ width: `${Math.min(100, ((v ?? 0) / 80) * 100)}%`, background: "var(--s3)" }} /></div>
                    <b>{v === null ? "n/d" : fmtNum(v, 0)}</b>
                  </div>
                );
              })}
            </div>
            <p className="muted small">Les pollens ne sont modélisés que pour l'Europe, et uniquement pendant la saison de chaque espèce.</p>
          </section>
          <Source>Open-Meteo Air Quality (CAMS, Copernicus)</Source>
        </div>
      )}
    </div>
  );
}
