import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { lazy, Suspense, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import { Shell, locateMe } from "./components/Shell";
import { Splash } from "./components/Splash";
import { getState } from "./state/store";
import "./styles/global.css";

const Home = lazy(() => import("./pages/Home"));
const Forecast = lazy(() => import("./pages/Forecast"));
const Day = lazy(() => import("./pages/Day"));
const MapPage = lazy(() => import("./pages/MapPage"));
const Explorer = lazy(() => import("./pages/Explorer"));
const Phenomena = lazy(() => import("./pages/Phenomena"));
const PhenomenonPage = lazy(() => import("./pages/PhenomenonPage"));
const Compare = lazy(() => import("./pages/Compare"));
const Models = lazy(() => import("./pages/Models"));
const Region = lazy(() => import("./pages/Region"));
const Air = lazy(() => import("./pages/Air"));
const About = lazy(() => import("./pages/About"));

const qc = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } });

export function PageLoader() {
  return (
    <div className="page">
      <div className="skeleton" style={{ height: 52, width: 280, marginBottom: 20 }} />
      <div className="skeleton" style={{ height: 320 }} />
    </div>
  );
}

function AnimatedRoutes() {
  const loc = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [loc.pathname]);
  return (
    <AnimatePresence mode="wait">
      <motion.div key={loc.pathname} initial={{ opacity: 0, y: 18, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -10, filter: "blur(3px)" }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}>
        <Suspense fallback={<PageLoader />}>
          <Routes location={loc}>
            <Route path="/" element={<Home />} />
            <Route path="/previsions" element={<Forecast />} />
            <Route path="/jour/:date" element={<Day />} />
            <Route path="/carte" element={<MapPage />} />
            <Route path="/explorer" element={<Explorer />} />
            <Route path="/phenomenes" element={<Phenomena />} />
            <Route path="/phenomenes/:slug" element={<PhenomenonPage />} />
            <Route path="/comparer" element={<Compare />} />
            <Route path="/modeles" element={<Models />} />
            <Route path="/region" element={<Region />} />
            <Route path="/air" element={<Air />} />
            <Route path="/createur" element={<About />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  useEffect(() => {
    if (!getState().place) locateMe();
  }, []);
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Shell>
          <AnimatedRoutes />
        </Shell>
        <Splash />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

// Halo lumineux qui suit le pointeur sur les cartes (effet de profondeur, très léger)
if (window.matchMedia("(hover: hover)").matches) {
  let raf = 0;
  window.addEventListener(
    "pointermove",
    (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const card = (e.target as HTMLElement | null)?.closest?.(".card, .wk, .risk, .hero") as HTMLElement | null;
        if (!card) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    },
    { passive: true },
  );
}

createRoot(document.getElementById("root")!).render(<App />);
