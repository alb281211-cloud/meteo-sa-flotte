import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  CloudLightning,
  Compass,
  Gauge,
  GitCompare,
  LayoutDashboard,
  Leaf,
  LocateFixed,
  Map,
  Moon,
  Search,
  Star,
  Sun,
  CalendarDays,
  Grid3x3,
  Menu,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { Ambient } from "./Ambient";
import { reverseGeocode, searchPlaces, type Place } from "../lib/api";
import { PHENOMENA } from "../lib/phenomena";
import { placeKey, selectPlace, setState, toggleFavorite, usePlace, useStore } from "../state/store";

const TINTS: Record<string, string> = {
  "/": "blue", "/previsions": "orange", "/carte": "green", "/explorer": "indigo", "/phenomenes": "purple",
  "/comparer": "teal", "/modeles": "pink", "/region": "cyan", "/air": "mint", "/createur": "gray",
};

export const NAV = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard, end: true },
  { to: "/previsions", label: "Prévisions", icon: CalendarDays },
  { to: "/carte", label: "Cartes", icon: Map },
  { to: "/explorer", label: "Explorateur", icon: BarChart3 },
  { to: "/phenomenes", label: "Phénomènes", icon: CloudLightning },
  { to: "/comparer", label: "Comparer", icon: GitCompare },
  { to: "/modeles", label: "Modèles", icon: Gauge },
  { to: "/region", label: "Région", icon: Grid3x3 },
  { to: "/air", label: "Air & pollens", icon: Leaf },
  { to: "/createur", label: "Le créateur", icon: UserRound },
];

const withTint = (to: string) => ({ ...NAV.find((n) => n.to === to)!, tint: TINTS[to] });
const NAV_GROUPS = [
  { title: "Météo", items: ["/", "/previsions", "/carte"].map(withTint) },
  { title: "Analyses", items: ["/explorer", "/phenomenes", "/comparer", "/modeles", "/region", "/air"].map(withTint) },
];

export function locateMe(onError?: (msg: string) => void) {
  if (!navigator.geolocation) return onError?.("Géolocalisation indisponible");
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude: lat, longitude: lon } = pos.coords;
      let name = "Ma position";
      let country = "";
      try {
        const r = await reverseGeocode(lat, lon);
        name = r.city;
        country = r.country;
      } catch {
        /* nom générique */
      }
      selectPlace({ id: `${lat.toFixed(4)},${lon.toFixed(4)}`, name, lat, lon, country });
    },
    () => onError?.("Géolocalisation refusée"),
    { timeout: 10000, maximumAge: 600000 },
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const place = usePlace();
  const theme = useStore((s) => s.theme);
  const unit = useStore((s) => s.unit);
  const favorites = useStore((s) => s.favorites);
  const [search, setSearch] = useState(false);
  const [menu, setMenu] = useState(false);
  const isFav = favorites.some((f) => placeKey(f) === placeKey(place));

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !(e.target instanceof HTMLInputElement))) {
        e.preventDefault();
        setSearch(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="shell">
      <Ambient />
      <header className="topbar">
        <NavLink to="/" className="brand" aria-label="Accueil">
          <span className="brand-mark">
            <Sun size={18} />
          </span>
          <span className="brand-text">
            Alphonse Buisson Météo
            <small>Premium</small>
          </span>
        </NavLink>

        <button className="place-btn" onClick={() => setSearch(true)} data-testid="input-city-search">
          <Search size={15} />
          <span className="place-name">{place.name}</span>
          <kbd>⌘K</kbd>
        </button>

        <div className="top-actions">
          <NavLink to="/createur" className="creator-btn" title="Qui a créé ce site ?">
            <UserRound size={15} /> <span>Le créateur</span>
          </NavLink>
          <button className={`icon-btn ${isFav ? "on" : ""}`} onClick={() => toggleFavorite(place)} title={isFav ? "Retirer des favoris" : "Ajouter aux favoris"} data-testid="button-favorite">
            <Star size={17} fill={isFav ? "currentColor" : "none"} />
          </button>
          <button className="icon-btn" onClick={() => locateMe()} title="Ma position" data-testid="button-current-location">
            <LocateFixed size={17} />
          </button>
          <button className="icon-btn unit" onClick={() => setState({ unit: unit === "C" ? "F" : "C" })} title="Changer d'unité" data-testid="button-unit-toggle">
            °{unit}
          </button>
          <button className="icon-btn" onClick={() => setState({ theme: theme === "dark" ? "light" : "dark" })} title="Thème clair / sombre" data-testid="button-theme-toggle">
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button className="icon-btn menu-btn" onClick={() => setMenu(true)} aria-label="Menu">
            <Menu size={18} />
          </button>
        </div>
      </header>

      <aside className="sidebar" aria-label="Navigation principale">
        {NAV_GROUPS.map((g) => (
          <div key={g.title} className="sb-group">
            <div className="sb-title">{g.title}</div>
            {g.items.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `sb-item ${isActive ? "active" : ""}`}>
                <span className={`sb-icon c-${n.tint}`}>
                  <n.icon size={15} strokeWidth={2.2} />
                </span>
                <span>{n.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
        {favorites.length > 0 && (
          <div className="sb-group">
            <div className="sb-title">Lieux</div>
            {favorites.slice(0, 6).map((f) => (
              <button key={f.id} className={`sb-item ${placeKey(f) === placeKey(place) ? "current" : ""}`} onClick={() => selectPlace(f)}>
                <span className="sb-icon c-gray">
                  <Star size={13} strokeWidth={2.4} />
                </span>
                <span>{f.name}</span>
              </button>
            ))}
          </div>
        )}
        <NavLink to="/createur" className={({ isActive }) => `sb-creator ${isActive ? "active" : ""}`}>
          <span className="sb-avatar">AB</span>
          <span>
            <b>Alphonse Buisson</b>
            <small>Le créateur</small>
          </span>
        </NavLink>
      </aside>

      <nav className="bottomnav" aria-label="Navigation mobile">
        {NAV.slice(0, 5).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `bn-item ${isActive ? "active" : ""}`}>
            <n.icon size={19} />
            <span>{n.label.split(" ")[0]}</span>
          </NavLink>
        ))}
      </nav>

      <AnimatePresence>
        {menu && (
          <motion.div className="drawer-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenu(false)}>
            <motion.nav className="drawer" initial={{ x: 300 }} animate={{ x: 0 }} exit={{ x: 300 }} transition={{ type: "spring", damping: 26, stiffness: 140 }} onClick={(e) => e.stopPropagation()}>
              <button className="icon-btn" onClick={() => setMenu(false)} aria-label="Fermer">
                <X size={18} />
              </button>
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setMenu(false)} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                  <n.icon size={18} />
                  <span>{n.label}</span>
                </NavLink>
              ))}
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="main">{children}</main>

      <AnimatePresence>{search && <SearchPalette onClose={() => setSearch(false)} />}</AnimatePresence>
    </div>
  );
}

