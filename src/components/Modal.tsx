import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Fenêtre superposée. Elle s'ouvre depuis l'élément cliqué (layoutId partagé),
 * se ferme avec Échap, un clic sur le fond ou le bouton de fermeture.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  actions,
  size = "large",
  layoutId,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  size?: "medium" | "large" | "full";
  layoutId?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.classList.add("no-scroll");
    const t = setTimeout(() => ref.current?.focus(), 30);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("no-scroll");
      prev?.focus?.();
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            ref={ref}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            className={`modal modal-${size}`}
            layoutId={layoutId}
            initial={layoutId ? undefined : { opacity: 0, y: 40, scale: 0.95 }}
            animate={layoutId ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={layoutId ? undefined : { opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 120, damping: 22, mass: 1 }}
          >
            <header className="modal-head">
              <div>
                <h2 className="modal-title">{title}</h2>
                {subtitle && <p className="modal-sub">{subtitle}</p>}
              </div>
              <div className="modal-actions">
                {actions}
                <button className="icon-btn" onClick={onClose} aria-label="Fermer">
                  <X size={18} />
                </button>
              </div>
            </header>
            <motion.div
              className="modal-body"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
