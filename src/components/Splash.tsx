import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const KEY = "meteo_splash_v1";

/** Introduction vidéo (une fois par session), reprise de la version précédente. */
export function Splash() {
  const [show, setShow] = useState(() => {
    try {
      return !sessionStorage.getItem(KEY);
    } catch {
      return false;
    }
  });
  const [failed, setFailed] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const done = () => {
    setShow(false);
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
  };
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(done, 4500);
    const resume = () => video.current?.paused && video.current.play().catch(() => {});
    document.addEventListener("visibilitychange", resume);
    return () => {
      clearTimeout(t);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div className="splash" exit={{ opacity: 0 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}>
          {!failed && <video ref={video} src="/splash.mp4" autoPlay muted playsInline onEnded={done} onError={() => setFailed(true)} />}
          <div className="splash-shade" />
          <motion.div className="splash-title" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 1.4, ease: [0.22, 1, 0.36, 1] }}>
            <div className="splash-logo">
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            </div>
            <h1>Alphonse Buisson Météo</h1>
            <p>Premium</p>
          </motion.div>
          <button className="splash-skip" onClick={done}>
            Passer →
          </button>
          <motion.div className="splash-bar" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 4.5, ease: "linear" }} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