function useDebounced<T>(v: T, ms: number) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

/** Palette de recherche : villes, favoris, pages et phénomènes. */
function SearchPalette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const dq = useDebounced(q.trim(), 250);
  const nav = useNavigate();
  const favorites = useStore((s) => s.favorites);
  const input = useRef<HTMLInputElement>(null);
  const res = useQuery({ queryKey: ["search", dq], queryFn: () => searchPlaces(dq), enabled: dq.length >= 2, staleTime: 3600000 });

  useEffect(() => {
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const ql = q.toLowerCase();
  const pages = [
    ...NAV.map((n) => ({ label: n.label, to: n.to, kind: "Page" })),
    ...PHENOMENA.map((p) => ({ label: p.title, to: `/phenomenes/${p.slug}`, kind: "Phénomène" })),
  ].filter((p) => (ql ? p.label.toLowerCase().includes(ql) : false));

  type Item = { key: string; label: string; sub?: string; kind: string; run: () => void };
  const pick = (p: Place) => {
    selectPlace(p);
    onClose();
  };
  const items: Item[] = [
    ...(res.data ?? []).map((p) => ({ key: p.id, label: p.name, sub: [p.admin, p.country].filter(Boolean).join(", "), kind: "Ville", run: () => pick(p) })),
    ...(q ? [] : favorites.map((p) => ({ key: `f${p.id}`, label: p.name, sub: p.country, kind: "Favori", run: () => pick(p) }))),
    ...(q ? [] : [{ key: "geo", label: "Ma position", sub: "Utiliser la géolocalisation", kind: "Lieu", run: () => (locateMe(), onClose()) }]),
    ...pages.map((p) => ({ key: p.to, label: p.label, kind: p.kind, run: () => (nav(p.to), onClose()) })),
  ];

  return (
    <motion.div className="modal-backdrop top" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div className="palette" initial={{ y: -24, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
        <div className="palette-input">
          <Search size={18} />
          <input
            ref={input}
            value={q}
            placeholder="Rechercher une ville, une page, un phénomène…"
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") setSel((s) => Math.min(items.length - 1, s + 1));
              if (e.key === "ArrowUp") setSel((s) => Math.max(0, s - 1));
              if (e.key === "Enter") items[sel]?.run();
            }}
          />
          <kbd>Échap</kbd>
        </div>
        <ul className="palette-list">
          {res.isFetching && <li className="muted small pad">Recherche…</li>}
          {dq.length >= 2 && !res.isFetching && !items.length && <li className="muted small pad">Aucun résultat pour « {dq} »</li>}
          {items.map((it, i) => (
            <li key={it.key}>
              <button className={i === sel ? "sel" : ""} onMouseEnter={() => setSel(i)} onClick={it.run}>
                {it.kind === "Page" || it.kind === "Phénomène" ? <Compass size={15} /> : it.kind === "Favori" ? <Star size={15} /> : <Map size={15} />}
                <span className="pl-label">
                  {it.label}
                  {it.sub && <small>{it.sub}</small>}
                </span>
                <span className="pl-kind">{it.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      </motion.div>
    </motion.div>
  );
}
