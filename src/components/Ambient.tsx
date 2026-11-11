import { memo, useEffect, useMemo } from "react";
import { useCityImage, useForecast } from "../lib/queries";
import { themeOf } from "../lib/weather";
import { usePlace } from "../state/store";

const GRADS: Record<string, string> = {
  "theme-sunny-day": "radial-gradient(ellipse at 20% 0%, rgba(251,191,36,0.28) 0%, rgba(56,189,248,0.22) 45%, rgba(29,78,216,0.12) 100%)",
  "theme-partly-cloudy": "radial-gradient(ellipse at 45% 0%, rgba(125,211,252,0.22) 0%, rgba(71,85,105,0.2) 60%, rgba(30,41,59,0.15) 100%)",
  "theme-cloudy": "radial-gradient(ellipse at 45% 0%, rgba(125,211,252,0.16) 0%, rgba(71,85,105,0.22) 60%, rgba(30,41,59,0.18) 100%)",
  "theme-clear-night": "radial-gradient(ellipse at 50% 0%, rgba(30,27,75,0.7) 0%, rgba(5,10,24,0.92) 70%)",
  "theme-rainy": "radial-gradient(ellipse at 50% 0%, rgba(30,58,138,0.35) 0%, rgba(15,23,42,0.55) 100%)",
  "theme-stormy": "radial-gradient(ellipse at 40% 0%, rgba(109,40,217,0.28) 0%, rgba(13,13,26,0.65) 65%)",
  "theme-snowy": "radial-gradient(ellipse at 50% 0%, rgba(186,230,253,0.35) 0%, rgba(241,245,249,0.18) 100%)",
};
const ORBS: Record<string, [string, string]> = {
  "theme-sunny-day": ["rgba(251,191,36,0.18)", "rgba(56,189,248,0.14)"],
  "theme-clear-night": ["rgba(99,102,241,0.14)", "rgba(139,92,246,0.1)"],
  "theme-rainy": ["rgba(59,130,246,0.1)", "rgba(56,189,248,0.07)"],
  "theme-stormy": ["rgba(147,51,234,0.14)", "rgba(99,102,241,0.1)"],
  "theme-snowy": ["rgba(186,230,253,0.22)", "rgba(255,255,255,0.18)"],
};

/** Fond d'ambiance de la version d'origine : photo floutée de la ville, dégradé selon le temps, pluie, neige, étoiles. */
export const Ambient = memo(function Ambient() {
  const place = usePlace();
  const fc = useForecast(place);
  const img = useCityImage(place.name);
  const c = fc.data?.current;
  const theme = c ? themeOf(c.weather_code, c.is_day === 1) : "theme-partly-cloudy";
  const rain = theme === "theme-rainy" || theme === "theme-stormy";
  const snow = theme === "theme-snowy";
  const night = c?.is_day === 0;
  const drops = useMemo(() => Array.from({ length: 40 }, (_, i) => ({ x: (i * 2.5 + 1.3) % 100, d: (i * 0.071) % 2, t: 0.55 + ((i * 0.13) % 0.5), h: 14 + ((i * 1.7) % 12) })), []);
  const flakes = useMemo(() => Array.from({ length: 30 }, (_, i) => ({ x: (i * 3.33 + 0.5) % 100, d: (i * 0.23) % 6, t: 5 + ((i * 0.19) % 5), s: 2 + ((i * 0.11) % 3), dr: (i % 2 ? -1 : 1) * ((i * 1.3) % 40) })), []);
  const stars = useMemo(() => Array.from({ length: 50 }, (_, i) => ({ x: (i * 2 + 1.1) % 100, y: (i * 1.3 + 0.7) % 65, s: 1 + ((i * 0.04) % 2), d: (i * 0.085) % 4, t: 2 + ((i * 0.063) % 3) })), []);
  useEffect(() => {
    document.body.classList.toggle("has-photo", !!img.data);
  }, [img.data]);
  useEffect(() => {
    document.body.dataset.sky = theme.replace("theme-", "");
  }, [theme]);
  const orbs = ORBS[theme] ?? ["rgba(125,211,252,0.12)", "rgba(148,163,184,0.1)"];
  return (
    <div className="ambient" aria-hidden="true">
      {img.data && <div className="ambient-photo" style={{ backgroundImage: `url(${img.data})` }} />}
      <div className="ambient-grad" style={{ background: GRADS[theme] }} />
      <div className="orb" style={{ left: "18%", top: "6%", width: "42vw", height: "42vw", background: `radial-gradient(circle, ${orbs[0]} 0%, transparent 70%)` }} />
      <div className="orb" style={{ left: "76%", top: "22%", width: "32vw", height: "32vw", background: `radial-gradient(circle, ${orbs[1]} 0%, transparent 70%)`, animationDelay: "4s" }} />
      {rain && drops.map((g, i) => <div key={i} className="fx-rain" style={{ left: `${g.x}%`, height: g.h, animationDuration: `${g.t}s`, animationDelay: `${g.d}s` }} />)}
      {theme === "theme-stormy" && <div className="fx-flash" />}
      {snow && flakes.map((f, i) => <div key={i} className="fx-snow" style={{ left: `${f.x}%`, width: f.s, height: f.s, opacity: 0.5, animationDuration: `${f.t}s`, animationDelay: `${f.d}s`, ["--drift" as string]: `${f.dr}px` }} />)}
      {night && stars.map((s, i) => <div key={i} className="fx-star" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDuration: `${s.t}s`, animationDelay: `${s.d}s` }} />)}
    </div>
  );
});
