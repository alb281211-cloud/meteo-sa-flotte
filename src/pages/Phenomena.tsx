import { Link } from "react-router";
import { motion } from "framer-motion";
import { PageHead } from "../components/common";
import { PHENOMENA } from "../lib/phenomena";
import { computeRisks, LEVEL_LABEL } from "../lib/risks";
import { useForecast } from "../lib/queries";
import { nowIndex } from "../lib/weather";
import { usePlace } from "../state/store";

export default function Phenomena() {
  const place = usePlace();
  const q = useForecast(place);
  const risks = q.data ? computeRisks(q.data, nowIndex(q.data.hourly.time, q.data.current.time), 48) : [];
  return (
    <div className="page">
      <PageHead kicker="Encyclopédie vivante" title="Phénomènes météorologiques" />
      <p className="lead">Chaque phénomène est expliqué et relié aux prévisions réelles de {place.name} : indicateurs du moment, graphiques et carte dédiée.</p>
      <div className="phen-grid">
        {PHENOMENA.map((p, i) => {
          const r = risks.find((x) => x.id === p.risk);
          return (
            <motion.div key={p.slug} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
              <Link to={`/phenomenes/${p.slug}`} className={`card phen phen-${p.slug}`}>
                <span className="phen-title">{p.title}</span>
                <span className="muted small">{p.tagline}</span>
                {r && (
                  <span className={`lvl lvl-${r.level}`}>
                    {place.name} : {LEVEL_LABEL[r.level]} · {r.value}
                  </span>
                )}
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
