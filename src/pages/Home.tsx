import { Link } from "react-router";
import { ArrowDown, ArrowUp, EyeOff, Plus, RotateCcw, SlidersHorizontal, Check } from "lucide-react";
import { useState } from "react";
import { ErrorBox } from "../components/common";
import { useForecast } from "../lib/queries";
import { ALL_WIDGETS, DEFAULT_WIDGETS, setState, usePlace, useStore, type WidgetId } from "../state/store";
import { WIDGETS, WidgetFrame } from "../widgets/widgets";

export default function Home() {
  const place = usePlace();
  const q = useForecast(place);
  const widgets = useStore((s) => s.widgets);
  const [edit, setEdit] = useState(false);

  const move = (id: WidgetId, d: -1 | 1) =>
    setState((s) => {
      const arr = [...s.widgets];
      const i = arr.indexOf(id);
      const j = i + d;
      if (j < 0 || j >= arr.length) return {};
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { widgets: arr };
    });
  const hide = (id: WidgetId) => setState((s) => ({ widgets: s.widgets.filter((w) => w !== id) }));
  const add = (id: WidgetId) => setState((s) => ({ widgets: [...s.widgets, id] }));
  const hidden = ALL_WIDGETS.filter((w) => !widgets.includes(w.id));

  return (
    <div className="page">
      <div className="dash-bar">
        <div>
          <div className="kicker">Tableau de bord</div>
          <h1 className="dash-title">La météo à {place.name}</h1>
        </div>
        <button className={`btn ${edit ? "" : "ghost"}`} onClick={() => setEdit(!edit)}>
          {edit ? <Check size={15} /> : <SlidersHorizontal size={15} />} {edit ? "Terminer" : "Personnaliser"}
        </button>
      </div>

      {edit && (
        <div className="card edit-panel">
          <p className="small">
            Réorganisez les blocs avec les flèches, masquez ceux qui ne vous servent pas et ajoutez-en d'autres. Vos choix sont enregistrés sur cet appareil.
          </p>
          {hidden.length > 0 && (
            <div className="chips">
              {hidden.map((w) => (
                <button key={w.id} className="chip" onClick={() => add(w.id)} title={w.hint}>
                  <Plus size={13} /> {w.label}
                </button>
              ))}
            </div>
          )}
          <button className="btn ghost small" onClick={() => setState({ widgets: DEFAULT_WIDGETS })}>
            <RotateCcw size={13} /> Disposition par défaut
          </button>
        </div>
      )}

      {q.isLoading && (
        <div className="dash">
          {widgets.slice(0, 6).map((w, i) => (
            <div key={w} className={`w w-${w}`}>
              <div className="skeleton" style={{ height: w === "now" ? 420 : 200, animationDelay: `${i * 70}ms` }} />
            </div>
          ))}
        </div>
      )}
      {q.isError && <ErrorBox onRetry={() => q.refetch()} />}
      {q.data && (
        <div className={`dash ${edit ? "editing" : ""}`}>
          {widgets.map((id, i) => {
            const W = WIDGETS[id];
            return (
              <WidgetFrame key={id} id={id} index={i}>
                {edit && (
                  <div className="w-tools">
                    <span>{ALL_WIDGETS.find((w) => w.id === id)?.label}</span>
                    <button className="icon-btn" onClick={() => move(id, -1)} disabled={i === 0} aria-label="Monter">
                      <ArrowUp size={14} />
                    </button>
                    <button className="icon-btn" onClick={() => move(id, 1)} disabled={i === widgets.length - 1} aria-label="Descendre">
                      <ArrowDown size={14} />
                    </button>
                    <button className="icon-btn" onClick={() => hide(id)} aria-label="Masquer">
                      <EyeOff size={14} />
                    </button>
                  </div>
                )}
                <W fc={q.data} place={place} />
              </WidgetFrame>
            );
          })}
        </div>
      )}
      <div className="center" style={{ marginTop: 28 }}>
        <Link to="/createur" className="creator-link">
          Site créé par <b>Alphonse Buisson</b> · découvrir le créateur →
        </Link>
      </div>
      <p className="source center">
        Données : Open-Meteo (modèles ECMWF, Météo-France, DWD, NOAA…), RainViewer, EUMETSAT, NASA GIBS, OpenStreetMap, Wikipédia.
      </p>
    </div>
  );
}
