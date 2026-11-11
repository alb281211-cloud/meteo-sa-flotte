import { motion } from "framer-motion";
import { Dumbbell, GraduationCap, Sparkles, CloudSun, Code2, ArrowLeft } from "lucide-react";
import { Link } from "react-router";

const ease = [0.22, 1, 0.36, 1] as const;

const FACTS = [
  { icon: Sparkles, label: "Âge", value: "14 ans" },
  { icon: GraduationCap, label: "Établissement", value: "Lycée de Borda" },
  { icon: Dumbbell, label: "Passion", value: "Le sport" },
  { icon: CloudSun, label: "Projet", value: "Alphonse Buisson Météo" },
];

/** Page « Le créateur » : présente l'auteur du site. */
export default function About() {
  return (
    <div className="page about">
      <motion.section className="about-hero theme-sunny-day" initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 1.1, ease }}>
        <div className="hero-shade" />
        <div className="about-orb" />
        <div className="about-content">
          <motion.div className="about-avatar" initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.4, duration: 1.2, ease }}>
            AB
          </motion.div>
          <motion.p className="hero-date" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7, duration: 1 }}>
            Créateur du site
          </motion.p>
          <motion.h1 className="about-name" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 1.1, ease }}>
            Alphonse Buisson
          </motion.h1>
          <motion.p className="about-tagline" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 1.1, ease }}>
            J'ai imaginé et créé Alphonse Buisson Météo.
          </motion.p>
        </div>
      </motion.section>

      <div className="about-facts">
        {FACTS.map((f, i) => (
          <motion.div key={f.label} className="card about-fact" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 + i * 0.15, duration: 0.9, ease }}>
            <span className="about-icon">
              <f.icon size={20} />
            </span>
            <span className="stat-label">{f.label}</span>
            <b>{f.value}</b>
          </motion.div>
        ))}
      </div>

      <motion.article className="card about-text" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.7, duration: 1, ease }}>
        <h2 className="card-title">
          <Code2 size={16} /> Qui suis-je ?
        </h2>
        <p>
          Je m'appelle <b>Alphonse Buisson</b>, j'ai <b>14 ans</b> et je suis élève au <b>lycée de Borda</b>. J'adore le <b>sport</b>.
        </p>
        <p>
          Ce site météo est mon projet. J'ai voulu une plateforme où l'on peut cliquer partout pour explorer le ciel : cartes radar et satellite, prévisions heure par heure, graphiques, phénomènes météo et comparaisons entre villes.
        </p>
        <p className="about-sign">— Alphonse Buisson</p>
        <Link to="/" className="btn">
          <ArrowLeft size={15} /> Retour à la météo
        </Link>
      </motion.article>
    </div>
  );
}
